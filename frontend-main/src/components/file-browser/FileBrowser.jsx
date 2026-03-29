import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import api from "../../api";
import toast from "react-hot-toast";
import "./file-browser.css";

const FILE_ICONS = {
  folder: "\uD83D\uDCC1",
  js: "\uD83D\uDFE8", jsx: "\uD83D\uDFE8", ts: "\uD83D\uDFE6", tsx: "\uD83D\uDFE6",
  py: "\uD83D\uDC0D", rb: "\uD83D\uDD34", go: "\uD83D\uDFE6",
  rs: "\uD83E\uDDAC", java: "\u2615", c: "\u2699\uFE0F", cpp: "\u2699\uFE0F", h: "\u2699\uFE0F",
  html: "\uD83C\uDF10", css: "\uD83C\uDFA8", scss: "\uD83C\uDFA8",
  json: "\uD83D\uDCC4", yaml: "\uD83D\uDCC4", yml: "\uD83D\uDCC4", toml: "\uD83D\uDCC4",
  md: "\uD83D\uDCDD", txt: "\uD83D\uDCC4",
  sh: "\uD83D\uDCBB", bash: "\uD83D\uDCBB",
  svg: "\uD83D\uDDBC\uFE0F", png: "\uD83D\uDDBC\uFE0F", jpg: "\uD83D\uDDBC\uFE0F", gif: "\uD83D\uDDBC\uFE0F",
  default: "\uD83D\uDCC4",
};

