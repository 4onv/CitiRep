import PageTitle from "../components/PageTitle";
import BackLink from "../components/BackLink";
import useDocument from "../hooks/useDocument";
import "./ParticipationPage.css";

export default function ParticipationPage({ id }: { id: number }) {
  const { doc, error, loading } = useDocument(id);
  return (
    <>
      <BackLink to={"/item/" + id}>Item overview</BackLink>
      <PageTitle title="Have your say" />
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : loading ? (
        <p role="status">Loading participation information…</p>
      ) : (
        doc && (
          <section className="panel participation-page">
            <h2>{doc.title}</h2>
            <h3>Choose how to participate</h3>
            <p>
              Formal input goes through the city. Check the official notice for
              contact details, meeting instructions, deadlines, and the correct
              submission channel.
            </p>
            <p className="muted">
              Input status and deadline: check the official notice. CitiRep has
              not verified an open input period for this record.
            </p>
            {doc.source_url && /^https?:\/\//i.test(doc.source_url) ? (
              <a
                className="button yellow"
                target="_blank"
                rel="noreferrer"
                href={doc.source_url}
              >
                Official participation details
              </a>
            ) : (
              <p>
                This is a public upload without an official source link. Use the
                municipal contact printed on the original notice.
              </p>
            )}
            <hr />
            <h3>Community discussion</h3>
            <p>
              A public discussion board is not available yet. Comments made
              through CitiRep would be separate from formal city submissions.
            </p>
          </section>
        )
      )}
    </>
  );
}
