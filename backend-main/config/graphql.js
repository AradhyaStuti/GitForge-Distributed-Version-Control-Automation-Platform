const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const PullRequest = require("../models/pullRequestModel");
const Pipeline = require("../models/Pipeline");
const CodeReview = require("../models/CodeReview");
const ProjectBoard = require("../models/ProjectBoard");

// ── Type Definitions ─────────────────────────────────────────────────────────

const typeDefs = `
  type User { id: ID!, username: String!, email: String, repositories: [Repository], followers: Int, following: Int, createdAt: String }
  type Repository { id: ID!, name: String!, description: String, owner: User, visibility: String, stars: Int, forks: Int, issues: [Issue], pullRequests: [PullRequest], pipelines: [Pipeline], createdAt: String }
  type Issue { id: ID!, title: String!, description: String, status: String, author: User, repository: Repository, labels: [String], createdAt: String }
  type PullRequest { id: ID!, title: String!, description: String, status: String, sourceBranch: String, targetBranch: String, author: User, reviews: [CodeReview], createdAt: String }
  type Pipeline { id: ID!, name: String!, status: String, runs: [PipelineRun], successRate: Float, totalRuns: Int }
  type PipelineRun { runNumber: Int!, status: String!, trigger: String, branch: String, duration: Int, startedAt: String, completedAt: String }
  type CodeReview { id: ID!, status: String, score: Int, summary: String, suggestions: [Suggestion], createdAt: String }
  type Suggestion { file: String, line: Int, severity: String, category: String, title: String, description: String }
  type ProjectBoard { id: ID!, name: String!, columns: [Column], createdAt: String }
  type Column { id: String!, name: String!, cards: [Card], position: Int }
  type Card { id: String!, title: String!, type: String, priority: String, assignees: [User] }
  type Analytics { totalUsers: Int, totalRepos: Int, totalIssues: Int, totalPRs: Int, trending: [Repository] }

  type Query {
    user(id: ID, username: String): User
    repository(id: ID, name: String, owner: String): Repository
    repositories(limit: Int, offset: Int, sort: String): [Repository]
    issues(repoId: ID, status: String, limit: Int): [Issue]
    pullRequests(repoId: ID, status: String, limit: Int): [PullRequest]
    pipelines(repoId: ID): [Pipeline]
    boards(repoId: ID): [ProjectBoard]
    analytics: Analytics
    search(query: String!, type: String): SearchResult
  }

  type SearchResult { repositories: [Repository], issues: [Issue], users: [User] }
`;