function getFileIcon(name, isDir) {
  if (isDir) return FILE_ICONS.folder;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatFileSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Build a tree structure from a flat list of files.
 * Each file can be { name, path, type, size, lastCommit } or just a string.
 */
function buildTree(files) {
  const root = { name: "", children: {}, isDir: true };

  (files || []).forEach((file) => {
    const path = typeof file === "string" ? file : file.path || file.name || "";
    const parts = path.split("/").filter(Boolean);
    let current = root;

    parts.forEach((part, idx) => {
      if (!current.children[part]) {
        const isDir = idx < parts.length - 1 || (typeof file !== "string" && file.type === "directory");
        current.children[part] = {
          name: part,
          children: {},
          isDir,
          size: !isDir && typeof file !== "string" ? file.size : null,
          lastCommit: !isDir && typeof file !== "string" ? file.lastCommit : null,
          fullPath: parts.slice(0, idx + 1).join("/"),
        };
      }
      current = current.children[part];
    });
  });

  return root;
}

function sortEntries(entries) {
  return entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
}

const TreeNode = ({ node, depth = 0, onFileClick, expandedDirs, toggleDir }) => {
  const isExpanded = expandedDirs.has(node.fullPath);

  if (node.isDir) {
    const children = sortEntries(Object.values(node.children));
    return (
      <div className="fb-tree-node">
        <button
          className="fb-tree-row fb-tree-dir"
          onClick={() => toggleDir(node.fullPath)}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <span className={`fb-tree-chevron ${isExpanded ? "expanded" : ""}`}>&#9662;</span>
          <span className="fb-tree-icon">{FILE_ICONS.folder}</span>
          <span className="fb-tree-name">{node.name}</span>
        </button>
        {isExpanded && children.map((child) => (
          <TreeNode
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            onFileClick={onFileClick}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      className="fb-tree-row fb-tree-file"
      onClick={() => onFileClick(node)}
      style={{ paddingLeft: `${12 + depth * 20}px` }}
    >
      <span className="fb-tree-icon">{getFileIcon(node.name, false)}</span>
      <span className="fb-tree-name">{node.name}</span>
      {node.size != null && <span className="fb-tree-size">{formatFileSize(node.size)}</span>}
      {node.lastCommit && <span className="fb-tree-commit">{node.lastCommit}</span>}
    </button>
  );
};

const nodeShape = {
  name: PropTypes.string,
  fullPath: PropTypes.string,
  isDir: PropTypes.bool,
  size: PropTypes.number,
  lastCommit: PropTypes.string,
};
nodeShape.children = PropTypes.objectOf(PropTypes.shape(nodeShape));

TreeNode.propTypes = {
  node: PropTypes.shape(nodeShape).isRequired,
  depth: PropTypes.number,
  onFileClick: PropTypes.func.isRequired,
  expandedDirs: PropTypes.instanceOf(Set).isRequired,
  toggleDir: PropTypes.func.isRequired,
};

const FileBrowser = ({ files = [], repoId, currentPath = "" }) => {
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branch, setBranch] = useState("main");
  const [branches] = useState(["main", "develop", "staging"]);

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleDir = (path) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFileClick = async (node) => {
    setSelectedFile(node);
    setFileContent(null);
    setLoadingFile(true);

    try {
      const res = await api.get(`/repo/${repoId}/file/${encodeURIComponent(node.fullPath)}`);
      setFileContent(res.data?.content || res.data || "");
    } catch {
      toast.error("Failed to load file content.");
      setFileContent("// Unable to load file content");
    } finally {
      setLoadingFile(false);
    }
  };

  // Filter tree entries
  const allEntries = useMemo(() => {
    const entries = [];
    const collect = (node) => {
      Object.values(node.children).forEach((child) => {
        entries.push(child);
        if (child.isDir) collect(child);
      });
    };
    collect(tree);
    return entries;
  }, [tree]);

  const filteredEntries = searchQuery
    ? allEntries.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  // Breadcrumb
  const breadcrumbParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const rootEntries = sortEntries(Object.values(tree.children));

  return (
    <div className="fb-browser">
      {/* Header */}
      <div className="fb-header">
        <div className="fb-branch-selector">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="fb-branch-select"
            aria-label="Select branch"
          >
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Breadcrumb */}
        <div className="fb-breadcrumb">
          <span className="fb-breadcrumb-item fb-breadcrumb-root">root</span>
          {breadcrumbParts.map((part, i) => (
            <span key={i}>
              <span className="fb-breadcrumb-sep">/</span>
              <span className="fb-breadcrumb-item">{part}</span>
            </span>
          ))}
        </div>

        <div className="fb-search">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fb-search-input"
            aria-label="Search files"
          />
        </div>
      </div>

      <div className="fb-body">
        {/* Tree */}
        <div className="fb-tree">
          {filteredEntries ? (
            filteredEntries.length === 0 ? (
              <div className="fb-empty">No files match &quot;{searchQuery}&quot;</div>
            ) : (
              filteredEntries.map((entry) => (
                <button
                  key={entry.fullPath}
                  className={`fb-tree-row ${entry.isDir ? "fb-tree-dir" : "fb-tree-file"}`}
                  onClick={() => entry.isDir ? toggleDir(entry.fullPath) : handleFileClick(entry)}
                >
                  <span className="fb-tree-icon">{getFileIcon(entry.name, entry.isDir)}</span>
                  <span className="fb-tree-name">{entry.fullPath}</span>
                </button>
              ))
            )
          ) : rootEntries.length === 0 ? (
            <div className="fb-empty">
              <p>No files in this repository yet.</p>
            </div>
          ) : (
            rootEntries.map((node) => (
              <TreeNode
                key={node.fullPath}
                node={node}
                depth={0}
                onFileClick={handleFileClick}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
              />
            ))
          )}
        </div>

        {/* File Preview */}
        {selectedFile && (
          <div className="fb-preview">
            <div className="fb-preview-header">
              <span className="fb-preview-name">{selectedFile.fullPath}</span>
              {selectedFile.size != null && <span className="fb-preview-size">{formatFileSize(selectedFile.size)}</span>}
              <button
                className="fb-preview-close"
                onClick={() => { setSelectedFile(null); setFileContent(null); }}
                aria-label="Close preview"
              >
                &times;
              </button>
            </div>
            <div className="fb-preview-body">
              {loadingFile ? (
                <div className="fb-preview-loading"><div className="spinner" /></div>
              ) : (
                <pre className="fb-preview-content">{typeof fileContent === "string" ? fileContent : JSON.stringify(fileContent, null, 2)}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

FileBrowser.propTypes = {
  files: PropTypes.array,
  repoId: PropTypes.string,
  currentPath: PropTypes.string,
};

export default FileBrowser;
