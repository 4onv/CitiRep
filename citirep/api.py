import hashlib
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from starlette.concurrency import run_in_threadpool

from .db import connect, decode, initialize, save
from .parse import enrich, parse
from .search import related_bylaws, search


@asynccontextmanager
async def lifespan(app):
    initialize()
    yield


app = FastAPI(title="CitiRep API", version="0.1.0", lifespan=lifespan, docs_url=None,
              description="Waterloo documents, public uploads, passage search and source history.")


@app.get("/docs", include_in_schema=False)
def api_docs(request: Request):
    root_path = request.scope.get("root_path", "").rstrip("/")
    page = get_swagger_ui_html(
        openapi_url=root_path + app.openapi_url,
        title=app.title + " - Swagger UI",
    )
    # Hide the schema download label while keeping interactive API checks working.
    html = page.body.decode().replace(
        "</head>", "<style>.swagger-ui .info .url { display: none; }</style></head>"
    )
    return HTMLResponse(html)


@app.get("/health")
def health():
    with connect() as db:
        count = db.execute("SELECT count(*) FROM documents").fetchone()[0]
    return {"status": "ok", "documents": count}


@app.get("/api/search")
def search_documents(q: str = Query("", max_length=300), kind: str | None = None,
                     tag: str | None = None, location: str | None = Query(None, max_length=200),
                     provenance: str | None = None, limit: int = Query(20, ge=1, le=100),
                     offset: int = Query(0, ge=0)):
    return search(q, kind, tag, location, provenance, limit, offset)


@app.get("/api/documents/{document_id}")
def document(document_id: int):
    with connect() as db:
        row = db.execute("SELECT * FROM documents WHERE id=?", (document_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Document not found")
        result = decode(row)
        result["chunks"] = [dict(chunk) for chunk in db.execute(
            "SELECT id,ordinal,page,text FROM chunks WHERE document_id=? ORDER BY ordinal", (document_id,))]
    result["related_bylaws"] = related_bylaws(document_id)
    return result


@app.get("/api/documents/{document_id}/revisions")
def revisions(document_id: int):
    with connect() as db:
        if not db.execute("SELECT 1 FROM documents WHERE id=?", (document_id,)).fetchone():
            raise HTTPException(404, "Document not found")
        return [dict(row) for row in db.execute(
            "SELECT id,hash,captured_at,title FROM revisions WHERE document_id=? ORDER BY id DESC", (document_id,))]


@app.get("/api/documents/{document_id}/revisions/{revision_id}")
def revision(document_id: int, revision_id: int):
    with connect() as db:
        row = db.execute("SELECT id,document_id,captured_at,title,body FROM revisions WHERE id=? AND document_id=?",
                         (revision_id, document_id)).fetchone()
    if not row:
        raise HTTPException(404, "Revision not found")
    return dict(row)


@app.get("/api/facets")
def facets():
    with connect() as db:
        return {"kinds": [dict(r) for r in db.execute("SELECT kind,count(*) AS count FROM documents GROUP BY kind")],
                "tags": [dict(r) for r in db.execute("SELECT value AS tag,count(*) AS count FROM documents,json_each(tags) GROUP BY value")],
                "location_filter": "Case-insensitive street, place or ward text match; no radius/geocoding."}


@app.get("/api/sources")
def sources():
    with connect() as db:
        runs = [dict(r) for r in db.execute("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 10")]
        counts = [dict(r) for r in db.execute("SELECT provenance,kind,count(*) AS count,max(checked_at) AS last_checked FROM documents GROUP BY provenance,kind")]
    return {"collections": counts, "sync_runs": runs}


def process_upload(data, filename, title, location):
    try:
        parsed, chunks = parse(data, filename)
    except ValueError:
        raise
    except Exception as error:
        raise ValueError('Unable to parse document. Check that its contents match its file extension.') from error
    # Hash bytes and descriptive inputs. User metadata cannot overwrite official records.
    digest = hashlib.sha256(data + (title or "").encode() + (location or "").encode()).hexdigest()
    record = enrich(parsed, "upload:" + digest, "user_upload", "document", title=title, location=location)
    document_id, changed = save(record, chunks)
    return {"id": document_id, "created": changed, "provenance": "user_upload", "searchable": True}


@app.post("/api/documents/upload")
async def upload(file: UploadFile = File(...), title: str | None = Form(None, max_length=300),
                 location: str | None = Form(None, max_length=200)):
    filename = Path(file.filename or "").name
    try:
        if Path(filename).suffix.lower() not in {".pdf", ".docx", ".txt", ".md"}:
            raise HTTPException(415, "Supported formats: PDF, DOCX, UTF-8 TXT and Markdown")
        data = await file.read(10 * 1024 * 1024 + 1)
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(413, "Upload exceeds 10 MB")
        try:
            return await run_in_threadpool(process_upload, data, filename, title, location)
        except (ValueError, UnicodeError) as error:
            raise HTTPException(422, str(error)) from error
    finally:
        await file.close()
