import SearchPage from "./SearchPage";
import "./ArchivePage.css";

export default function ArchivePage(props: {
  query: string;
  saved: number[];
  toggle: (id: number) => void;
}) {
  return <SearchPage {...props} archive />;
}
