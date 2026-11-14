import { FileText, Clock, ArrowRight } from "lucide-react";
import { date, type Document } from "../api";
import "./DocumentOverview.css";
export default function DocumentOverview({
  doc,
  onRead,
}: {
  doc: Document;
  onRead: () => void;
}) {
  return (
    <>
      <article className="panel">
        <div className="section-heading">
          <h2>
            <FileText size={21} /> At a glance
          </h2>
          <span className="small-label">SOURCE EXCERPT</span>
        </div>
        <p className="summary">{doc.description}</p>
        <p className="muted">
          This excerpt comes from the original document. It is not an
          independently verified summary.
        </p>
        <div className="tags">
          {doc.tags.map((tag) => (
            <a href={"#/search?tag=" + encodeURIComponent(tag)} key={tag}>
              {tag}
            </a>
          ))}
        </div>
        <button className="yellow" onClick={() => onRead()}>
          Read the full document <ArrowRight size={16} />
        </button>
      </article>
      <article className="panel">
        <h2>
          <Clock size={21} /> Record timeline
        </h2>
        <div className="timeline">
          <div>
            <span>{date(doc.published_at)}</span>
            <h3>Source publication</h3>
            <p>
              {doc.published_at
                ? "Publication date supplied by the source."
                : "No publication date available from the source."}
            </p>
          </div>
          <div>
            <span>{date(doc.updated_at)}</span>
            <h3>Latest captured version</h3>
            <p>Last content update recorded by CitiRep.</p>
          </div>
          <div>
            <span>{date(doc.checked_at)}</span>
            <h3>Source checked</h3>
            <p>
              A successful check does not establish project or legal status.
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
