import { UploadPreview } from "../api";
import "./UploadReview.css";

export default function UploadReview({
  preview,
  onBack,
  onPublish,
  busy,
  error,
}: {
  preview: UploadPreview;
  onBack: () => void;
  onPublish: () => void;
  busy: boolean;
  error: string;
}) {
  return (
    <section className="panel upload-review">
      <div className="steps">
        <span>1 · Upload</span>
        <span className="current">2 · Review</span>
        <span>3 · Publish</span>
      </div>
      <h2>Review source text before publishing</h2>
      <h3>{preview.title}</h3>
      <p>Source excerpt</p>
      <blockquote>{preview.description}</blockquote>
      <div className="tags">
        {preview.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <details>
        <summary>Read extracted document</summary>
        <div className="preview-text">{preview.body}</div>
      </details>
      <p>
        Nothing has been published yet. Publishing adds the document to public
        search as a public upload. No AI summary or municipal review is implied.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button disabled={busy} onClick={onBack}>
          Back to editing
        </button>
        <button className="yellow" disabled={busy} onClick={onPublish}>
          {busy ? "Publishing…" : "Publish document"}
        </button>
      </div>
    </section>
  );
}
