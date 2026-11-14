import PageTitle from "../components/PageTitle";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <>
      <PageTitle title="Page not found" />
      <p>The requested page is not available.</p>
      <a className="button primary" href="#/explore">
        Update Board
      </a>
    </>
  );
}
