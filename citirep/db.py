import hashlib
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


def data_dir():
    path = Path(os.environ.get("CITIREP_DATA", "data"))
    path.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def connect():
    connection = sqlite3.connect(data_dir() / "citirep.sqlite", timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys=ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize():
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY, identity TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL, kind TEXT NOT NULL, provenance TEXT NOT NULL,
            source_url TEXT, description TEXT NOT NULL, tags TEXT NOT NULL,
            locations TEXT NOT NULL, published_at TEXT, source_modified TEXT,
            status TEXT NOT NULL DEFAULT 'unknown', first_seen TEXT NOT NULL,
            checked_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            current_hash TEXT NOT NULL, body TEXT NOT NULL, links TEXT NOT NULL,
            availability TEXT NOT NULL DEFAULT 'available', last_error TEXT
        );
        CREATE TABLE IF NOT EXISTS revisions (
            id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL REFERENCES documents(id),
            hash TEXT NOT NULL, captured_at TEXT NOT NULL, title TEXT NOT NULL,
            body TEXT NOT NULL, metadata TEXT NOT NULL,
            UNIQUE(document_id, hash, captured_at)
        );
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL REFERENCES documents(id),
            ordinal INTEGER NOT NULL, page INTEGER, text TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS chunks_document ON chunks(document_id);
        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
            title, tags, locations, text, document_id UNINDEXED, chunk_id UNINDEXED,
            tokenize='porter unicode61'
        );
        CREATE TABLE IF NOT EXISTS sync_runs (
            id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
            report TEXT
        );
        """)


def save(record, chunks):
    timestamp = now()
    payload = json.dumps(record, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode()).hexdigest()
    with connect() as db:
        # Serialize the identity check with the write so concurrent identical
        # uploads cannot both attempt to create the same record.
        db.execute('BEGIN IMMEDIATE')
        existing = db.execute("SELECT id,current_hash FROM documents WHERE identity=?",
                              (record["identity"],)).fetchone()
        if existing and existing["current_hash"] == digest:
            db.execute("UPDATE documents SET checked_at=?,availability='available',last_error=NULL WHERE id=?",
                       (timestamp, existing["id"]))
            return existing["id"], False
        fields = dict(record)
        for key in ("tags", "locations", "links"):
            fields[key] = json.dumps(fields[key], ensure_ascii=False)
        fields.update(checked_at=timestamp, updated_at=timestamp, current_hash=digest)
        if existing:
            document_id = existing["id"]
            assignments = ",".join(f"{key}=?" for key in fields)
            db.execute(f"UPDATE documents SET {assignments},availability='available',last_error=NULL WHERE id=?",
                       (*fields.values(), document_id))
            db.execute("DELETE FROM search_index WHERE document_id=?", (document_id,))
            db.execute("DELETE FROM chunks WHERE document_id=?", (document_id,))
        else:
            fields["first_seen"] = timestamp
            columns = ",".join(fields)
            placeholders = ",".join("?" for _ in fields)
            document_id = db.execute(f"INSERT INTO documents ({columns}) VALUES ({placeholders})",
                                     tuple(fields.values())).lastrowid
        db.execute("INSERT INTO revisions(document_id,hash,captured_at,title,body,metadata) VALUES(?,?,?,?,?,?)",
                   (document_id, digest, timestamp, record["title"], record["body"], payload))
        for ordinal, chunk in enumerate(chunks):
            chunk_id = db.execute("INSERT INTO chunks(document_id,ordinal,page,text) VALUES(?,?,?,?)",
                                 (document_id, ordinal, chunk.get("page"), chunk["text"])).lastrowid
            db.execute("INSERT INTO search_index VALUES(?,?,?,?,?,?)",
                       (record["title"], " ".join(record["tags"]), " ".join(record["locations"]),
                        chunk["text"], document_id, chunk_id))
        return document_id, True


def decode(row):
    result = dict(row)
    for key in ("tags", "locations", "links"):
        if key in result:
            result[key] = json.loads(result[key])
    result.pop("identity", None)
    result.pop("current_hash", None)
    return result
