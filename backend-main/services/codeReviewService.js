'use strict';

const fs = require("fs").promises;
const path = require("path");
const CodeReview = require("../models/CodeReview");
const PullRequest = require("../models/pullRequestModel");
const Repository = require("../models/repoModel");
const { AppError } = require("../middleware/errorHandler");

/**
 * Myers diff algorithm — computes the shortest edit script (SES) between two
 * arrays of lines.  Returns an array of { type, value } where type is one of
 * "equal", "insert", or "delete".
 *
 * Reference: Eugene W. Myers, "An O(ND) Difference Algorithm and Its
 * Variations", Algorithmica 1(2), 1986.
 */
function myersDiff(oldLines, newLines) {
  const N = oldLines.length;
  const M = newLines.length;
  const MAX = N + M;

  if (MAX === 0) return [];

  // V stores the furthest-reaching endpoint on each k-diagonal
  const V = new Int32Array(2 * MAX + 1);
  const offset = MAX; // shift so negative indices work
  V[offset + 1] = 0;

  // Record the V snapshot for each D so we can back-track
  const trace = [];

  let found = false;
  for (let D = 0; D <= MAX && !found; D++) {
    trace.push(V.slice()); // snapshot
    for (let k = -D; k <= D; k += 2) {
      let x;
      if (k === -D || (k !== D && V[offset + k - 1] < V[offset + k + 1])) {
        x = V[offset + k + 1]; // move down
      } else {
        x = V[offset + k - 1] + 1; // move right
      }
      let y = x - k;

      // Follow diagonal (equal lines)
      while (x < N && y < M && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }

      V[offset + k] = x;

      if (x >= N && y >= M) {
        found = true;
        break;
      }
    }
  }

  // Back-track through the trace to recover the edit path
  const edits = [];
  let x = N;
  let y = M;

  for (let D = trace.length - 1; D >= 0; D--) {
    const Vprev = trace[D];
    const k = x - y;

    let prevK;
    if (k === -D || (k !== D && Vprev[offset + k - 1] < Vprev[offset + k + 1])) {
      prevK = k + 1; // came from a down move (insert)
    } else {
      prevK = k - 1; // came from a right move (delete)
    }

    const prevX = Vprev[offset + prevK];
    const prevY = prevX - prevK;

    // Diagonal moves (equal lines) from (prevX, prevY) to the move start
    while (x > prevX && y > prevY) {
      x--;
      y--;
      edits.push({ type: "equal", value: oldLines[x] });
    }

    if (D > 0) {
      if (x === prevX) {
        // Down move → insert
        y--;
        edits.push({ type: "insert", value: newLines[y] });
      } else {
        // Right move → delete
        x--;
        edits.push({ type: "delete", value: oldLines[x] });
      }
    }
  }

  edits.reverse();
  return edits;
}

class CodeReviewService {
  /**
   * Build a unified diff between two branch tips by reading
   * the .gitforge filesystem that backs this repository.
   */
  async _buildDiffFromBranches(repoPath, sourceBranch, targetBranch) {
    const commitsPath = path.join(repoPath, "commits");
    const branchesPath = path.join(repoPath, "branches");

    const readBranchTip = async (branch) => {
      try {
        const data = JSON.parse(
          await fs.readFile(path.join(branchesPath, `${branch}.json`), "utf-8")
        );
        return data.commitId || null;
      } catch {
        return null;
      }
    };

    const readCommitFiles = async (commitId) => {
      if (!commitId) return {};
      const commitDir = path.join(commitsPath, commitId);
      const entries = await fs.readdir(commitDir).catch(() => []);
      const files = {};
      for (const name of entries) {
        if (name === "commit.json") continue;
        files[name] = await fs.readFile(path.join(commitDir, name), "utf-8");
      }
      return files;
    };

    const sourceCommit = await readBranchTip(sourceBranch);
    const targetCommit = await readBranchTip(targetBranch);

    const sourceFiles = await readCommitFiles(sourceCommit);
    const targetFiles = await readCommitFiles(targetCommit);

    const allFileNames = new Set([
      ...Object.keys(sourceFiles),
      ...Object.keys(targetFiles),
    ]);

    const diffParts = [];
    const changedFiles = [];

    for (const filename of allFileNames) {
      const oldContent = targetFiles[filename] || "";
      const newContent = sourceFiles[filename] || "";
      if (oldContent === newContent) continue;

      changedFiles.push(filename);
      const oldLines = oldContent ? oldContent.split("\n") : [];
      const newLines = newContent ? newContent.split("\n") : [];

      diffParts.push(`diff --git a/${filename} b/${filename}`);
      diffParts.push(`--- a/${filename}`);
      diffParts.push(`+++ b/${filename}`);

      // Myers diff algorithm — produces minimal edit script
      const editScript = myersDiff(oldLines, newLines);
      const hunkLines = [];
      for (const op of editScript) {
        if (op.type === "equal") {
          hunkLines.push(` ${op.value}`);
        } else if (op.type === "delete") {
          hunkLines.push(`-${op.value}`);
        } else if (op.type === "insert") {
          hunkLines.push(`+${op.value}`);
        }
      }

      diffParts.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
      diffParts.push(...hunkLines);
    }

    return { diff: diffParts.join("\n"), files: changedFiles };
  }

