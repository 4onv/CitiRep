import re
import json
import subprocess
import sys
import os
from datetime import datetime
from io import BytesIO
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
from zipfile import ZipFile

from bs4 import BeautifulSoup
from docx import Document
from pypdf import PdfReader

TOPICS = {
    "housing": ["housing", "rental", "apartment", "residential", "tenant"],
    "planning": ["zoning", "development", "official plan", "planning", "subdivision"],
    "parking": ["parking", "parkade", "overnight"],
    "transportation": ["traffic", "cycling", "bike", "road", "sidewalk", "transit"],
    "parks": ["park", "playground", "trail", "recreation"],
    "environment": ["tree", "stormwater", "climate", "flood", "forest"],
    "water": ["watermain", "water supply", "sewer", "drinking water"],
    "heritage": ["heritage", "historic", "designation"],
    "budget": ["budget", "tax", "fees", "charges", "funding"],
    "accessibility": ["accessible", "accessibility", "disability", "barrier"],
    "noise": ["noise", "sound", "loud", "vibration"],
}


def canonical_url(url):
    parts = urlsplit(url)
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path or "/", parts.query, ""))


def clean(text):
    return "\n".join(line for line in (re.sub(r"\s+", " ", line).strip() for line in text.splitlines()) if line)


def parse(data, filename, url=""):
    if filename.lower().split('?')[0].endswith('.pdf') or data.startswith(b'%PDF'):
        try:
            # Use the interpreter directly on Windows, avoiding a venv launcher
            # whose child could survive termination. Retain this environment's libraries.
            environment = {**os.environ, 'PYTHONPATH': os.pathsep.join(sys.path)}
            executable = getattr(sys, '_base_executable', sys.executable)
            result = subprocess.run([executable, '-m', 'citirep.pdf_worker', filename, url],
                                    input=data, capture_output=True, timeout=60, check=True, env=environment)
        except subprocess.TimeoutExpired as error:
            raise ValueError('PDF parsing exceeded 60 seconds. Split the document into smaller files.') from error
        payload = json.loads(result.stdout)
        if 'error' in payload:
            raise ValueError(payload['error'])
        return payload['parsed'], payload['chunks']
    return parse_direct(data, filename, url)


def parse_direct(data, filename, url=""):
    suffix = filename.lower().split("?")[0]
    links = []
    published = None
    title = unquote(filename.rsplit("/", 1)[-1].split('?')[0])
    title = re.sub(r'[-_]+', ' ', re.sub(r'\.(pdf|docx|txt|md)$', '', title, flags=re.I)).strip()
    if suffix.endswith(".pdf") or data.startswith(b"%PDF"):
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted and not reader.decrypt(''):
            raise ValueError("Encrypted PDFs are unsupported. Upload an unlocked copy.")
        if len(reader.pages) > 400:
            raise ValueError("PDF exceeds 400 pages.")
        pages = [(index + 1, clean(page.extract_text() or "")) for index, page in enumerate(reader.pages)]
        if reader.metadata and reader.metadata.title:
            candidate = clean(reader.metadata.title)
            if candidate and not re.search(r'template|untitled|microsoft|\.docx?$', candidate, re.I):
                title = candidate
    elif suffix.endswith(".docx"):
        with ZipFile(BytesIO(data)) as archive:
            if sum(item.file_size for item in archive.infolist()) > 40_000_000:
                raise ValueError("Expanded document exceeds 40 MB.")
        doc = Document(BytesIO(data))
        text = [paragraph.text for paragraph in doc.paragraphs]
        text.extend(" | ".join(cell.text for cell in row.cells) for table in doc.tables for row in table.rows)
        pages = [(None, clean("\n".join(text)))]
    elif suffix.endswith((".txt", ".md")):
        pages = [(None, clean(data.decode("utf-8-sig")))]
    else:
        soup = BeautifulSoup(data, "html.parser")
        heading = next((node for node in soup.find_all("h1") if node.get_text(strip=True)), soup.title)
        title = clean(heading.get_text(" ")) if heading else title
        date = soup.select_one('meta[property="article:published_time"], meta[name="date"], time[datetime]')
        if date:
            published = date.get("content") or date.get("datetime")
        elif date := soup.select_one('.gs-news-details-date'):
            try:
                published = datetime.strptime(date.get_text(strip=True), "%b %d, %Y").date().isoformat()
            except ValueError:
                published = None
        root = soup.find("main") or soup.find("article") or soup.body or soup
        if '/news/posts/' in url:
            sections = root.select('.usn_cmp_text')
            if sections:
                root = BeautifulSoup(''.join(str(section) for section in sections), 'html.parser')
        for element in root.select("script,style,nav,header,footer,form,noscript,button,.breadcrumb,.breadcrumbs"):
            element.decompose()
        links = sorted({canonical_url(urljoin(url, a["href"])) for a in root.select("a[href]")
                        if urljoin(url, a["href"]).startswith("https://")})
        for image in root.select('img[alt]'):
            image.replace_with(image.get('alt', ''))
        # Image-led notices can still be discovered by their source heading/alt text.
        pages = [(None, clean(root.get_text("\n", strip=True)) or title)]
    body = "\n\n".join(text for _, text in pages)
    if not body.strip():
        raise ValueError("No usable text found. Scanned PDFs need OCR before upload.")
    if len(body) > 2_000_000:
        raise ValueError("Extracted text exceeds 2 million characters.")
    chunks = []
    for page, text in pages:
        # Overlap retains matches spanning a passage boundary.
        for start in range(0, len(text), 1400):
            chunks.append({"page": page, "text": text[start:start + 1600]})
    return dict(title=title, body=body, links=links, published_at=published), chunks


def enrich(parsed, identity, provenance, kind, source_url=None, title=None, location=None, source_modified=None):
    body = parsed["body"]
    title = title or parsed["title"]
    labels = [tag for tag, words in TOPICS.items()
              if any(re.search(r"\b" + re.escape(word) + r"\w*", (title + " " + body).lower()) for word in words)]
    locations = sorted(set(re.findall(r"\b\d{1,5}\s+(?:[A-Z][\w'-]*\s+){1,4}(?:Street|Road|Avenue|Drive|Boulevard|Lane|Way|Court)(?:\s+(?:North|South|East|West))?\b", body)))
    locations += sorted(set(re.findall(r"\b[Ww]ard\s+[1-7]\b", body)))
    if location:
        locations.append(location.strip())
    return dict(identity=identity, title=title, kind=kind, provenance=provenance,
                source_url=source_url, description=body[:450], tags=labels,
                locations=sorted(set(locations)), published_at=parsed["published_at"],
                source_modified=source_modified, status="unknown", body=body, links=parsed["links"])
