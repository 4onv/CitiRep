import { useState } from "react";
import { Bookmark, MapPin } from "lucide-react";
import BackLink from "../components/BackLink";
import DocumentOverview from "../components/DocumentOverview";
import DocumentSidebar from "../components/DocumentSidebar";
import DocumentText from "../components/DocumentText";
import VersionHistory from "../components/VersionHistory";
import Tabs from "../components/Tabs";
import useDocument from "../hooks/useDocument";
import { kinds } from "../lib/documents";
import "./DocumentPage.css";

export default function DocumentPage({
  id,
  saved,
  toggle,
}: {
  id: number;
  saved: number[];
  toggle: (id: number) => void;
}) {
  const { doc, error } = useDocument(id);
  const [tab, setTab] = useState("overview");
  if (error)
    return (
      <section className="panel error" role="alert">
        <h1>Could not open this record</h1>
        <p>{error}</p>
        <a href="#/search">Return to search</a>
      </section>
    );
  if (!doc)
    return (
      <div className="panel loading" role="status">
        <span className="spinner" /> Loading document…
      </div>
    );
  return (
    <>
      <BackLink to="/search">Project documents</BackLink>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">Item Overview · CR-{doc.id}</div>
          <h1>{doc.title}</h1>
          <div className="card-meta">
            <span className={"badge " + doc.kind}>{kinds[doc.kind]}</span>
            <span>
              {doc.provenance === "official"
                ? "Official city source"
                : "Public upload"}
            </span>
            {doc.locations[0] && (
              <span>
                <MapPin size={14} /> {doc.locations[0]}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => toggle(id)}
          aria-pressed={saved.includes(id)}
          className={saved.includes(id) ? "yellow" : ""}
        >
          <Bookmark size={17} /> {saved.includes(id) ? "Saved" : "Save item"}
        </button>
      </div>
      <Tabs
        tabs={[
          { id: "overview", label: "At a glance" },
          { id: "document", label: "Read document" },
          { id: "history", label: "Version history" },
        ]}
        selected={tab}
        onSelect={setTab}
        panelId="detail-panel"
      />
      <div className="detail-grid">
        <section
          id="detail-panel"
          role="tabpanel"
          aria-labelledby={"tab-" + tab}
          tabIndex={0}
        >
          {tab === "overview" ? (
            <DocumentOverview
              doc={doc}
              onRead={() => {
                setTab("document");
                document.getElementById("tab-document")?.focus();
              }}
            />
          ) : tab === "document" ? (
            <DocumentText document={doc} />
          ) : (
            <VersionHistory documentId={id} />
          )}
        </section>
        <DocumentSidebar doc={doc} />
      </div>
    </>
  );
}