  async create({ pullRequest: prId, repository: repoId }) {
    const pr = await PullRequest.findById(prId);
    if (!pr) throw new AppError("Pull request not found.", 404);

    const repo = await Repository.findById(repoId);
    if (!repo) throw new AppError("Repository not found.", 404);

    const review = await CodeReview.create({
      pullRequest: prId,
      repository: repoId,
      reviewer: "ai",
      status: "in_progress",
    });

    const startTime = Date.now();

    // Try to build a real diff from the .gitforge filesystem
    const repoPath = path.resolve(process.cwd(), ".gitforge");
    let diff;
    let files;

    try {
      const result = await this._buildDiffFromBranches(
        repoPath,
        pr.sourceBranch,
        pr.targetBranch
      );
      diff = result.diff;
      files = result.files;
    } catch {
      // Fallback: empty diff when .gitforge is unavailable
      diff = "";
      files = [];
    }

    const analysis = this.analyzeCode(diff, files);
    const analysisTime = Date.now() - startTime;

    review.status = "completed";
    review.summary = analysis.summary;
    review.score = analysis.score;
    review.suggestions = analysis.suggestions;
    review.metrics = analysis.metrics;
    review.analysisTime = analysisTime;
    review.diff = diff;

    await review.save();
    return review;
  }

