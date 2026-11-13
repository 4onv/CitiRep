"""Refresh official Waterloo collections. Run once or as a persistent worker."""
import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlsplit
from xml.etree import ElementTree

import httpx
from bs4 import BeautifulSoup

from .db import connect, initialize, now, save
from .parse import canonical_url, enrich, parse

CITY = "https://www.waterloo.ca"
ENGAGE = "https://www.engagewr.ca/waterloo"
HOSTS = {"www.waterloo.ca", "waterloo.ca", "www.engagewr.ca", "engagewr.ca", "media-002-ca.cdn.govstack.com"}
MAX_BYTES = 15 * 1024 * 1024


def fetch(client, url):
    # Only discovered official hosts are fetched; validate each redirect too.
    for _ in range(6):
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in HOSTS or parts.port not in (None, 443):
            raise ValueError("Source redirects outside configured official hosts")
        with client.stream("GET", url) as response:
            if response.is_redirect:
                url = urljoin(url, response.headers["location"])
                continue
            response.raise_for_status()
            data = bytearray()
            for chunk in response.iter_bytes():
                data.extend(chunk)
                if len(data) > MAX_BYTES:
                    raise ValueError("Source exceeds 15 MB download limit")
            return bytes(data), dict(response.headers), str(response.url)
    raise ValueError("Too many redirects")


def discover(client, news_limit):
    targets = {}
    errors = []
    def add(url, kind, modified=None):
        targets[canonical_url(url)] = (kind, modified)
    # Latest feed first. Sitemap also supplies older news, planning and policy pages.
    for feed, kind in [(CITY + "/news/city-news/", "notice"), (CITY + "/news/service-alerts/", "notice"),
                       (CITY + "/news/road-closures/", "notice"),
                       (CITY + "/bylaws-and-enforcement/bylaw-directory/", "bylaw")]:
        try:
            data, _, _ = fetch(client, feed)
            soup = BeautifulSoup(data, "html.parser")
            for anchor in soup.select("main a[href]"):
                url = canonical_url(urljoin(feed, anchor["href"]))
                if "/news/posts/" in url or (kind == "bylaw" and ("/bylaw-directory/" in url or url.endswith(".pdf"))):
                    if url != feed:
                        add(url, kind)
        except Exception as error:
            errors.append({"url": feed, "error": str(error)})
    try:
        data, _, _ = fetch(client, CITY + "/sitemap.xml")
        root = ElementTree.fromstring(data)
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        news = []
        for node in root.findall("s:url", ns):
            url = node.findtext("s:loc", namespaces=ns)
            modified = node.findtext("s:lastmod", namespaces=ns)
            if not url:
                continue
            if "/news/posts/" in url:
                news.append((url, modified))
            elif "/bylaw-directory/" in url and not url.endswith("/bylaw-directory/"):
                add(url, "bylaw", modified)
            elif "/plans-projects-studies-and-strategies/" in url:
                add(url, "plan", modified)
        for url, modified in sorted(news, key=lambda item: item[1] or "", reverse=True)[:news_limit]:
            add(url, "notice", modified)
    except Exception as error:
        errors.append({"url": CITY + "/sitemap.xml", "error": str(error)})
    try:
        data, _, _ = fetch(client, ENGAGE)
        soup = BeautifulSoup(data, "html.parser")
        for anchor in soup.select("article.project a[href]"):
            url = urljoin(ENGAGE, anchor["href"])
            if urlsplit(url).hostname in {"www.engagewr.ca", "engagewr.ca"}:
                add(url, "project")
    except Exception as error:
        errors.append({"url": ENGAGE, "error": str(error)})
    # City-specific application directories include active applications and decided cases.
    application_feeds = ["https://www.engagewr.ca/development-planning-projects",
                         "https://www.engagewr.ca/waterloo/development-planning-projects/apps-with-decisions"]
    for feed in application_feeds:
        try:
            data, _, _ = fetch(client, feed)
            soup = BeautifulSoup(data, "html.parser")
            for anchor in soup.select('main a[href]'):
                if 'learn more' in anchor.get_text(' ', strip=True).lower():
                    url = urljoin(feed, anchor['href'])
                    if urlsplit(url).hostname in {'www.engagewr.ca', 'engagewr.ca'}:
                        add(url, 'project')
        except Exception as error:
            errors.append({'url': feed, 'error': str(error)})
    # Preserve public plan PDFs, including older plans still linked by the city.
    for url, (kind, _) in list(targets.items()):
        if kind != 'plan':
            continue
        try:
            data, _, _ = fetch(client, url)
            soup = BeautifulSoup(data, 'html.parser')
            for anchor in soup.select('main a[href]'):
                link = urljoin(url, anchor['href'])
                if urlsplit(link).path.lower().endswith('.pdf') and urlsplit(link).hostname in HOSTS:
                    add(link, 'plan')
        except Exception as error:
            errors.append({'url': url, 'error': str(error)})
    return targets, errors


