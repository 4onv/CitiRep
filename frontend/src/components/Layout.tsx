import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bookmark,
  Globe,
  Library,
  MapPin,
  Bell,
  Upload,
  Menu,
  X,
} from "lucide-react";
import "./Layout.css";
import { PUBLIC_DEMO } from "../demo";

export default function Layout({
  path,
  savedCount,
  largeText,
  children,
}: {
  path: string;
  savedCount: number;
  largeText: boolean;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setMenuOpen(false), [path]);
  const links = [
    { href: "/explore", label: "Update Board", icon: MapPin },
    { href: "/updates", label: "Updates", icon: Bell },
    { href: "/places", label: "My places", icon: MapPin },
    { href: "/saved", label: `Saved items (${savedCount})`, icon: Bookmark },
    { href: "/upload", label: "Add a document", icon: Upload },
  ];
  return (
    <div className={largeText ? "app large-text" : "app"}>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <div
        className="site-chrome"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <header className="header">
          <div className="header-inner">
            <a href="#/" className="brand" aria-label="CitiRep home">
              Citi<span>Rep</span>
            </a>
            <div className="city">Waterloo</div>
            <div className="header-actions">
              <span
                className="language"
                aria-label="Interface language: English"
              >
                <Globe size={16} /> EN
              </span>
              <a className="header-home" href="#/">
                Home
              </a>
              <button
                ref={menuButton}
                className="menu-toggle"
                aria-expanded={menuOpen}
                aria-controls="site-navigation"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />} Menu
              </button>
            </div>
          </div>
        </header>
        <nav
          id="site-navigation"
          className="nav"
          data-open={menuOpen}
          aria-label="Main navigation"
        >
          <div className="nav-inner">
            <a
              className="nav-home"
              href="#/"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </a>
            {links.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={"#" + href}
                className={
                  path === href ||
                  (href === "/explore" &&
                    ["/search", "/archive"].includes(path))
                    ? "active"
                    : ""
                }
                aria-current={path === href ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={16} /> {label}
              </a>
            ))}
          </div>
        </nav>
      </div>
      <main id="main" tabIndex={-1}>
        {PUBLIC_DEMO && <p className="demo-notice">Public browsing demo · 417 records · November 12, 2026 snapshot. Check original sources for current notices. <a href="https://github.com/4onv/CitiRep">Code</a></p>}
        {children}
      </main>
      <footer>
        <div className="footer-links">
          <a className="button" href="#/accessibility">
            Reading & accessibility
          </a>
          <a className="button" href="#/help">
            <Library size={14} /> Library / offline help
          </a>
        </div>
      </footer>
    </div>
  );
}
