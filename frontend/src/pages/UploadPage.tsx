import UploadReview from "../components/UploadReview";
import type { UploadPreview } from "../api";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, FileText, Upload, Check } from "lucide-react";
import { api } from "../api";
import PageTitle from "../components/PageTitle";
import "./UploadPage.css";

export default function UploadPage() {
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: number; created: boolean } | null>(
    null,
  );
  const choose = (file?: File) => {
    setError("");
    if (!file) return;
    if (!/\.(pdf|docx|txt|md)$/i.test(file.name)) {
      setError("Choose a PDF, DOCX, TXT, or Markdown file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The file must be 10 MB or smaller.");
      return;
    }
    setFile(file);
  };
  const processFile = async (publish: boolean) => {
    if (!file) {
      setError("Choose a document first.");
      return;
    }
    setBusy(true);
    setError("");
    const data = new FormData();
    data.append("file", file);
    if (title.trim()) data.append("title", title.trim());
    if (location.trim()) data.append("location", location.trim());
    try {
      if (publish) {
        setResult(
          await api("/api/documents/upload", { method: "POST", body: data }),
        );
        try {
          localStorage.removeItem("citirep-upload-draft");
        } catch {
          /* storage optional */
        }
      } else
        setPreview(
          await api<UploadPreview>("/api/documents/preview", {
            method: "POST",
            body: data,
          }),
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void processFile(false);
  };
  const saveDraft = () => {
    try {
      localStorage.setItem(
        "citirep-upload-draft",
        JSON.stringify({ title, location }),
      );
      setDraftMessage(
        "Details saved in this browser. Select the file again when you return; the file itself is not saved.",
      );
    } catch {
      setDraftMessage(
        "Browser storage is unavailable. Draft details could not be saved.",
      );
    }
  };
  const restoreDraft = () => {
    try {
      const value = JSON.parse(
        localStorage.getItem("citirep-upload-draft") || "null",
      );
      if (
        !value ||
        typeof value.title !== "string" ||
        typeof value.location !== "string"
      ) {
        setDraftMessage("No saved draft details found.");
        return;
      }
      setTitle(value.title.slice(0, 300));
      setLocation(value.location.slice(0, 200));
      setDraftMessage(
        "Draft details restored. Choose the source file to continue.",
      );
    } catch {
      setDraftMessage("Draft details could not be restored.");
    }
  };
  return (
    <>
      <a className="back" href="#/explore">
        <ArrowLeft size={16} /> Update board
      </a>
      <PageTitle title={result ? "Your document is ready" : "Add a document"} />
      {result ? (
        <section className="panel narrow success">
          <Check size={36} />
          <h2>
            {result.created
              ? "Added to the collection"
              : "This document is already in the collection"}
          </h2>
          <p>CR-{result.id} · The extracted text is searchable now.</p>
          <div className="actions">
            <a href={"#/item/" + result.id} className="button yellow">
              Open document <ArrowRight size={16} />
            </a>
            <button
              onClick={() => {
                setResult(null);
                setPreview(null);
                setFile(null);
                setTitle("");
                setLocation("");
              }}
            >
              Upload another
            </button>
          </div>
        </section>
      ) : preview ? (
        <UploadReview
          preview={preview}
          onBack={() => {
            setPreview(null);
            setError("");
          }}
          onPublish={() => void processFile(true)}
          busy={busy}
          error={error}
        />
      ) : (
        <form className="panel upload-form narrow" onSubmit={submit}>
          <div className="steps">
            <span className="current">
              1 <b>Upload</b>
            </span>
            <span>
              2 <b>Review</b>
            </span>
            <span>
              3 <b>Publish</b>
            </span>
          </div>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={34} />
            <h2>{file ? file.name : "Drop a document here"}</h2>
            <p>PDF, DOCX, TXT or Markdown · Up to 10 MB</p>
            <label className="button outline file-label">
              {file ? "Choose a different file" : "Choose a file"}
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                disabled={busy}
                onChange={(e) => choose(e.target.files?.[0])}
              />
            </label>
            {file && (
              <span className="file-size">
                {(file.size / 1024).toFixed(0)} KB selected
              </span>
            )}
          </div>
          <label htmlFor="upload-title">
            Document title <span className="muted">(optional)</span>
          </label>
          <input
            id="upload-title"
            value={title}
            maxLength={300}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Neighbourhood housing proposal"
          />
          <label htmlFor="upload-location">
            Project location <span className="muted">(optional)</span>
          </label>
          <input
            id="upload-location"
            value={location}
            maxLength={200}
            disabled={busy}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Street, neighbourhood, or ward"
          />
          <div className="info-strip">
            <FileText size={20} />
            <p>
              Publishing makes uploads public and immediately searchable. Add
              only documents intended for public sharing. Files are labelled as
              public uploads, separately from official city records.
            </p>
          </div>
          <p className="fine-print">
            Text is extracted without AI summaries. Scanned PDFs need OCR before
            upload. Staff sign-in is not connected; this is a public upload.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !file}
            className="yellow upload-submit"
          >
            {busy ? (
              <>
                <span className="spinner" /> Extracting text…
              </>
            ) : (
              <>
                <Upload size={18} /> Choose file & review
              </>
            )}
          </button>
          <div className="actions">
            <button type="button" disabled={busy} onClick={saveDraft}>
              Save draft details
            </button>
            <button type="button" disabled={busy} onClick={restoreDraft}>
              Restore draft details
            </button>
          </div>
          <p role="status">{draftMessage}</p>
          <p role="status" className="fine-print">
            {busy
              ? "PDF processing may take up to a minute. Please keep this page open."
              : ""}
          </p>
        </form>
      )}
    </>
  );
}
