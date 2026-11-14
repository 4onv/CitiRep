import { Printer } from "lucide-react";
import PageTitle from "../components/PageTitle";
import "./AccessibilityPage.css";

export default function AccessibilityPage({
  large,
  setLarge,
}: {
  large: boolean;
  setLarge: (value: boolean) => void;
}) {
  return (
    <>
      <PageTitle title="Reading & accessibility" />
      <section className="panel narrow accessibility-page">
        <h2>Choose a comfortable reading view</h2>
        <div className="actions">
          <button
            onClick={() => setLarge(false)}
            aria-pressed={!large}
            className={!large ? "yellow" : ""}
          >
            Standard text
          </button>
          <button
            onClick={() => setLarge(true)}
            aria-pressed={large}
            className={large ? "yellow" : ""}
          >
            Large text view
          </button>
          <button onClick={() => window.print()}>
            <Printer size={16} /> Print / save
          </button>
        </div>
        <h3>Keyboard and screen-reader support</h3>
        <p>
          Use Tab to move between controls and Enter to activate them. The skip
          link jumps to the main content.
        </p>
        <h3>Text-only documents</h3>
        <p>
          Open an item and select “Read document” to read its extracted text.
          Use your browser’s print dialog to save a copy.
        </p>
        <a className="button" href="#/help">
          Request another format
        </a>
      </section>
    </>
  );
}