// ── Resolvers ────────────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    async user(_parent, args) {
      if (args.id) return User.findById(args.id).select("-password");
      if (args.username) return User.findOne({ username: args.username }).select("-password");
      return null;
    },

    async repository(_parent, args) {
      if (args.id) return Repository.findById(args.id).populate("owner", "-password");
      if (args.name && args.owner) {
        const ownerDoc = await User.findOne({ username: args.owner });
        if (!ownerDoc) return null;
        return Repository.findOne({ name: args.name, owner: ownerDoc._id }).populate("owner", "-password");
      }
      return null;
    },

    async repositories(_parent, args) {
      const limit = Math.min(args.limit || 20, 100);
      const offset = args.offset || 0;
      const sort = args.sort === "stars" ? { "starRepos.length": -1 } : { createdAt: -1 };
      return Repository.find({ visibility: true })
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .populate("owner", "-password");
    },

    async issues(_parent, args) {
      const filter = {};
      if (args.repoId) filter.repository = args.repoId;
      if (args.status) filter.status = args.status;
      const limit = Math.min(args.limit || 20, 100);
      return Issue.find(filter).sort({ createdAt: -1 }).limit(limit).populate("author", "-password");
    },

    async pullRequests(_parent, args) {
      const filter = {};
      if (args.repoId) filter.repository = args.repoId;
      if (args.status) filter.status = args.status;
      const limit = Math.min(args.limit || 20, 100);
      return PullRequest.find(filter).sort({ createdAt: -1 }).limit(limit).populate("author", "-password");
    },

    async pipelines(_parent, args) {
      const filter = {};
      if (args.repoId) filter.repository = args.repoId;
      return Pipeline.find(filter).sort({ createdAt: -1 });
    },

    async boards(_parent, args) {
      const filter = {};
      if (args.repoId) filter.repository = args.repoId;
      return ProjectBoard.find(filter).sort({ createdAt: -1 });
    },

    async analytics() {
      const [totalUsers, totalRepos, totalIssues, totalPRs, trending] = await Promise.all([
        User.countDocuments(),
        Repository.countDocuments(),
        Issue.countDocuments(),
        PullRequest.countDocuments(),
        Repository.find({ visibility: true }).sort({ createdAt: -1 }).limit(10).populate("owner", "-password"),
      ]);
      return { totalUsers, totalRepos, totalIssues, totalPRs, trending };
    },

    async search(_parent, args) {
      const q = args.query;
      const result = { repositories: [], issues: [], users: [] };
      const searchType = args.type || "all";

      if (searchType === "all" || searchType === "repository") {
        result.repositories = await Repository.find(
          { $text: { $search: q }, visibility: true }
        ).limit(20).populate("owner", "-password");
      }
      if (searchType === "all" || searchType === "issue") {
        result.issues = await Issue.find(
          { $text: { $search: q } }
        ).limit(20).populate("author", "-password");
      }
      if (searchType === "all" || searchType === "user") {
        result.users = await User.find(
          { $text: { $search: q } }
        ).limit(20).select("-password");
      }

      return result;
    },
  },

  // Field-level resolvers for nested types
  User: {
    id: (user) => user._id || user.id,
    repositories: (user) => Repository.find({ owner: user._id || user.id }),
    followers: (user) => User.countDocuments({ followedUsers: user._id || user.id }),
    following: (user) => (user.followedUsers ? user.followedUsers.length : 0),
    createdAt: (user) => user.createdAt ? user.createdAt.toISOString() : null,
  },

  Repository: {
    id: (repo) => repo._id || repo.id,
    owner: (repo) => {
      if (repo.owner && repo.owner.username) return repo.owner;
      return User.findById(repo.owner).select("-password");
    },
    visibility: (repo) => (repo.visibility ? "public" : "private"),
    stars: () => 0,
    forks: (repo) => Repository.countDocuments({ forkedFrom: repo._id || repo.id }),
    issues: (repo) => Issue.find({ repository: repo._id || repo.id }),
    pullRequests: (repo) => PullRequest.find({ repository: repo._id || repo.id }),
    pipelines: (repo) => Pipeline.find({ repository: repo._id || repo.id }),
    createdAt: (repo) => repo.createdAt ? repo.createdAt.toISOString() : null,
  },

  Issue: {
    id: (issue) => issue._id || issue.id,
    author: (issue) => {
      if (issue.author && issue.author.username) return issue.author;
      return User.findById(issue.author).select("-password");
    },
    repository: (issue) => Repository.findById(issue.repository),
    labels: () => [],
    createdAt: (issue) => issue.createdAt ? issue.createdAt.toISOString() : null,
  },

  PullRequest: {
    id: (pr) => pr._id || pr.id,
    author: (pr) => {
      if (pr.author && pr.author.username) return pr.author;
      return User.findById(pr.author).select("-password");
    },
    reviews: (pr) => CodeReview.find({ pullRequest: pr._id || pr.id }),
    createdAt: (pr) => pr.createdAt ? pr.createdAt.toISOString() : null,
  },

  Pipeline: {
    id: (p) => p._id || p.id,
    runs: (p) => (p.runs || []).slice(-20),
  },

  PipelineRun: {
    startedAt: (r) => r.startedAt ? r.startedAt.toISOString() : null,
    completedAt: (r) => r.completedAt ? r.completedAt.toISOString() : null,
  },

  CodeReview: {
    id: (cr) => cr._id || cr.id,
    createdAt: (cr) => cr.createdAt ? cr.createdAt.toISOString() : null,
  },

  ProjectBoard: {
    id: (b) => b._id || b.id,
    createdAt: (b) => b.createdAt ? b.createdAt.toISOString() : null,
  },
};

// ── Simple GraphQL Query Parser & Executor ───────────────────────────────────

/**
 * Tokenizer: produces tokens from a GraphQL query string.
 */
