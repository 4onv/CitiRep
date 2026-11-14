import useSavedDocuments from "../hooks/useSavedDocuments";

import { ArrowRight, Bookmark, Bell } from "lucide-react";

import PageTitle from "../components/PageTitle";
import DocumentCard from "../components/DocumentCard";
import "./SavedPage.css";

export default function SavedPage({
  saved,
  toggle,
}: {
  saved: number[];
  toggle: (id: number) => void;
}) {
  const { docs, loading, failed } = useSavedDocuments(saved);
  return (
    <>
      <PageTitle
        title="Your saved items"
        description="A reading list saved in this browser. No account needed."
      />
      <div className="info-strip">
        <Bell size={20} />
        <p>
          Saving keeps a shortcut to the current record. Email and SMS
          notifications are not connected.
        </p>
      </div>
      {loading ? (
        <p role="status">Loading saved records…</p>
      ) : (
        <>
          {failed > 0 && (
            <p role="alert" className="error">
              {failed} saved record(s) could not be loaded. Check your backend
              connection.
            </p>
          )}
          {docs.length ? (
            <div className="document-list">
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  saved={saved}
                  toggle={toggle}
                />
              ))}
            </div>
          ) : (
            <div className="panel empty">
              <Bookmark size={34} />
              <h2>No saved items</h2>
              <p>Use the bookmark on any document to save it for later.</p>
              <a href="#/search" className="button yellow">
                Browse documents <ArrowRight size={17} />
              </a>
            </div>
          )}
        </>
      )}
    </>
  );
}
