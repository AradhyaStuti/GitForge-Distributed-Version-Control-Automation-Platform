const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const User = require("../models/userModel");
const { escapeRegex } = require("../utils/sanitize");
const { logger } = require("../middleware/logger");

class SearchService {
  async search({ query, type, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const sanitized = escapeRegex(query);
    const results = {};

    if (!type || type === "repos") {
      results.repositories = await this._searchRepos(sanitized, skip, limit);
    }
    if (!type || type === "issues") {
      results.issues = await this._searchIssues(sanitized, skip, limit);
    }
    if (!type || type === "users") {
      results.users = await this._searchUsers(sanitized, skip, limit);
    }

    return results;
  }

  async _searchRepos(query, skip, limit) {
    const filter = {
      $or: [
        { $text: { $search: query } },
        { name: { $regex: query, $options: "i" } },
      ],
      visibility: true,
    };

    const fallbackFilter = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
      visibility: true,
    };

    try {
      const [items, total] = await Promise.all([
        Repository.find(filter)
          .populate("owner", "username")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Repository.countDocuments(filter),
      ]);
      return { items, total, pages: Math.ceil(total / limit) };
    } catch (err) {
      logger.warn("Text search failed, falling back to regex", {
        error: err.message,
        query,
      });
      const [items, total] = await Promise.all([
        Repository.find(fallbackFilter)
          .populate("owner", "username")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Repository.countDocuments(fallbackFilter),
      ]);
      return { items, total, pages: Math.ceil(total / limit) };
    }
  }

  async _searchIssues(query, skip, limit) {
    const filter = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };

    const [items, total] = await Promise.all([
      Issue.find(filter)
        .populate("repository", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Issue.countDocuments(filter),
    ]);

    return { items, total, pages: Math.ceil(total / limit) };
  }

  async _searchUsers(query, skip, limit) {
    const filter = {
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    };

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("username email createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return { items, total, pages: Math.ceil(total / limit) };
  }
}

module.exports = new SearchService();
