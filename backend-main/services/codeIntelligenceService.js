'use strict';

const CodeIntelligence = require("../models/CodeIntelligence");
const Repository = require("../models/repoModel");
const { AppError } = require("../middleware/errorHandler");

const LANGUAGE_EXTENSIONS = {
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  ts: "TypeScript", tsx: "TypeScript",
  py: "Python", pyw: "Python", pyi: "Python",
  rb: "Ruby", erb: "Ruby",
  java: "Java",
  go: "Go",
  rs: "Rust",
  c: "C", h: "C",
  cpp: "C++", cc: "C++", cxx: "C++", hpp: "C++", hh: "C++",
  cs: "C#", csx: "C#",
  php: "PHP", phtml: "PHP",
  swift: "Swift",
  kt: "Kotlin", kts: "Kotlin",
  scala: "Scala", sc: "Scala",
  r: "R", R: "R",
  m: "Objective-C", mm: "Objective-C",
  dart: "Dart",
  lua: "Lua",
  pl: "Perl", pm: "Perl",
  sh: "Shell", bash: "Shell", zsh: "Shell",
  ps1: "PowerShell", psm1: "PowerShell",
  sql: "SQL",
  html: "HTML", htm: "HTML",
  css: "CSS",
  scss: "SCSS", sass: "SASS", less: "Less",
  json: "JSON",
  xml: "XML", xsl: "XML",
  yaml: "YAML", yml: "YAML",
  toml: "TOML",
  md: "Markdown", mdx: "Markdown",
  vue: "Vue",
  svelte: "Svelte",
  ex: "Elixir", exs: "Elixir",
  erl: "Erlang", hrl: "Erlang",
  hs: "Haskell", lhs: "Haskell",
  clj: "Clojure", cljs: "Clojure", cljc: "Clojure",
  fs: "F#", fsx: "F#",
  jl: "Julia",
  nim: "Nim",
  zig: "Zig",
  v: "V",
  groovy: "Groovy",
  tf: "HCL", hcl: "HCL",
  proto: "Protocol Buffers",
  graphql: "GraphQL", gql: "GraphQL",
  sol: "Solidity",
  dockerfile: "Dockerfile",
  makefile: "Makefile",
};

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Ruby: "#701516",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Scala: "#c22d40",
  R: "#198CE7",
  "Objective-C": "#438eff",
  Dart: "#00B4AB",
  Lua: "#000080",
  Perl: "#0298c3",
  Shell: "#89e051",
  PowerShell: "#012456",
  SQL: "#e38c00",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  SASS: "#a53b70",
  Less: "#1d365d",
  JSON: "#292929",
  XML: "#0060ac",
  YAML: "#cb171e",
  TOML: "#9c4221",
  Markdown: "#083fa1",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Erlang: "#B83998",
  Haskell: "#5e5086",
  Clojure: "#db5855",
  "F#": "#b845fc",
  Julia: "#a270ba",
  Nim: "#ffc200",
  Zig: "#ec915c",
  V: "#4f87c4",
  Groovy: "#4298b8",
  HCL: "#844FBA",
  "Protocol Buffers": "#6e4c13",
  GraphQL: "#e10098",
  Solidity: "#AA6746",
  Dockerfile: "#384d54",
  Makefile: "#427819",
};