function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "{" || ch === "}" || ch === "(" || ch === ")" || ch === ":" || ch === "," || ch === "!") {
      tokens.push({ type: "punct", value: ch });
      i++;
      continue;
    }
    if (ch === '"') {
      let str = "";
      i++; // skip opening quote
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "\\") { i++; str += input[i] || ""; }
        else { str += input[i]; }
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: "string", value: str });
      continue;
    }
    // Numbers
    if (/[\d-]/.test(ch)) {
      let num = ch;
      i++;
      while (i < input.length && /[\d.]/.test(input[i])) { num += input[i]; i++; }
      tokens.push({ type: "number", value: Number(num) });
      continue;
    }
    // Identifiers
    if (/[a-zA-Z_]/.test(ch)) {
      let id = ch;
      i++;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) { id += input[i]; i++; }
      if (id === "true" || id === "false") {
        tokens.push({ type: "boolean", value: id === "true" });
      } else if (id === "null") {
        tokens.push({ type: "null", value: null });
      } else {
        tokens.push({ type: "name", value: id });
      }
      continue;
    }
    // Skip unknown characters
    i++;
  }
  return tokens;
}

/**
 * Parse a selection set from tokens: { field(args) { subfields } ... }
 */
function parseSelectionSet(tokens, pos) {
  const fields = [];
  if (tokens[pos]?.value !== "{") return { fields, pos };
  pos++; // skip {

  while (pos < tokens.length && tokens[pos]?.value !== "}") {
    if (tokens[pos]?.type !== "name") { pos++; continue; }

    const field = { name: tokens[pos].value, args: {}, fields: [] };
    pos++;

    // Parse arguments: (key: value, ...)
    if (tokens[pos]?.value === "(") {
      pos++; // skip (
      while (pos < tokens.length && tokens[pos]?.value !== ")") {
        if (tokens[pos]?.type === "name") {
          const argName = tokens[pos].value;
          pos++;
          if (tokens[pos]?.value === ":") pos++; // skip :
          if (pos < tokens.length && tokens[pos]?.value !== ")" && tokens[pos]?.value !== ",") {
            field.args[argName] = tokens[pos].value;
            pos++;
          }
        }
        if (tokens[pos]?.value === ",") pos++;
      }
      if (tokens[pos]?.value === ")") pos++; // skip )
    }

    // Parse sub-selections
    if (tokens[pos]?.value === "{") {
      const sub = parseSelectionSet(tokens, pos);
      field.fields = sub.fields;
      pos = sub.pos;
    }

    fields.push(field);
  }

  if (tokens[pos]?.value === "}") pos++; // skip }
  return { fields, pos };
}

/**
 * Parse a query string into a structured AST.
 * Supports: { fieldName(arg: val) { subField } }
 * Supports: query { ... } or mutation { ... } wrappers (ignored for now).
 */
function parseQuery(queryString) {
  const tokens = tokenize(queryString);
  let pos = 0;

  // Skip optional "query" or "mutation" keyword and optional name
  if (tokens[pos]?.type === "name" && (tokens[pos].value === "query" || tokens[pos].value === "mutation")) {
    pos++;
    if (tokens[pos]?.type === "name") pos++; // skip optional operation name
    // Skip variables block ($var: Type)
    if (tokens[pos]?.value === "(") {
      let depth = 1;
      pos++;
      while (pos < tokens.length && depth > 0) {
        if (tokens[pos].value === "(") depth++;
        if (tokens[pos].value === ")") depth--;
        pos++;
      }
    }
  }

  const result = parseSelectionSet(tokens, pos);
  return result.fields;
}

/**
 * Resolve a single field using the resolver map and parent data.
 */
async function resolveField(typeName, fieldName, parent, args, resolverMap) {
  const typeResolvers = resolverMap[typeName];
  if (typeResolvers && typeof typeResolvers[fieldName] === "function") {
    return typeResolvers[fieldName](parent, args);
  }
  // Default resolution: return the field from the parent object
  if (parent && parent[fieldName] !== undefined) {
    const val = parent[fieldName];
    // Handle Mongoose documents
    if (val && typeof val.toObject === "function") return val.toObject();
    return val;
  }
  return null;
}

