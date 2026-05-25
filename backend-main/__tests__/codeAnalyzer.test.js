const codeReviewService = require("../services/codeReviewService");

// pure-function tests for the static-analysis engine. no DB, no http -- just
// hand-built diffs run through analyzeCode() and assertions on what it flags.

const makeDiff = (filename, addedLines) => {
  const body = addedLines.map((l) => `+${l}`).join("\n");
  return [
    `diff --git a/${filename} b/${filename}`,
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -0,0 +1,${addedLines.length} @@`,
    body,
  ].join("\n");
};

const findByCategory = (suggestions, category) =>
  suggestions.filter((s) => s.category === category);

describe("Static-analysis engine (analyzeCode)", () => {
  it("flags eval() as a critical security issue", () => {
    const diff = makeDiff("foo.js", ["const x = eval(userInput);"]);
    const result = codeReviewService.analyzeCode(diff, ["foo.js"]);

    const sec = findByCategory(result.suggestions, "security");
    expect(sec.length).toBeGreaterThan(0);

    const evalHit = sec.find((s) => /eval/i.test(s.title));
    expect(evalHit).toBeDefined();
    expect(evalHit.severity).toBe("critical");
    expect(evalHit.file).toBe("foo.js");
  });

  it("flags innerHTML assignment as a critical XSS risk", () => {
    const diff = makeDiff("widget.js", ["el.innerHTML = req.body.payload;"]);
    const result = codeReviewService.analyzeCode(diff, ["widget.js"]);

    const xssHit = result.suggestions.find((s) => /innerHTML|XSS/i.test(s.title));
    expect(xssHit).toBeDefined();
    expect(xssHit.severity).toBe("critical");
    expect(xssHit.category).toBe("security");
  });

  it("flags hardcoded secrets", () => {
    const diff = makeDiff("config.js", ['const api_key = "sk-live-abc123xyz";']);
    const result = codeReviewService.analyzeCode(diff, ["config.js"]);

    const secret = result.suggestions.find((s) => /secret|hardcoded/i.test(s.title));
    expect(secret).toBeDefined();
    expect(secret.severity).toBe("critical");
  });

  it("flags var keyword as a style issue", () => {
    const diff = makeDiff("legacy.js", ["var count = 0;"]);
    const result = codeReviewService.analyzeCode(diff, ["legacy.js"]);

    const styleHit = result.suggestions.find((s) => /var/i.test(s.title));
    expect(styleHit).toBeDefined();
    expect(styleHit.severity).toBe("style");
  });

  it("flags loose equality (==) as a best-practice issue", () => {
    const diff = makeDiff("compare.js", ["if (a == b) return true;"]);
    const result = codeReviewService.analyzeCode(diff, ["compare.js"]);

    const eqHit = result.suggestions.find((s) => /equality|==/i.test(s.title));
    expect(eqHit).toBeDefined();
    expect(eqHit.category).toBe("best-practice");
  });

  it("flags console statements in added code", () => {
    const diff = makeDiff("debug.js", ['console.log("debugging", value);']);
    const result = codeReviewService.analyzeCode(diff, ["debug.js"]);

    const consoleHit = result.suggestions.find((s) => /console/i.test(s.title));
    expect(consoleHit).toBeDefined();
  });

  it("ignores patterns that only appear in removed lines", () => {
    // a removed eval() shouldn't trigger -- only added (`+`) lines are scanned
    const diff = [
      "diff --git a/foo.js b/foo.js",
      "--- a/foo.js",
      "+++ b/foo.js",
      "@@ -1,1 +1,1 @@",
      "-const x = eval(userInput);",
      "+const x = JSON.parse(userInput);",
    ].join("\n");
    const result = codeReviewService.analyzeCode(diff, ["foo.js"]);

    expect(result.suggestions.find((s) => /eval/i.test(s.title))).toBeUndefined();
  });

  it("returns a clean summary and full score when nothing is flagged", () => {
    const diff = makeDiff("util.js", ["const total = items.reduce((a, b) => a + b, 0);"]);
    const result = codeReviewService.analyzeCode(diff, ["util.js"]);

    expect(result.suggestions).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.summary).toMatch(/clean|no issues/i);
  });

  it("docks score per finding by severity", () => {
    // one critical + one style should score 100 - 15 - 1 = 84
    const diff = makeDiff("mix.js", [
      "var token = eval(input);",
    ]);
    const result = codeReviewService.analyzeCode(diff, ["mix.js"]);

    expect(result.score).toBeLessThan(100);
    expect(result.metrics.criticalIssues).toBeGreaterThan(0);
    expect(result.metrics.issuesFound).toBe(result.suggestions.length);
  });

  it("attaches the correct file path to each suggestion across multi-file diffs", () => {
    const diff = [
      makeDiff("a.js", ["eval(x);"]),
      makeDiff("b.js", ["var y = 1;"]),
    ].join("\n");
    const result = codeReviewService.analyzeCode(diff, ["a.js", "b.js"]);

    const evalHit = result.suggestions.find((s) => /eval/i.test(s.title));
    const varHit = result.suggestions.find((s) => /var/i.test(s.title));

    expect(evalHit?.file).toBe("a.js");
    expect(varHit?.file).toBe("b.js");
  });
});
