import re

from .db import connect, decode

SYNONYMS = {
    "bike": ["bike", "bicycle", "cycling"], "bikes": ["bike", "bicycle", "cycling"],
    "rent": ["rent", "rental", "tenant"], "apartment": ["apartment", "residential"],
    "construction": ["construction", "development"], "trees": ["tree", "forest"],
    "garbage": ["garbage", "waste"], "loud": ["loud", "noise"],
}
STOP_WORDS = set("a an the is are of in on at to for and or what where how can i my near about with me".split())


def expression(query):
    terms = [t.lower() for t in re.findall(r"[\w]+", query) if t.lower() not in STOP_WORDS][:15]
    return " AND ".join("(" + " OR ".join('"' + word + '"' for word in SYNONYMS.get(term, [term])) + ")" for term in terms)


def search(query="", kind=None, tag=None, location=None, provenance=None, limit=20, offset=0):
    conditions, params = [], []
    for column, value in (("kind", kind), ("provenance", provenance)):
        if value:
            conditions.append(f"d.{column}=?")
            params.append(value)
    if tag:
        conditions.append("EXISTS(SELECT 1 FROM json_each(d.tags) WHERE value=?)")
        params.append(tag)
    if location:
        conditions.append("(instr(lower(d.body),lower(?))>0 OR instr(lower(d.locations),lower(?))>0)")
        params.extend([location, location])
    match = expression(query)
    if query.strip() and not match:
        return {"items": [], "total": 0, "limit": limit, "offset": offset}
    where = " AND ".join(conditions) or "1=1"
    with connect() as db:
        if match:
            # Rank passages, then keep one best passage per document before pagination.
            rows = db.execute(f"""
                SELECT d.*,c.page,c.id AS chunk_id,
                       snippet(search_index,3,'','', ' … ',45) AS excerpt,
                       bm25(search_index,8,3,4,1) AS score
                FROM search_index JOIN documents d ON d.id=search_index.document_id
                JOIN chunks c ON c.id=search_index.chunk_id
                WHERE search_index MATCH ? AND {where}
                ORDER BY score,d.published_at DESC,d.id
            """, (match, *params)).fetchall()
            # Porter conflates 'park' and 'parking'. Prefer literal query words in
            # titles before falling back to stemmed passage relevance.
            literal_terms = [term.lower() for term in re.findall(r'\w+', query) if term.lower() not in STOP_WORDS]
            rows = sorted(rows, key=lambda row: (
                -sum(bool(re.search(r'\b' + re.escape(term) + r'\b', row['title'].lower())) for term in literal_terms),
                row['score']))
            seen, results = set(), []
            for row in rows:
                if row["id"] not in seen:
                    seen.add(row["id"])
                    results.append(row)
            total = len(results)
            results = results[offset:offset + limit]
        else:
            total = db.execute(f"SELECT count(*) FROM documents d WHERE {where}", params).fetchone()[0]
            results = db.execute(f"SELECT d.* FROM documents d WHERE {where} ORDER BY COALESCE(published_at,updated_at) DESC,id LIMIT ? OFFSET ?",
                                 (*params, limit, offset)).fetchall()
    items = []
    for row in results:
        item = decode(row)
        item.pop("body", None)
        item.pop("links", None)
        item["description_type"] = "source_excerpt"
        item["related_bylaws"] = related_bylaws(item["id"], limit=3)
        items.append(item)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def related_bylaws(document_id, limit=5):
    with connect() as db:
        source = db.execute("SELECT * FROM documents WHERE id=?", (document_id,)).fetchone()
        if not source:
            return []
        source = decode(source)
        candidates = db.execute("SELECT * FROM documents WHERE kind='bylaw' AND provenance='official' AND id!=?", (document_id,)).fetchall()
    related = []
    for row in candidates:
        candidate = decode(row)
        explicit = candidate["source_url"] in source["links"]
        overlap = sorted(set(candidate["tags"]) & set(source["tags"]))
        if explicit or overlap:
            related.append({"id": candidate["id"], "title": candidate["title"], "source_url": candidate["source_url"],
                            "relationship": "linked_by_source" if explicit else "topic_match",
                            "shared_topics": overlap, "score": 100 if explicit else len(overlap)})
    return sorted(related, key=lambda item: (-item["score"], item["title"]))[:limit]
