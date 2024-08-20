import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./command-palette.css";

const COMMANDS = [
  { name: "Go to Dashboard", path: "/", icon: "home", keys: "h" },
  { name: "Create Repository", path: "/create", icon: "repo", keys: "n" },
  { name: "Your Profile", path: "/profile", icon: "user", keys: "p" },
  { name: "Settings", path: "/settings", icon: "gear" },
  { name: "Search", path: "/search", icon: "search", keys: "/" },
  { name: "Explore", path: "/explore", icon: "globe" },
  { name: "Code Snippets", path: "/snippets", icon: "code" },
  { name: "Create Snippet", path: "/snippets/new", icon: "plus" },
  { name: "Bookmarks", path: "/bookmarks", icon: "bookmark" },
  { name: "Admin Analytics", path: "/admin", icon: "chart" },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = query
    ? COMMANDS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  const run = (cmd) => {
    setOpen(false);
    navigate(cmd.path);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[selected]) { run(filtered[selected]); }
  };

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--color-text-secondary)"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
          />
          <kbd className="cmd-kbd">Esc</kbd>
        </div>
        <ul className="cmd-list">
          {filtered.length === 0 ? (
            <li className="cmd-empty">No results for {`"${query}"`}</li>
          ) : filtered.map((cmd, i) => (
            <li
              key={cmd.path}
              className={`cmd-item ${i === selected ? "selected" : ""}`}
              onClick={() => run(cmd)}
              onMouseEnter={() => setSelected(i)}
            >
              <span className="cmd-item-name">{cmd.name}</span>
              {cmd.keys && <kbd className="cmd-item-key">{cmd.keys}</kbd>}
            </li>
          ))}
        </ul>
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
