import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Search, FileText } from "lucide-react";
import { api, type Document } from "../api";
import PageTitle from "../components/PageTitle";
import go from "../lib/navigation";
import "./LookupPage.css";

export default function Lookup() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const match = value.trim().match(/^(?:CR-)?(\d+)$/i);
    if (!match) {
      go("/search?q=" + encodeURIComponent(value.trim()));
      return;
    }
    setBusy(true);
    try {
      const doc = await api<Document>("/api/documents/" + match[1]);
      go("/item/" + doc.id);
    } catch {
      setError(
        "We could not find that record. Check the ID, or search by the project title or street.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <a href="#/explore" className="back">
        <ArrowLeft size={16} /> Browse Waterloo
      </a>
      <PageTitle title="I have an item #" />
      <div className="lookup-grid">
        <form className="panel" onSubmit={submit}>
          <Search size={29} />
          <h2>Enter your item or project number</h2>
          <label htmlFor="item-id">Item or project number</label>
          <input
            id="item-id"
            required
            maxLength={300}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. CR-142 or a notice number"
          />
          <p>
            Use CR- followed by a CitiRep record number to open it directly.
            Other notice numbers are searched in the source text.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="yellow" disabled={busy}>
            {busy ? "Looking up…" : "Find my project"} <ArrowRight size={17} />
          </button>
        </form>
        <aside className="panel lookup-aside">
          <FileText size={32} />
          <h2>On your mailed notice</h2>
          <p>
            Look for the item or project number, then check the project title
            and location against the record you find.
          </p>
          <div className="example-id">
            <span>CITIREP RECORD FORMAT</span>
            <strong>CR-142</strong>
          </div>
          <p className="fine-print">
            Example ID format only. No account or saved location is needed to
            search.
          </p>
        </aside>
      </div>
    </>
  );
}
