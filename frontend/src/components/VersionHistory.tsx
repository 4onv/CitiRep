import { useEffect, useState } from "react";
import { api, date, type Revision } from "../api";
import "./VersionHistory.css";

export default function VersionHistory({ documentId }: { documentId: number }) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selected, setSelected] = useState("");
  const [version, setVersion] = useState<Revision | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setLoading(true);
    setVersion(null);
    const url = `/api/documents/${documentId}/revisions${selected ? "/" + selected : ""}`;
    const fetchVersion = selected
      ? api<Revision>(url, { signal: controller.signal }).then(setVersion)
      : api<Revision[]>(url, { signal: controller.signal }).then(setRevisions);
    fetchVersion
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("Could not load version history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [documentId, selected, attempt]);
  return (
    <article className="panel">
      <h2>Version history</h2>
      <p>Versions start with CitiRep’s first capture of this record.</p>
      <label htmlFor="version">Captured version</label>
      <select
        id="version"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Choose a version ({revisions.length})</option>
        {revisions.map((r, index) => (
          <option key={r.id} value={r.id}>
            {date(r.captured_at)} · Version {revisions.length - index}
          </option>
        ))}
      </select>
      {loading && <p role="status">Loading version history…</p>}
      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      )}
      {version && (
        <div className="historical">
          <span className="badge">Captured {date(version.captured_at)}</span>
          <h3>{version.title}</h3>
          <p className="source-text">{version.body}</p>
        </div>
      )}
    </article>
  );
}
