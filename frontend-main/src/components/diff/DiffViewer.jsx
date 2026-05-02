import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import "./diff-viewer.css";

/**
 * Parse a unified diff string into structured file diffs.
 */
function parseDiff(diffStr) {
  if (!diffStr) return [];

  const files = [];
  const lines = diffStr.split("\n");
  let currentFile = null;
  let currentHunk = null;
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header
    if (line.startsWith("diff --git") || line.startsWith("--- ") && lines[i + 1]?.startsWith("+++ ")) {
      continue;
    }

    if (line.startsWith("--- ")) {
      continue;
    }

    if (line.startsWith("+++ ")) {
      const filename = line.replace(/^\+\+\+ [ab/]*/, "").trim() || "unknown";
      currentFile = { filename, hunks: [], additions: 0, deletions: 0 };
      files.push(currentFile);
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)?/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      currentHunk = { header: line, context: hunkMatch[3] || "", lines: [] };
      if (currentFile) currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk || !currentFile) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({ type: "add", content: line.substring(1), oldNum: null, newNum: newLine });
      currentFile.additions++;
      newLine++;
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({ type: "del", content: line.substring(1), oldNum: oldLine, newNum: null });
      currentFile.deletions++;
      oldLine++;
    } else if (line.startsWith("\\")) {
      // No newline at end of file
      currentHunk.lines.push({ type: "info", content: line, oldNum: null, newNum: null });
    } else {
      // Context line
      currentHunk.lines.push({ type: "ctx", content: line.startsWith(" ") ? line.substring(1) : line, oldNum: oldLine, newNum: newLine });
      oldLine++;
      newLine++;
    }
  }

  return files;
}

