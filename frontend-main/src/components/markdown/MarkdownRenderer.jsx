import { useMemo } from "react";
import "./markdown-renderer.css";

/**
 * Sanitize HTML: remove script tags, event handlers, and dangerous attributes.
 */
function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>/gi, "")
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\bon\w+\s*=\s*\S+/gi, "")
    .replace(/javascript\s*:/gi, "");
}

/**
 * Basic syntax keyword highlighting for code blocks.
 */
function highlightCode(code, language) {
  const keywords = [
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
    "switch", "case", "break", "continue", "class", "extends", "import", "export",
    "default", "from", "new", "this", "try", "catch", "finally", "throw", "async",
    "await", "yield", "typeof", "instanceof", "in", "of", "null", "undefined",
    "true", "false", "void", "delete", "static", "super", "with",
    "def", "self", "elif", "pass", "raise", "except", "lambda", "print",
    "fn", "pub", "mod", "use", "impl", "struct", "enum", "trait", "match",
    "func", "package", "go", "defer", "chan", "select", "range", "map",
  ];

  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Strings
  escaped = escaped.replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, '<span class="md-hl-string">$&</span>');

  // Comments (single line)
  escaped = escaped.replace(/(\/\/.*$|#.*$)/gm, '<span class="md-hl-comment">$&</span>');

  // Numbers
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="md-hl-number">$1</span>');

  // Keywords
  const kwRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
  escaped = escaped.replace(kwRegex, '<span class="md-hl-keyword">$1</span>');

  return escaped;
}

/**
 * Parse markdown to HTML.
 */
function parseMarkdown(content) {
  if (!content) return "";

  let html = content;

  // Normalize line endings
  html = html.replace(/\r\n/g, "\n");

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted = highlightCode(code.trimEnd(), lang);
    const langLabel = lang ? `<span class="md-code-lang">${lang}</span>` : "";
    return `<div class="md-code-block">${langLabel}<pre><code>${highlighted}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');

  // Images (before links so ![](url) is not caught by link regex)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" loading="lazy" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Auto-link URLs
  html = html.replace(/(?<!["\(href=])(https?:\/\/[^\s<]+)/g, '<a href="$1" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Horizontal rules
  html = html.replace(/^\s*[-*_]{3,}\s*$/gm, '<hr class="md-hr" />');

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="md-h6">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="md-h5">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Bold, italic, strikethrough
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');
  // Merge adjacent blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote class="md-blockquote">/g, "\n");

  // Task lists
  html = html.replace(/^(\s*)- \[x\]\s+(.+)$/gm, '$1<div class="md-task md-task-checked"><input type="checkbox" checked disabled /> $2</div>');
  html = html.replace(/^(\s*)- \[\s?\]\s+(.+)$/gm, '$1<div class="md-task"><input type="checkbox" disabled /> $2</div>');

  // Unordered lists
  html = html.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_, indent, text) => {
    return `<li class="md-li" style="margin-left:${indent.length * 16}px">${text}</li>`;
  });
  // Wrap adjacent <li> elements in <ul>
  html = html.replace(/((?:<li class="md-li"[^>]*>.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');

  // Ordered lists
  html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, (_, indent, text) => {
    return `<li class="md-oli" style="margin-left:${indent.length * 16}px">${text}</li>`;
  });
  html = html.replace(/((?:<li class="md-oli"[^>]*>.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/gm, (_, headerRow, _sep, bodyRows) => {
    const headers = headerRow.split("|").filter(Boolean).map((h) => `<th>${h.trim()}</th>`).join("");
    const rows = bodyRows.trim().split("\n").map((row) => {
      const cells = row.split("|").filter(Boolean).map((c) => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table class="md-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Paragraphs: wrap remaining lines not already in block elements
  html = html.replace(/^(?!<[a-z/]|$)(.+)$/gm, "<p>$1</p>");

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  return sanitizeHtml(html);
}

// eslint-disable-next-line react/prop-types
const MarkdownRenderer = ({ content = "", className = "" }) => {
  const rendered = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={`md-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

export default MarkdownRenderer;
