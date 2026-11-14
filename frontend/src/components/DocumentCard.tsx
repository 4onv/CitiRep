import { ArrowRight, MapPin, FileText, Bookmark } from "lucide-react";
import { date, type Document } from "../api";
import { kinds } from "../lib/documents";
import "./DocumentCard.css";

export default function DocumentCard({
  doc,
  saved,
  toggle,
}: {
  doc: Document;
  saved: number[];
  toggle: (id: number) => void;
}) {
  return (
    <article className="document-card">
      <div className="document-icon">
        <FileText size={29} strokeWidth={1.3} />
        <span>{doc.kind === "bylaw" ? "BY-LAW" : "RECORD"}</span>
      </div>
      <div className="document-content">
        <div className="card-meta">
          <span className={"badge " + doc.kind}>
            {kinds[doc.kind] || doc.kind}
          </span>
          <span>
            {doc.provenance === "official" ? "City source" : "Public upload"}
          </span>
          <span>Updated {date(doc.updated_at)}</span>
        </div>
        <h2>
          <a href={"#/item/" + doc.id}>{doc.title}</a>
        </h2>
        <p className="excerpt">{doc.excerpt || doc.description}</p>
        <div className="tags">
          {doc.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
          {doc.locations[0] && (
            <span>
              <MapPin size={12} /> {doc.locations[0]}
            </span>
          )}
        </div>
        <a href={"#/item/" + doc.id} className="text-link">
          View item <ArrowRight size={15} />
        </a>
      </div>
      <button
        className="save-button icon-button"
        aria-label={
          saved.includes(doc.id) ? "Unsave " + doc.title : "Save " + doc.title
        }
        aria-pressed={saved.includes(doc.id)}
        onClick={() => toggle(doc.id)}
      >
        <Bookmark
          size={20}
          fill={saved.includes(doc.id) ? "currentColor" : "none"}
        />
      </button>
    </article>
  );
}
