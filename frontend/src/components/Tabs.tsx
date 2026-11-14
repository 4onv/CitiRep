import type { KeyboardEvent } from "react";
import "./Tabs.css";

export default function Tabs({
  tabs,
  selected,
  onSelect,
  panelId,
}: {
  tabs: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  panelId: string;
}) {
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onSelect(tabs[next].id);
    document.getElementById("tab-" + tabs[next].id)?.focus();
  }
  return (
    <div className="document-tabs" role="tablist" aria-label="Document views">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={"tab-" + tab.id}
          role="tab"
          tabIndex={selected === tab.id ? 0 : -1}
          aria-selected={selected === tab.id}
          aria-controls={panelId}
          className={selected === tab.id ? "selected" : ""}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(e) => keyDown(e, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
