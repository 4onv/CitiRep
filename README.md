# CitiRep backend

Python 3.12+, FastAPI and SQLite FTS5. Stores Waterloo civic records and uploaded documents, extracts searchable passages, labels topics, finds related bylaws, and preserves earlier versions. Parsing and search use zero LLM tokens and require no paid services.

## Run

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run from this repository.

```sh
uv sync --frozen
uv run python -m citirep.snapshot import seeds/waterloo.sqlite.gz
uv run uvicorn citirep.api:app --host 127.0.0.1 --port 8000
```

Import the bundled seed once into a fresh data directory. If a database already exists, keep it and run the refresh command instead. The seed retains its original check timestamps. API reference is at http://127.0.0.1:8000/docs. There is no product frontend. `/` returns 404.

Keep a separate refresh process running to update the database every six hours while the API serves requests.

```sh
uv run python -m citirep.sync --interval 21600
```

For a single refresh, use `uv run python -m citirep.sync`. Increase historical news coverage with `--news-limit 500`. The worker rediscovers sources each run, uses four download workers, logs each failed URL, and continues with other records. Run one refresh process per database. After stopping an interrupted importer, use `--resume` to skip successfully checked records from that run. A persistent host must keep the API and refresh processes running for public deployment. This repository does not provision hosting.

## API contract

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health and indexed document count |
| GET | `/api/search?q=cycling&location=King&tag=transportation` | Ranked passages with related bylaws |
| GET | `/api/search?kind=project` | Browse projects, including earlier records |
| GET | `/api/documents/{id}` | Full extracted text, source URL, metadata and passages |
| GET | `/api/documents/{id}/revisions` | Available versions |
| GET | `/api/documents/{id}/revisions/{revision_id}` | Read an earlier version |
| GET | `/api/facets` | Topic and document-type counts |
| GET | `/api/sources` | Coverage, successful check timestamps and refresh errors |
| POST | `/api/documents/upload` | Multipart `file`, optional `title` and `location` |

Search also accepts `kind`, `provenance`, `limit` (1–100) and `offset`. Kinds are `bylaw`, `notice`, `plan`, `project` and uploaded `document`. `provenance` is `official` or `user_upload`. Empty `q` browses by source publication date, falling back to observation time when publication is unavailable. Uploads are immediately searchable and explicitly marked `user_upload`. Uploads cannot overwrite official records. Search results carry `description_type=source_excerpt`; descriptions quote the source text.

```sh
curl "http://127.0.0.1:8000/api/search?q=parking&kind=bylaw"
curl -F "file=@proposal.pdf" -F "title=King Street proposal" -F "location=King Street" http://127.0.0.1:8000/api/documents/upload
```

PDF, DOCX, UTF-8 TXT and Markdown uploads are supported, up to 10 MB. The database stores extracted text and page references for PDFs. Original uploaded bytes are not retained. Scanned or password-protected PDFs return actionable errors. OCR is not included. PDF extraction runs in an isolated process with a 60-second deadline. DOCX tables are extracted. Users should upload documents they intend to make public. Production hosting should set request-body and rate limits at its reverse proxy and provide a removal/reporting process for public uploads.

## Search behavior

FTS5 uses stemming and BM25 ranking. Title matches have greater weight than body text. A small explicit synonym vocabulary connects queries such as `bike` to `cycling` and `loud` to `noise`. All meaningful query terms must match within a passage (or its title, tags and location metadata). Arbitrary natural-language reasoning and semantic embeddings are not implemented. Query syntax is escaped before reaching FTS. Results are deduplicated before pagination.

Location is a case-insensitive text filter across source text and extracted/declared location mentions. It supports street/place names and wards, with no radius search or geocoding. Extracted address mentions may include administrative addresses, so they are not asserted project boundaries. Automatically assigned topic labels indicate textual matches.

Related bylaws show `linked_by_source` when a document links that bylaw URL, otherwise `topic_match` with the shared topics. A topical match does not establish that a law legally applies to a project. Source links and exact passages are available for checking. Council summaries retain the city's own statement that official decisions are recorded in meeting minutes.

## Waterloo source coverage

- [City news](https://www.waterloo.ca/news/city-news/), service alerts and road closures, plus the most recently modified 80 news sitemap entries by default.
- [Bylaw directory](https://www.waterloo.ca/bylaws-and-enforcement/bylaw-directory/), including linked PDF bylaws.
- City plans, projects, studies and strategies pages and their directly linked PDFs, discovered through the [city sitemap](https://www.waterloo.ca/sitemap.xml).
- Project cards on [Engage Waterloo](https://www.engagewr.ca/waterloo).
- Projects linked from the [planning application directory](https://www.engagewr.ca/development-planning-projects) and its applications-with-decisions directory.

This is a bounded collection of official sources. Regional bylaws, every council agenda attachment, nested project attachments, and hidden/dynamically loaded older project cards require additional adapters. Missing source dates remain null. `source_modified` contains the publisher's sitemap/header value and is distinct from `published_at`. `checked_at` means the source was fetched successfully. The current project or legal status remains `unknown` until a reliable source-specific status parser is added. A recent check alone cannot establish that a project is active or a bylaw is in force.

Old records remain searchable even if they disappear from an index. Changed text creates a new revision. Fetch failures preserve the last successful version and expose `availability=fetch_failed` and `last_error`. A source disappearing from a directory does not imply the project is completed. Historical versions start at the first CitiRep capture; older versions that were never published or captured cannot be reconstructed.

## Bundled seed

Collected November 12, 2026 (America/Chicago). The seed contains 417 records: 52 bylaws, 89 notices, 140 projects, and 136 plans/supporting documents. Of the latest 472 discovered source URLs, 56 could not be indexed: 29 exceeded the 15 MB source limit, 18 lacked extractable text, 8 exceeded the PDF time limit, and 1 hit the PDF parser stream limit. An earlier indexed record remains archived even though it was outside the expanded discovery set. Each failed URL and reason is retained in `/api/sources`. Some image-led news notices contain only the publisher's heading and image alt text.

## Storage and verification

`data/citirep.sqlite` contains documents, append-only revisions, passages, the FTS index and sync-run reports. Document and index changes commit atomically. WAL mode allows readers while ingestion writes. Identical uploads and identical source content are idempotent. `CITIREP_DATA` overrides the data directory. Back up this directory for long-term archival use.

```sh
uv run python -m unittest discover -s tests -v
uv run python -m citirep.snapshot export seeds/waterloo.sqlite.gz
```

Five focused tests cover upload/search/filtering, duplicate ingestion, revision retention, related bylaws, DOCX parsing, unsupported/oversized/scanned uploads, publication dates, and transactional rollback. Snapshot export refuses databases containing user uploads. The seed is a compressed SQLite backup of official records, useful for teammates without an initial crawl.

Dependency versions are locked in `uv.lock`. Libraries are FastAPI, Uvicorn, HTTPX, Beautiful Soup, pypdf, python-docx, python-multipart and fontTools. SQLite/FTS5 ships with Python. Code was created with Codex assistance and verified with the focused tests and live Waterloo ingestion. Source documents remain attributed to their publishers through their original URLs.
