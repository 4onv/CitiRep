import BackLink from "../components/BackLink";
import PageTitle from "../components/PageTitle";

export default function DemoUploadPage() {
  return <>
    <BackLink to="/explore" />
    <PageTitle title="Document uploads" />
    <section className="panel">
      <h2>This public demo is for browsing</h2>
      <p>Search 417 Waterloo records, read source passages and explore captured versions. No account is needed.</p>
      <p>Document parsing and uploads are implemented in the Python backend. This hosted demo does not accept files or publish contributions.</p>
      <a className="button yellow" href="#/search">Browse documents</a>{" "}
      <a className="button" href="https://www.figma.com/proto/5aimkgryhJ1M2ZkX74JCNB/CitiRep?node-id=4-503&starting-point-node-id=4%3A503">Try the upload design</a>{" "}
      <a className="button" href="https://github.com/4onv/CitiRep">View backend code</a>
    </section>
  </>;
}
