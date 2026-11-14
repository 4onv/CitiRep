import PageTitle from "../components/PageTitle";
import BackLink from "../components/BackLink";
import "./MunicipalPage.css";

export default function MunicipalPage() {
  return (
    <>
      <BackLink to="/" />
      <PageTitle title="Municipal users" />
      <section className="panel municipal-panel">
        <h2>Municipal login</h2>
        <p>Upload project documents and review their source text.</p>
        <p>
          Staff authentication is not connected. Public uploads are available
          without a staff account and are labelled as public contributions.
        </p>
        <a href="#/upload" className="button primary">
          Continue to public upload
        </a>
      </section>
    </>
  );
}