  async listByPR(prId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      CodeReview.find({ pullRequest: prId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CodeReview.countDocuments({ pullRequest: prId }),
    ]);
    return { reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const review = await CodeReview.findById(id)
      .populate("pullRequest", "title status")
      .populate("repository", "name owner");

    if (!review) throw new AppError("Code review not found.", 404);
    return review;
  }

  analyzeCode(diff, files) {
    const suggestions = [];
    const lines = diff.split("\n");
    let linesAnalyzed = 0;
    let currentFile = "";
    let lineNumber = 0;

    const securityPatterns = [
      { regex: /eval\s*\(/, title: "Unsafe eval() usage", description: "eval() can execute arbitrary code and is a major security risk. Use safer alternatives like JSON.parse() or Function constructors with validation.", severity: "critical", category: "security" },
      { regex: /innerHTML\s*=/, title: "Potential XSS via innerHTML", description: "Setting innerHTML with user input can lead to Cross-Site Scripting (XSS). Use textContent or a sanitization library.", severity: "critical", category: "security" },
      { regex: /(\$\{.*\}.*SELECT|SELECT.*\+\s*\w+|query\s*\(\s*[`"'].*\$\{)/, title: "Potential SQL injection", description: "String interpolation in SQL queries can lead to SQL injection. Use parameterized queries.", severity: "critical", category: "security" },
      { regex: /(password|secret|api_key|apikey|token)\s*=\s*["'][^"']+["']/, title: "Hardcoded secret detected", description: "Secrets should not be hardcoded. Use environment variables or a secrets manager.", severity: "critical", category: "security" },
      { regex: /document\.write\s*\(/, title: "Unsafe document.write()", description: "document.write() can overwrite the entire document and is a security risk.", severity: "warning", category: "security" },
    ];

    const performancePatterns = [
      { regex: /for\s*\(.*\)\s*\{[\s\S]*?for\s*\(/, title: "Nested loop detected", description: "Nested loops can cause O(n^2) or worse time complexity. Consider using a Map or Set for lookups.", severity: "warning", category: "performance" },
      { regex: /\.forEach\([\s\S]*?\.find\(/, title: "Potential N+1 query pattern", description: "Calling find() inside a loop may result in N+1 queries. Use batch queries or populate.", severity: "warning", category: "performance" },
      { regex: /await\s+\w+.*\n.*await\s+\w+/, title: "Sequential awaits", description: "Sequential awaits can be slow. Use Promise.all() when operations are independent.", severity: "info", category: "performance" },
    ];

    const stylePatterns = [
      { regex: /var\s+/, title: "Use of 'var' keyword", description: "Prefer 'const' or 'let' over 'var' for better scoping.", severity: "style", category: "style" },
      { regex: /==(?!=)/, title: "Loose equality operator", description: "Use strict equality (===) to avoid type coercion bugs.", severity: "style", category: "best-practice" },
      { regex: /console\.(log|debug|info)\(/, title: "Console statement in production code", description: "Remove or replace console statements with a proper logging library.", severity: "info", category: "best-practice" },
    ];

    const allPatterns = [...securityPatterns, ...performancePatterns, ...stylePatterns];

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/b\/(.+)$/);
        if (match) currentFile = match[1];
        lineNumber = 0;
        continue;
      }

      if (line.startsWith("@@")) {
        const match = line.match(/\+(\d+)/);
        if (match) lineNumber = parseInt(match[1], 10) - 1;
        continue;
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        lineNumber++;
        linesAnalyzed++;
        const code = line.substring(1);

        for (const pattern of allPatterns) {
          if (pattern.regex.test(code)) {
            suggestions.push({
              file: currentFile,
              line: lineNumber,
              endLine: lineNumber,
              severity: pattern.severity,
              category: pattern.category,
              title: pattern.title,
              description: pattern.description,
              suggestedFix: "",
              accepted: null,
              language: this._detectLanguageFromFile(currentFile),
            });
          }
        }
      } else if (!line.startsWith("-")) {
        lineNumber++;
      }
    }

    const criticalIssues = suggestions.filter((s) => s.severity === "critical").length;
    const issuesFound = suggestions.length;

    let score = 100;
    score -= criticalIssues * 15;
    score -= suggestions.filter((s) => s.severity === "warning").length * 8;
    score -= suggestions.filter((s) => s.severity === "info").length * 3;
    score -= suggestions.filter((s) => s.severity === "style").length * 1;
    score = Math.max(0, Math.min(100, score));

    const summary = issuesFound === 0
      ? "Code looks clean. No issues detected."
      : `Found ${issuesFound} issue(s): ${criticalIssues} critical, ${suggestions.filter((s) => s.severity === "warning").length} warnings. Score: ${score}/100.`;

    return {
      summary,
      score,
      suggestions,
      metrics: {
        linesAnalyzed,
        filesAnalyzed: files.length,
        issuesFound,
        criticalIssues,
        estimatedDebt: issuesFound * 15,
        complexityScore: Math.min(100, linesAnalyzed / 2),
        duplicateBlocks: 0,
        testCoverage: null,
      },
    };
  }

  _detectLanguageFromFile(filename) {
    if (!filename) return "unknown";
    const ext = filename.split(".").pop().toLowerCase();
    const map = {
      js: "JavaScript", ts: "TypeScript", py: "Python", rb: "Ruby",
      java: "Java", go: "Go", rs: "Rust", cpp: "C++", c: "C",
      cs: "C#", php: "PHP", swift: "Swift", kt: "Kotlin",
    };
    return map[ext] || "unknown";
  }

  async acceptSuggestion(reviewId, suggestionIndex) {
    const review = await CodeReview.findById(reviewId);
    if (!review) throw new AppError("Code review not found.", 404);

    if (!review.suggestions[suggestionIndex]) {
      throw new AppError("Suggestion not found.", 404);
    }

    review.suggestions[suggestionIndex].accepted = true;
    await review.save();
    return review;
  }

  async rejectSuggestion(reviewId, suggestionIndex) {
    const review = await CodeReview.findById(reviewId);
    if (!review) throw new AppError("Code review not found.", 404);

    if (!review.suggestions[suggestionIndex]) {
      throw new AppError("Suggestion not found.", 404);
    }

    review.suggestions[suggestionIndex].accepted = false;
    await review.save();
    return review;
  }

  async getStats(repoId) {
    const reviews = await CodeReview.find({ repository: repoId, status: "completed" }).lean();

    if (reviews.length === 0) {
      return { totalReviews: 0, averageScore: 0, totalIssues: 0, criticalIssues: 0, averageAnalysisTime: 0 };
    }

    const totalReviews = reviews.length;
    const totalScore = reviews.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalIssues = reviews.reduce((sum, r) => sum + (r.metrics?.issuesFound || 0), 0);
    const criticalIssues = reviews.reduce((sum, r) => sum + (r.metrics?.criticalIssues || 0), 0);
    const totalTime = reviews.reduce((sum, r) => sum + (r.analysisTime || 0), 0);

    return {
      totalReviews,
      averageScore: Math.round(totalScore / totalReviews),
      totalIssues,
      criticalIssues,
      averageAnalysisTime: Math.round(totalTime / totalReviews),
    };
  }
}

module.exports = new CodeReviewService();
