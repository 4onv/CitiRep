import { useState, type FormEvent } from "react";
import PageTitle from "../components/PageTitle";
import { Preferences } from "../lib/preferences";
import "./PlacesPage.css";

export default function PlacesPage({
  preferences,
  onSave,
  storageError,
}: {
  preferences: Preferences;
  onSave: (value: Preferences) => void;
  storageError: string;
}) {
  const [home, setHome] = useState(preferences.home);
  const [work, setWork] = useState(preferences.work);
  const [topics, setTopics] = useState(preferences.topics);
  const [saved, setSaved] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({ ...preferences, home: home.trim(), work: work.trim(), topics });
    setSaved(true);
  }
  return (
    <>
      <PageTitle title="Your places & updates" />
      <form
        className="places-page"
        onSubmit={submit}
        onChange={() => setSaved(false)}
      >
        <div className="places-grid">
          <section className="panel">
            <h2>Saved places</h2>
            <label htmlFor="home-place">Home</label>
            <input
              id="home-place"
              value={home}
              maxLength={200}
              onChange={(e) => setHome(e.target.value)}
              placeholder="Enter a street or neighbourhood"
            />
            <label htmlFor="work-place">Work / another place</label>
            <input
              id="work-place"
              value={work}
              maxLength={200}
              onChange={(e) => setWork(e.target.value)}
              placeholder="Add another area"
            />
            <p className="muted">
              Saved places are stored only in this browser. Location matching
              searches document text; distance and nearest-location calculations
              are not available.
            </p>
          </section>
          <section className="panel">
            <h2>Your topics</h2>
            <p>Choose topics to use as shortcuts when browsing.</p>
            <fieldset>
              <legend className="sr-only">Topics</legend>
              {[
                "housing",
                "transportation",
                "environment",
                "planning",
                "parks",
              ].map((topic) => (
                <label className="checkbox-label" key={topic}>
                  <input
                    type="checkbox"
                    checked={topics.includes(topic)}
                    onChange={(e) =>
                      setTopics(
                        e.target.checked
                          ? [...topics, topic]
                          : topics.filter((t) => t !== topic),
                      )
                    }
                  />
                  {topic}
                </label>
              ))}
            </fieldset>
            <p className="muted">
              In-app updates show the latest captured records for saved items.
              Email and SMS alerts are not connected.
            </p>
          </section>
        </div>
        <button className="yellow" type="submit">
          Save preferences
        </button>
        {saved && (
          <p className={storageError ? "error" : ""} role="status">
            {storageError || "Preferences saved in this browser."}
          </p>
        )}
      </form>
      <section className="panel place-shortcuts">
        <h2>Browse your places & topics</h2>
        <div className="actions">
          {[preferences.home, preferences.work]
            .filter(Boolean)
            .map((place, index) => (
              <a
                key={index}
                className="button"
                href={"#/search?location=" + encodeURIComponent(place)}
              >
                {place}
              </a>
            ))}
          {preferences.topics.map((topic) => (
            <a
              key={topic}
              className="button"
              href={"#/search?tag=" + encodeURIComponent(topic)}
            >
              {topic}
            </a>
          ))}
          <a href="#/search" className="button">
            All Waterloo
          </a>
        </div>
      </section>
    </>
  );
}
