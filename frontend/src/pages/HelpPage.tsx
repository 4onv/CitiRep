import { ExternalLink, Library, Printer } from "lucide-react";
import PageTitle from "../components/PageTitle";
import "./HelpPage.css";

export default function Help() {
  return (
    <>
      <PageTitle title="No device? Visit a public library" />
      <div className="help-grid">
        <section className="panel">
          <Library size={30} />
          <h2>Visit a public library</h2>
          <p>
            Bring your notice or item number. Ask about public computers and
            available assistance.
          </p>
          <a
            className="button primary"
            href="https://www.wpl.ca/your-library/locations-hours/"
            target="_blank"
            rel="noreferrer"
          >
            Library locations & hours <ExternalLink size={15} />
          </a>
          <p className="fine-print">
            Check current hours and available services before visiting.
          </p>
        </section>
        <section className="panel">
          <Printer size={30} />
          <h2>Prefer paper?</h2>
          <p>
            Open a document’s “Read document” tab and use Print / save PDF to
            make a browser printout. For another format, contact the
            municipality using the details on your original notice.
          </p>
          <p>
            Quote the project number and document title so staff can find the
            right information.
          </p>
        </section>
      </div>
    </>
  );
}
