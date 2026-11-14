import { useEffect, type ReactNode } from "react";
import Layout from "./components/Layout";
import useHashRoute from "./hooks/useHashRoute";
import useSaved from "./hooks/useSaved";
import usePreferences from "./hooks/usePreferences";
import WelcomePage from "./pages/WelcomePage";
import BoardPage from "./pages/BoardPage";
import SearchPage from "./pages/SearchPage";
import ArchivePage from "./pages/ArchivePage";
import DocumentPage from "./pages/DocumentPage";
import UploadPage from "./pages/UploadPage";
import SavedPage from "./pages/SavedPage";
import LookupPage from "./pages/LookupPage";
import HelpPage from "./pages/HelpPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import MunicipalPage from "./pages/MunicipalPage";
import EventsPage from "./pages/EventsPage";
import PlacesPage from "./pages/PlacesPage";
import UpdatesPage from "./pages/UpdatesPage";
import ParticipationPage from "./pages/ParticipationPage";
import NotFoundPage from "./pages/NotFoundPage";

const titles: Record<string, string> = {
  "/": "Welcome",
  "/explore": "Update Board",
  "/search": "Project documents",
  "/archive": "Past plans & documents",
  "/upload": "Add a document",
  "/saved": "Saved items",
  "/lookup": "Item lookup",
  "/help": "Library / offline help",
  "/accessibility": "Reading & accessibility",
  "/municipal": "Municipal users",
  "/events": "Consultation Events",
  "/places": "Your places & updates",
  "/updates": "Your updates",
};

export default function App() {
  const { route, path, query } = useHashRoute();
  const { saved, toggle, storageError: savedStorageError } = useSaved();
  const { preferences, updatePreferences, storageError } = usePreferences();
  const item = path.match(/^\/item\/(\d+)$/);
  const participation = path.match(/^\/participate\/(\d+)$/);
  useEffect(() => {
    document.title = `CitiRep · ${titles[path] || (item ? "Item overview" : participation ? "Have your say" : "Page not found")}`;
    document.getElementById("main")?.focus();
  }, [route]);

  let page: ReactNode;
  if (item)
    page = (
      <DocumentPage
        key={path}
        id={Number(item[1])}
        saved={saved}
        toggle={toggle}
      />
    );
  else if (participation)
    page = <ParticipationPage key={path} id={Number(participation[1])} />;
  else
    switch (path) {
      case "/":
        page = <WelcomePage />;
        break;
      case "/explore":
        page = <BoardPage />;
        break;
      case "/search":
        page = (
          <SearchPage
            key={route}
            query={query}
            archive={false}
            saved={saved}
            toggle={toggle}
          />
        );
        break;
      case "/archive":
        page = (
          <ArchivePage
            key={route}
            query={query}
            saved={saved}
            toggle={toggle}
          />
        );
        break;
      case "/upload":
        page = <UploadPage />;
        break;
      case "/saved":
        page = <SavedPage saved={saved} toggle={toggle} />;
        break;
      case "/lookup":
        page = <LookupPage />;
        break;
      case "/help":
        page = <HelpPage />;
        break;
      case "/accessibility":
        page = (
          <AccessibilityPage
            large={preferences.largeText}
            setLarge={(largeText) =>
              updatePreferences({ ...preferences, largeText })
            }
          />
        );
        break;
      case "/municipal":
        page = <MunicipalPage />;
        break;
      case "/events":
        page = <EventsPage />;
        break;
      case "/places":
        page = (
          <PlacesPage
            preferences={preferences}
            onSave={updatePreferences}
            storageError={storageError}
          />
        );
        break;
      case "/updates":
        page = <UpdatesPage saved={saved} />;
        break;
      default:
        page = <NotFoundPage />;
    }
  return (
    <Layout
      path={path}
      savedCount={saved.length}
      largeText={preferences.largeText}
    >
      {page}
      {storageError && path !== "/places" && (
        <p className="error" role="status">
          {storageError}
        </p>
      )}
      {savedStorageError && (
        <p className="error" role="status">
          {savedStorageError}
        </p>
      )}
    </Layout>
  );
}