/**
 * Resolve a selection set against a parent object.
 */
async function resolveSelections(typeName, selections, parent, resolverMap) {
  if (!parent) return null;

  // If parent is a Mongoose document, convert to plain object for field access
  const obj = parent.toObject ? parent.toObject({ virtuals: true }) : parent;

  const result = {};

  for (const field of selections) {
    const value = await resolveField(typeName, field.name, obj, field.args, resolverMap);

    if (field.fields.length === 0) {
      // Scalar field
      result[field.name] = value;
    } else if (Array.isArray(value)) {
      // Array of objects — resolve each element
      const childType = inferType(typeName, field.name);
      result[field.name] = await Promise.all(
        value.map((item) => resolveSelections(childType, field.fields, item, resolverMap))
      );
    } else if (value && typeof value === "object") {
      // Single object — resolve its subfields
      const childType = inferType(typeName, field.name);
      result[field.name] = await resolveSelections(childType, field.fields, value, resolverMap);
    } else {
      result[field.name] = value;
    }
  }

  return result;
}

/**
 * Simple type inference based on parent type and field name.
 */
function inferType(parentType, fieldName) {
  const typeMap = {
    "Query.user": "User",
    "Query.repository": "Repository",
    "Query.repositories": "Repository",
    "Query.issues": "Issue",
    "Query.pullRequests": "PullRequest",
    "Query.pipelines": "Pipeline",
    "Query.boards": "ProjectBoard",
    "Query.analytics": "Analytics",
    "Query.search": "SearchResult",
    "User.repositories": "Repository",
    "Repository.owner": "User",
    "Repository.issues": "Issue",
    "Repository.pullRequests": "PullRequest",
    "Repository.pipelines": "Pipeline",
    "Issue.author": "User",
    "Issue.repository": "Repository",
    "PullRequest.author": "User",
    "PullRequest.reviews": "CodeReview",
    "Pipeline.runs": "PipelineRun",
    "CodeReview.suggestions": "Suggestion",
    "ProjectBoard.columns": "Column",
    "Column.cards": "Card",
    "Card.assignees": "User",
    "SearchResult.repositories": "Repository",
    "SearchResult.issues": "Issue",
    "SearchResult.users": "User",
    "Analytics.trending": "Repository",
  };
  return typeMap[`${parentType}.${fieldName}`] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

/**
 * Execute a GraphQL-like query and return the result.
 *
 * @param {string} queryString - The query string
 * @param {object} [variables] - Variables (currently used for argument substitution)
 * @returns {Promise<{data: object|null, errors: Array|null}>}
 */
async function executeQuery(queryString, variables = {}) {
  try {
    const selections = parseQuery(queryString);

    if (!selections || selections.length === 0) {
      return { data: null, errors: [{ message: "Empty or invalid query." }] };
    }

    // Substitute variables in arguments
    for (const sel of selections) {
      for (const [key, val] of Object.entries(sel.args)) {
        if (typeof val === "string" && val.startsWith("$") && variables[val.slice(1)] !== undefined) {
          sel.args[key] = variables[val.slice(1)];
        }
      }
    }

    const data = {};

    for (const field of selections) {
      try {
        const rawValue = await resolveField("Query", field.name, {}, field.args, resolvers);

        if (field.fields.length === 0) {
          data[field.name] = rawValue;
        } else if (Array.isArray(rawValue)) {
          const childType = inferType("Query", field.name);
          data[field.name] = await Promise.all(
            rawValue.map((item) => resolveSelections(childType, field.fields, item, resolvers))
          );
        } else if (rawValue && typeof rawValue === "object") {
          const childType = inferType("Query", field.name);
          data[field.name] = await resolveSelections(childType, field.fields, rawValue, resolvers);
        } else {
          data[field.name] = rawValue;
        }
      } catch (fieldErr) {
        data[field.name] = null;
        return { data, errors: [{ message: fieldErr.message, path: [field.name] }] };
      }
    }

    return { data, errors: null };
  } catch (err) {
    return { data: null, errors: [{ message: err.message }] };
  }
}

module.exports = { typeDefs, resolvers, executeQuery };
