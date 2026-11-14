import { date } from "../api";
import PageTitle from "../components/PageTitle";
import useSavedDocuments from "../hooks/useSavedDocuments";
import "./UpdatesPage.css";

export default function UpdatesPage({ saved }: { saved: number[] }) {
  const { docs, failed, loading, retry } = useSavedDocuments(saved);
  const updates = [...docs].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
  return (
    <>
      <PageTitle title="Your updates" />
      <p>
        Latest captured versions of your saved items. These are document
        updates, not confirmed changes to project status.
      </p>
      <div className="actions updates-actions">
        <a href="#/places" className="button">
          Manage preferences
        </a>
        <a href="#/saved" className="button">
          Saved items
        </a>
        <button onClick={retry} disabled={loading}>
          Refresh
        </button>
      </div>
      {loading ? (
        <p role="status">Loading updates…</p>
      ) : (
        <>
          {failed > 0 && (
            <p className="error" role="alert">
              {failed} saved record(s) could not be loaded. Try Refresh.
            </p>
          )}
          {updates.length ? (
            <div className="updates-list">
              {updates.map((doc) => (
                <article key={doc.id} className="panel update-row">
                  <div>
                    <h2>{doc.title}</h2>
                    <p>
                      Updated {date(doc.updated_at)} · CR-{doc.id}
                    </p>
                    <span className="muted">
                      {doc.provenance === "official"
                        ? "City source"
                        : "Public upload"}
                    </span>
                  </div>
                  <a className="button" href={"#/item/" + doc.id}>
                    View
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <section className="panel">
              <h2>No followed items yet</h2>
              <p>
                Save a project or document to see its latest captured version
                here.
              </p>
              <a className="button primary" href="#/search">
                Browse documents
              </a>
            </section>
          )}
        </>
      )}
    </>
  );
}
