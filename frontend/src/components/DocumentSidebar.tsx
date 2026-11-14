import { ExternalLink, FileText, ChevronRight } from "lucide-react";
import { date, type Document } from "../api";
import "./DocumentSidebar.css";
export default function DocumentSidebar({ doc }: { doc: Document }) {
  const id = doc.id;
  return (
    <aside>
      <section className="panel">
        <h2>Have your say</h2>
        <p>
          Check the official notice for input deadlines and participation
          details.
        </p>
        <a className="button yellow" href={"#/participate/" + id}>
          How to comment
        </a>
      </section>
      <section className="panel source-panel">
        <span className="icon-tile">
          <ExternalLink size={23} />
        </span>
        <h2>Check the source</h2>
        <p>
          Read the original record for participation details, deadlines, and
          current status.
        </p>
        {doc.source_url && /^https?:\/\//i.test(doc.source_url) ? (
          <a
            className="button primary"
            href={doc.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Open original source <ExternalLink size={15} />
          </a>
        ) : (
          <p className="muted">
            Uploaded document. Original file bytes are not retained; extracted
            text is available here.
          </p>
        )}
        <dl>
          <dt>Published</dt>
          <dd>{date(doc.published_at)}</dd>
          <dt>Project / legal status</dt>
          <dd>{doc.status === "unknown" ? "Not confirmed" : doc.status}</dd>
          <dt>Availability</dt>
          <dd>
            {doc.availability === "fetch_failed"
              ? "Last fetch failed; showing saved text"
              : "Saved text available"}
          </dd>
        </dl>
      </section>
      <section className="panel">
        <h2>Related by-laws</h2>
        {doc.related_bylaws.length ? (
          doc.related_bylaws.map((r) => (
            <a href={"#/item/" + r.id} className="related" key={r.id}>
              <FileText size={17} />
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.relationship === "linked_by_source"
                    ? "Linked by the source"
                    : "Shared topic · verify relevance"}
                </small>
              </span>
              <ChevronRight size={16} />
            </a>
          ))
        ) : (
          <p className="muted">No related by-laws identified.</p>
        )}
        <p className="fine-print">
          A shared topic does not establish that a by-law applies to this
          project.
        </p>
      </section>
    </aside>
  );
}
