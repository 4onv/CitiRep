import LookupBanner from "../components/LookupBanner";
import "./WelcomePage.css";

export default function Welcome() {
  return (
    <>
      <LookupBanner />
      <section className="welcome">
        <h1>Welcome to CitiRep</h1>
        <p>Find out what is happening in your city.</p>
        <div className="welcome-cards">
          <article className="welcome-card resident">
            <h2>General users</h2>
            <p>
              Explore city projects, documents and opportunities to have your
              say.
            </p>
            <a className="button yellow" href="#/explore">
              Explore
            </a>
          </article>
          <article className="welcome-card staff">
            <h2>Municipal users</h2>
            <p>Submit agendas, minutes and staff reports. Login required.</p>
            <a className="button outline" href="#/municipal">
              Staff login
            </a>
          </article>
        </div>
      </section>
    </>
  );
}