def run(news_limit=80, resume=False):
    initialize()
    with connect() as db:
        previous = db.execute('SELECT started_at FROM sync_runs WHERE finished_at IS NULL ORDER BY id DESC LIMIT 1').fetchone() if resume else None
        completed = set()
        if previous:
            completed = {row[0] for row in db.execute("SELECT identity FROM documents WHERE checked_at>=? AND availability='available'", (previous['started_at'],))}
            db.execute("UPDATE sync_runs SET finished_at=?,report=? WHERE finished_at IS NULL", (now(), json.dumps({'interrupted': True, 'resumed_records': len(completed)})))
        run_id = db.execute("INSERT INTO sync_runs(started_at) VALUES(?)", (now(),)).lastrowid
    report = {"discovered": 0, "checked": 0, "changed": 0, "errors": []}
    with httpx.Client(timeout=30, headers={"User-Agent": "CitiRep/0.1 (Waterloo civic search prototype)"}) as client:
        targets, discovery_errors = discover(client, news_limit)
        report["discovered"] = len(targets)
        report['already_checked'] = sum(url in completed for url in targets)
        targets = {url: value for url, value in targets.items() if url not in completed}
        report["errors"].extend(discovery_errors)
        print(f"Discovered {len(targets)} official records", flush=True)

        def ingest(item):
            url, (kind, modified) = item
            try:
                data, headers, resolved = fetch(client, url)
                parsed, chunks = parse(data, resolved, resolved)
                record = enrich(parsed, url, "official", kind, url, source_modified=modified or headers.get("last-modified"))
                _, changed = save(record, chunks)
                return {"changed": changed}
            except Exception as error:
                with connect() as db:
                    db.execute("UPDATE documents SET availability='fetch_failed',last_error=? WHERE identity=?",
                               (str(error), url))
                return {"url": url, "error": str(error)}

        # Bounded concurrency; PDF extraction runs in separate time-limited processes.
        with ThreadPoolExecutor(max_workers=4) as pool:
            for result in pool.map(ingest, targets.items()):
                if "error" in result:
                    report["errors"].append(result)
                else:
                    report["checked"] += 1
                    report["changed"] += int(result["changed"])
                if (report["checked"] + len(report["errors"])) % 25 == 0:
                    print(f"Checked {report['checked']}, changed {report['changed']}", flush=True)
    with connect() as db:
        db.execute("UPDATE sync_runs SET finished_at=?,report=? WHERE id=?", (now(), json.dumps(report), run_id))
    print(json.dumps(report, indent=2), flush=True)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--news-limit", type=int, default=80, help="Historical news sitemap entries in addition to current feeds")
    parser.add_argument("--interval", type=int, default=0, help="Seconds between refreshes; zero runs once")
    parser.add_argument("--wait-first", action="store_true", help="Wait one interval before the first refresh")
    parser.add_argument('--resume', action='store_true', help='Resume an interrupted import after its old process has stopped')
    args = parser.parse_args()
    if args.news_limit < 0 or (args.interval and args.interval < 300):
        parser.error("news-limit must be nonnegative; recurring interval must be at least 300 seconds")
    if args.wait_first:
        if not args.interval:
            parser.error('--wait-first requires --interval')
        time.sleep(args.interval)
    while True:
        try:
            run(args.news_limit, args.resume)
            args.resume = False
        except Exception:
            import logging
            logging.exception("Refresh failed")
            if not args.interval:
                raise
        if not args.interval:
            return
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
