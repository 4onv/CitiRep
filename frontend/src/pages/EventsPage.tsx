import BackLink from "../components/BackLink";
import PageTitle from "../components/PageTitle";
import "./EventsPage.css";

export default function EventsPage() {
  return (
    <>
      <BackLink />
      <PageTitle title="Consultation Events" />
      <section className="panel events-page">
        <h2>Official participation details</h2>
        <p>
          A verified event feed and map coordinates are not available in the
          current source data. CitiRep cannot confirm event times, distances, or
          whether input is open.
        </p>
        <p>
          Read the original notice before making plans or submitting formal
          input.
        </p>
        <a className="button primary" href="#/search?kind=notice">
          Browse city notices
        </a>
      </section>
    </>
  );
}
