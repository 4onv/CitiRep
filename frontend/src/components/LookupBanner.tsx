import { Search, FileText } from "lucide-react";
import "./LookupBanner.css";

export default function LookupBanner() {
  return (
    <div className="lookup-banner">
      <div className="banner-icon">
        <FileText size={23} />
      </div>
      <div>
        <strong>Have a project ID from a mailed notice?</strong>
        <p>Enter the number to open that project.</p>
      </div>
      <a href="#/lookup" className="button yellow">
        <Search size={16} /> I have an item #
      </a>
    </div>
  );
}
