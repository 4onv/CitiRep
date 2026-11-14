import { useState } from "react";
import { Search } from "lucide-react";
import PageTitle from "../components/PageTitle";
import LookupBanner from "../components/LookupBanner";
import go from "../lib/navigation";
import "./BoardPage.css";

export default function Board() {
  const [q, setQ] = useState("");
  return (
    <>
      <PageTitle
        title="Update Board"
        description="Explore what matters to you"
      />
      <LookupBanner />
      <div className="board-grid">
        <section className="panel">
          <h2>Consultation events</h2>
          <p>Find opportunities near you and see when you can take part.</p>
          <a href="#/events" className="button primary">
            Events map
          </a>
        </section>
        <section className="panel">
          <h2>Access project documents</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go("/search?q=" + encodeURIComponent(q));
            }}
          >
            <label htmlFor="board-query">Item number or keywords</label>
            <input
              id="board-query"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. housing, Lincoln Road"
            />
            <button className="primary" type="submit">
              <Search size={15} /> Search
            </button>
          </form>
        </section>
      </div>
      <div className="archive-row">
        <span>Looking for a past plan?</span>
        <a href="#/archive" className="button primary">
          Archive
        </a>
      </div>
      <p className="board-note">
        Read original city documents and check official participation details
        before taking action.
      </p>
    </>
  );
}
