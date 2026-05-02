import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        if (e.key === "Escape") e.target.blur();
        return;
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.getElementById("navbar-search");
        if (searchInput) searchInput.focus();
        return;
      }

      if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
        navigate("/create");
        return;
      }

      if (e.key === "h" && !e.ctrlKey && !e.metaKey) {
        navigate("/");
        return;
      }

      if (e.key === "p" && !e.ctrlKey && !e.metaKey) {
        navigate("/profile");
        return;
      }

      if (e.key === "Escape") {
        document.activeElement?.blur();
      }
    },
    [navigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
