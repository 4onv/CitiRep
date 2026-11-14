"""Export the official-only seed for the GitHub Pages browsing demo."""
import gzip
import json
import sqlite3
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend/public/demo-data"


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


with tempfile.TemporaryDirectory() as temp:
    database = Path(temp) / "seed.sqlite"
    with gzip.open(ROOT / "seeds/waterloo.sqlite.gz", "rb") as source:
        database.write_bytes(source.read())
    db = sqlite3.connect(database)
    db.row_factory = sqlite3.Row
    records = []
    for row in db.execute("SELECT * FROM documents ORDER BY id"):
        record = dict(row)
        if record["provenance"] != "official":
            raise ValueError("Public demo export must contain official records only")
        for field in ("tags", "locations", "links"):
            record[field] = json.loads(record[field])
        for field in ("identity", "current_hash"):
            record.pop(field, None)
        records.append(record)
    bylaws = [r for r in records if r["kind"] == "bylaw"]
    index = []
    for record in records:
        related = []
        for candidate in bylaws:
            if candidate["id"] == record["id"]:
                continue
            explicit = candidate["source_url"] in record["links"]
            overlap = sorted(set(candidate["tags"]) & set(record["tags"]))
            if explicit or overlap:
                related.append(dict(id=candidate["id"], title=candidate["title"],
                    source_url=candidate["source_url"], shared_topics=overlap,
                    relationship="linked_by_source" if explicit else "topic_match",
                    score=100 if explicit else len(overlap)))
        record["related_bylaws"] = sorted(related, key=lambda r: (-r["score"], r["title"]))[:5]
        record["description_type"] = "source_excerpt"
        compact = {k: v for k, v in record.items() if k not in ("body", "links")}
        compact["search_text"] = " ".join(record["body"].split())
        index.append(compact)
        record["chunks"] = [dict(r) for r in db.execute(
            "SELECT id,ordinal,page,text FROM chunks WHERE document_id=? ORDER BY ordinal", (record["id"],))]
        write(OUTPUT / "documents" / f'{record["id"]}.json', record)
        revisions = [dict(r) for r in db.execute(
            "SELECT id,title,captured_at,body FROM revisions WHERE document_id=? ORDER BY id DESC", (record["id"],))]
        write(OUTPUT / "documents" / str(record["id"]) / "revisions.json",
              [{k: v for k, v in r.items() if k != "body"} for r in revisions])
        for revision in revisions:
            write(OUTPUT / "documents" / str(record["id"]) / "revisions" / f'{revision["id"]}.json', revision)
    write(OUTPUT / "index.json", index)
    write(OUTPUT / "facets.json", {
        "tags": [{"tag": tag, "count": count} for tag, count in sorted(Counter(t for r in records for t in r["tags"]).items())],
        "kinds": [{"kind": kind, "count": count} for kind, count in sorted(Counter(r["kind"] for r in records).items())],
    })
    write(OUTPUT / "manifest.json", {"documents": len(records), "mode": "read-only snapshot", "source_checked": max(r["checked_at"] for r in records)})
    db.close()
    print(f"Exported {len(records)} official documents and their captured revisions to {OUTPUT}")