const DiffViewer = ({ diff = "", files: filesProp }) => {
  const [viewMode, setViewMode] = useState("unified");
  const [collapsedFiles, setCollapsedFiles] = useState(new Set());

  const parsedFiles = useMemo(() => {
    if (filesProp && filesProp.length > 0) return filesProp;
    return parseDiff(diff);
  }, [diff, filesProp]);

  const toggleFile = (idx) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCopyLine = (content) => {
    navigator.clipboard.writeText(content).then(
      () => toast.success("Copied to clipboard."),
      () => toast.error("Failed to copy.")
    );
  };

  const handleCopyBlock = (file) => {
    const text = file.hunks
      .flatMap((h) => h.lines)
      .filter((l) => l.type === "add" || l.type === "ctx")
      .map((l) => l.content)
      .join("\n");
    navigator.clipboard.writeText(text).then(
      () => toast.success("Block copied."),
      () => toast.error("Failed to copy.")
    );
  };

  if (parsedFiles.length === 0) {
    return (
      <div className="dv-viewer">
        <div className="dv-empty">
          <p>No diff to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dv-viewer">
      {/* Toolbar */}
      <div className="dv-toolbar">
        <span className="dv-file-summary">
          {parsedFiles.length} file{parsedFiles.length !== 1 ? "s" : ""} changed
        </span>
        <div className="dv-view-toggle">
          <button
            className={`dv-view-btn ${viewMode === "unified" ? "active" : ""}`}
            onClick={() => setViewMode("unified")}
          >
            Unified
          </button>
          <button
            className={`dv-view-btn ${viewMode === "split" ? "active" : ""}`}
            onClick={() => setViewMode("split")}
          >
            Split
          </button>
        </div>
      </div>

      {/* Files */}
      {parsedFiles.map((file, fileIdx) => {
        const isCollapsed = collapsedFiles.has(fileIdx);

        return (
          <div key={fileIdx} className="dv-file">
            <div className="dv-file-header" onClick={() => toggleFile(fileIdx)} role="button" tabIndex={0}>
              <span className={`dv-file-chevron ${isCollapsed ? "" : "expanded"}`}>&#9662;</span>
              <span className="dv-file-name">{file.filename}</span>
              <span className="dv-file-stats">
                <span className="dv-stat-add">+{file.additions}</span>
                <span className="dv-stat-del">-{file.deletions}</span>
              </span>
              <button
                className="dv-copy-block-btn"
                onClick={(e) => { e.stopPropagation(); handleCopyBlock(file); }}
                title="Copy new version"
                aria-label="Copy block"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
              </button>
            </div>

            {!isCollapsed && (
              <div className={`dv-file-body ${viewMode === "split" ? "dv-split" : "dv-unified"}`}>
                {file.hunks.map((hunk, hunkIdx) => (
                  <div key={hunkIdx} className="dv-hunk">
                    <div className="dv-hunk-header">
                      <span>{hunk.header}</span>
                      {hunk.context && <span className="dv-hunk-ctx">{hunk.context}</span>}
                    </div>

                    {viewMode === "unified" ? (
                      <table className="dv-table">
                        <tbody>
                          {hunk.lines.map((line, lineIdx) => (
                            <tr key={lineIdx} className={`dv-line dv-line-${line.type}`}>
                              <td className="dv-line-num dv-line-num-old">{line.oldNum ?? ""}</td>
                              <td className="dv-line-num dv-line-num-new">{line.newNum ?? ""}</td>
                              <td className="dv-line-prefix">
                                {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
                              </td>
                              <td className="dv-line-content">
                                <span>{line.content}</span>
                                <button className="dv-copy-line-btn" onClick={() => handleCopyLine(line.content)} title="Copy line" aria-label="Copy line">
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      /* Split view */
                      <table className="dv-table dv-table-split">
                        <tbody>
                          {(() => {
                            const rows = [];
                            const lines = hunk.lines;
                            let i = 0;
                            while (i < lines.length) {
                              const line = lines[i];
                              if (line.type === "ctx" || line.type === "info") {
                                rows.push(
                                  <tr key={i} className="dv-line dv-line-ctx">
                                    <td className="dv-line-num">{line.oldNum ?? ""}</td>
                                    <td className="dv-line-content dv-split-left">{line.content}</td>
                                    <td className="dv-line-num">{line.newNum ?? ""}</td>
                                    <td className="dv-line-content dv-split-right">{line.content}</td>
                                  </tr>
                                );
                                i++;
                              } else if (line.type === "del") {
                                // Collect consecutive deletions and additions
                                const dels = [];
                                while (i < lines.length && lines[i].type === "del") { dels.push(lines[i]); i++; }
                                const adds = [];
                                while (i < lines.length && lines[i].type === "add") { adds.push(lines[i]); i++; }
                                const maxLen = Math.max(dels.length, adds.length);
                                for (let j = 0; j < maxLen; j++) {
                                  const d = dels[j];
                                  const a = adds[j];
                                  rows.push(
                                    <tr key={`${i}-${j}`} className="dv-line">
                                      <td className={`dv-line-num ${d ? "dv-line-del" : ""}`}>{d?.oldNum ?? ""}</td>
                                      <td className={`dv-line-content dv-split-left ${d ? "dv-line-del" : ""}`}>{d?.content ?? ""}</td>
                                      <td className={`dv-line-num ${a ? "dv-line-add" : ""}`}>{a?.newNum ?? ""}</td>
                                      <td className={`dv-line-content dv-split-right ${a ? "dv-line-add" : ""}`}>{a?.content ?? ""}</td>
                                    </tr>
                                  );
                                }
                              } else if (line.type === "add") {
                                rows.push(
                                  <tr key={i} className="dv-line">
                                    <td className="dv-line-num" />
                                    <td className="dv-line-content dv-split-left" />
                                    <td className="dv-line-num dv-line-add">{line.newNum ?? ""}</td>
                                    <td className="dv-line-content dv-split-right dv-line-add">{line.content}</td>
                                  </tr>
                                );
                                i++;
                              } else {
                                i++;
                              }
                            }
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

DiffViewer.propTypes = {
  diff: PropTypes.string,
  files: PropTypes.arrayOf(PropTypes.shape({
    filename: PropTypes.string,
    hunks: PropTypes.array,
    additions: PropTypes.number,
    deletions: PropTypes.number,
    length: PropTypes.number,
  })),
};

export default DiffViewer;