class CodeIntelligenceService {
  async analyzeRepository(repoId) {
    const repo = await Repository.findById(repoId);
    if (!repo) throw new AppError("Repository not found.", 404);

    // Simulate analysis from repo content
    const content = repo.content || [];
    const languageMap = {};
    let totalSize = 0;
    let totalFiles = 0;

    for (const item of content) {
      totalFiles++;
      const size = Buffer.byteLength(item, "utf8");
      totalSize += size;

      // Try to detect language from content patterns
      const detectedLangs = this._detectFromContent(item);
      for (const lang of detectedLangs) {
        if (!languageMap[lang]) languageMap[lang] = 0;
        languageMap[lang] += size;
      }
    }

    // If no content, provide reasonable defaults
    if (totalFiles === 0) {
      totalFiles = 1;
      totalSize = 1024;
      languageMap["JavaScript"] = 1024;
    }

    const languages = Object.entries(languageMap).map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / totalSize) * 100 * 100) / 100,
      color: this.getLanguageColor(name),
    }));

    languages.sort((a, b) => b.bytes - a.bytes);

    // Detect dependencies
    const dependencies = this._detectDependencies(content);

    const intel = await CodeIntelligence.findOneAndUpdate(
      { repository: repoId },
      {
        repository: repoId,
        branch: "main",
        languages,
        totalSize,
        totalFiles,
        dependencies,
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return intel;
  }

  async getLanguageBreakdown(repoId) {
    const intel = await CodeIntelligence.findOne({ repository: repoId })
      .sort({ analyzedAt: -1 });

    if (!intel) throw new AppError("No analysis found for this repository. Run analysis first.", 404);
    return intel.languages;
  }

  async getDependencyGraph(repoId) {
    const intel = await CodeIntelligence.findOne({ repository: repoId })
      .sort({ analyzedAt: -1 });

    if (!intel) throw new AppError("No analysis found for this repository. Run analysis first.", 404);

    const production = intel.dependencies.filter((d) => d.type === "production");
    const dev = intel.dependencies.filter((d) => d.type === "dev");

    return {
      total: intel.dependencies.length,
      production: { count: production.length, packages: production },
      dev: { count: dev.length, packages: dev },
    };
  }

  detectLanguage(filename) {
    if (!filename) return "Unknown";

    const lower = filename.toLowerCase();

    // Handle special filenames
    if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "Dockerfile";
    if (lower === "makefile" || lower === "gnumakefile") return "Makefile";

    const ext = lower.split(".").pop();
    return LANGUAGE_EXTENSIONS[ext] || "Unknown";
  }

  getLanguageColor(language) {
    return LANGUAGE_COLORS[language] || "#cccccc";
  }

  calculateComplexity(code) {
    if (!code || typeof code !== "string") return { complexity: 0, grade: "A" };

    let complexity = 1; // Base complexity

    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*/g, // ternary
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    }

    let grade;
    if (complexity <= 5) grade = "A";
    else if (complexity <= 10) grade = "B";
    else if (complexity <= 20) grade = "C";
    else if (complexity <= 50) grade = "D";
    else grade = "F";

    return { complexity, grade };
  }

  _detectFromContent(content) {
    const languages = [];

    if (/\bfunction\b.*\{|\bconst\b|\blet\b|\bvar\b|\brequire\s*\(/.test(content)) {
      languages.push("JavaScript");
    }
    if (/\binterface\b|\btype\b.*=|\b:\s*(string|number|boolean)\b/.test(content)) {
      languages.push("TypeScript");
    }
    if (/\bdef\b|\bimport\b.*\bfrom\b|\bclass\b.*:\s*$/.test(content)) {
      languages.push("Python");
    }
    if (/\bpackage\b|\bfunc\b.*\{|\bfmt\./.test(content)) {
      languages.push("Go");
    }

    if (languages.length === 0) languages.push("Unknown");
    return languages;
  }

  _detectDependencies(contentArr) {
    const deps = [];

    for (const content of contentArr) {
      // Detect package.json-style
      try {
        const parsed = JSON.parse(content);
        if (parsed.dependencies) {
          for (const [name, version] of Object.entries(parsed.dependencies)) {
            deps.push({ name, version, type: "production" });
          }
        }
        if (parsed.devDependencies) {
          for (const [name, version] of Object.entries(parsed.devDependencies)) {
            deps.push({ name, version, type: "dev" });
          }
        }
      } catch {
        // Not JSON, try other patterns
        const requireMatches = content.matchAll(/require\s*\(\s*["']([^./][^"']+)["']\s*\)/g);
        for (const match of requireMatches) {
          const name = match[1].split("/")[0];
          if (!deps.some((d) => d.name === name)) {
            deps.push({ name, version: "*", type: "production" });
          }
        }

        const importMatches = content.matchAll(/import\s+.*\s+from\s+["']([^./][^"']+)["']/g);
        for (const match of importMatches) {
          const name = match[1].split("/")[0];
          if (!deps.some((d) => d.name === name)) {
            deps.push({ name, version: "*", type: "production" });
          }
        }
      }
    }

    return deps;
  }
}

module.exports = new CodeIntelligenceService();
