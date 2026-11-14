import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { api, type Results } from "../api";
import { kinds } from "../lib/documents";
import PageTitle from "../components/PageTitle";
import DocumentCard from "../components/DocumentCard";
import "./SearchPage.css";

export default function SearchPage({
  query,
  archive,
  saved,
  toggle,
}: {
  query: string;
  archive: boolean;
  saved: number[];
  toggle: (id: number) => void;
}) {
  const initial = new URLSearchParams(query);
  const [q, setQ] = useState(initial.get("q") || "");
  const [kind, setKind] = useState(initial.get("kind") || "");
  const [tag, setTag] = useState(initial.get("tag") || "");
  const [location, setLocation] = useState(initial.get("location") || "");
  const [provenance, setProvenance] = useState("");
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(q);
  const [submittedLocation, setSubmittedLocation] = useState(location);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    api<{ tags: typeof tags }>("/api/facets")
      .then((data) => setTags(data.tags))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: submitted,
      kind: kind || (archive ? "plan" : ""),
      tag,
      location: submittedLocation,
      provenance,
      limit: "12",
      offset: String(offset),
    });
    api<Results>("/api/search?" + params, { signal: controller.signal })
      .then(setResult)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "Could not load documents. Make sure the backend is running on port 8000.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    submitted,
    kind,
    tag,
    submittedLocation,
    provenance,
    offset,
    archive,
    retry,
  ]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setSubmitted(q);
    setSubmittedLocation(location);
    setRetry((r) => r + 1);
  };
  return (
    <>
      <a href="#/explore" className="back">
        <ArrowLeft size={16} /> Update board
      </a>
      <PageTitle
        title={archive ? "Past plans & documents" : "Project documents"}
      />
      <form className="panel search-panel" onSubmit={submit}>
        <label htmlFor="search">Search by topic, street, or item number</label>
        <div className="search-row">
          <div className="input-with-icon">
            <Search size={20} />
            <input
              id="search"
              value={q}
              maxLength={300}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Housing, street, or project name…"
            />
          </div>
          <button type="submit" className="primary">
            Search <ArrowRight size={17} />
          </button>
        </div>
        <div className="filters">
          <label>
            Document type
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">
                {archive ? "Plans & studies" : "All types"}
              </option>
              {Object.entries(kinds).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Topic
            <select
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All topics</option>
              {tags.map((t) => (
                <option key={t.tag} value={t.tag}>
                  {t.tag} ({t.count})
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select
              value={provenance}
              onChange={(e) => {
                setProvenance(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">All sources</option>
              <option value="official">Official city sources</option>
              <option value="user_upload">Public uploads</option>
            </select>
          </label>
          <label>
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              placeholder="Street, place, or ward"
            />
          </label>
        </div>
      </form>
      <div className="results-heading" role="status" aria-live="polite">
        <span>
          {loading
            ? "Searching city records…"
            : error
              ? "Search unavailable"
              : `${result?.total ?? 0} documents${submitted ? " for “" + submitted + "”" : ""}`}
        </span>
        <span>Waterloo, Ontario</span>
      </div>
      {error ? (
        <div role="alert" className="error panel">
          {error}
          <button onClick={() => setRetry((r) => r + 1)}>Try again</button>
        </div>
      ) : loading ? (
        <div className="loading panel">
          <span className="spinner" /> Loading documents…
        </div>
      ) : result?.items.length ? (
        <>
          <div className="document-list">
            {result.items.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                saved={saved}
                toggle={toggle}
              />
            ))}
          </div>
          <div className="pagination">
            <button
              disabled={offset === 0}
              onClick={() => {
                setOffset(Math.max(0, offset - 12));
                window.scrollTo(0, 0);
              }}
            >
              <ArrowLeft size={15} /> Previous
            </button>
            <span>
              {offset + 1}–{Math.min(offset + 12, result.total)} of{" "}
              {result.total}
            </span>
            <button
              disabled={offset + 12 >= result.total}
              onClick={() => {
                setOffset(offset + 12);
                window.scrollTo(0, 0);
              }}
            >
              Next <ArrowRight size={15} />
            </button>
          </div>
        </>
      ) : (
        <div className="empty panel">
          <Search size={32} />
          <h2>No matching documents</h2>
          <p>
            Try a broader topic or remove a filter. If this is a new database,
            import the bundled seed first.
          </p>
          <a href="#/search" className="button outline">
            View all documents
          </a>
        </div>
      )}
    </>
  );
}
