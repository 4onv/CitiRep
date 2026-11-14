import { Printer } from "lucide-react";
import type { Document } from "../api";
import "./DocumentText.css";

export default function DocumentText({ document }: { document: Document }) {
  return (
    <article className="panel reading">
      <div className="section-heading">
        <h2>Original extracted text</h2>
        <button onClick={() => window.print()}>
          <Printer size={16} /> Print / save PDF
        </button>
      </div>
      {document.chunks?.length ? (
        document.chunks.map((chunk) => (
          <section key={chunk.id} className="passage">
            {chunk.page && <div className="eyebrow">PAGE {chunk.page}</div>}
            <p>{chunk.text}</p>
          </section>
        ))
      ) : (
        <p className="source-text">{document.body}</p>
      )}
    </article>
  );
}
