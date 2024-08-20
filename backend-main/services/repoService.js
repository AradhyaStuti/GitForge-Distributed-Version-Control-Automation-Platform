const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const User = require("../models/userModel");
const { AppError } = require("../middleware/errorHandler");
const { escapeRegex } = require("../utils/sanitize");

const ACTIVITY_WEIGHTS = {
  REPO_CREATED: 5,
  REPO_UPDATED: 1,
  ISSUE_CREATED: 2,
};

class RepoService {
  async create({ name, description, visibility, ownerId }) {
    const existing = await Repository.findOne({ name, owner: ownerId });
    if (existing) throw new AppError("You already have a repository with this name.", 409);

    const repo = await Repository.create({
      name,
      description: description || "",
      visibility: visibility !== undefined ? visibility : true,
      owner: ownerId,
    });

    await User.findByIdAndUpdate(ownerId, { $push: { repositories: repo._id } });
    return repo;
  }

  async getById(id) {
    const repo = await Repository.findById(id)
      .populate("owner", "username email")
      .populate("issues");

    if (!repo) throw new AppError("Repository not found.", 404);
    return repo;
  }

  async listPublic({ page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const filter = { visibility: true };

    const [repositories, total] = await Promise.all([
      Repository.find(filter)
        .populate("owner", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Repository.countDocuments(filter),
    ]);

    return { repositories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async listByUser(userId, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const filter = { owner: userId };

    const [repositories, total] = await Promise.all([
      Repository.find(filter)
        .populate("owner", "username")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Repository.countDocuments(filter),
    ]);

    return { repositories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async searchByName(name, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const sanitized = escapeRegex(name);
    const filter = { name: { $regex: sanitized, $options: "i" } };

    const [repositories, total] = await Promise.all([
      Repository.find(filter)
        .populate("owner", "username")
        .skip(skip)
        .limit(limit),
      Repository.countDocuments(filter),
    ]);

    return { repositories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async update(id, userId, updates) {
    const repo = await Repository.findById(id);
    if (!repo) throw new AppError("Repository not found.", 404);
    if (repo.owner.toString() !== userId) {
      throw new AppError("You do not have permission to update this repository.", 403);
    }

    if (updates.content) repo.content.push(updates.content);
    if (updates.description !== undefined) repo.description = updates.description;
    if (updates.name) repo.name = updates.name;

    return repo.save();
  }

  async toggleVisibility(id, userId) {
    const repo = await Repository.findById(id);
    if (!repo) throw new AppError("Repository not found.", 404);
    if (repo.owner.toString() !== userId) {
      throw new AppError("You do not have permission to modify this repository.", 403);
    }

    repo.visibility = !repo.visibility;
    return repo.save();
  }

  async delete(id, userId) {
    const repo = await Repository.findById(id);
    if (!repo) throw new AppError("Repository not found.", 404);
    if (repo.owner.toString() !== userId) {
      throw new AppError("You do not have permission to delete this repository.", 403);
    }

    await Repository.findByIdAndDelete(id);
    await User.findByIdAndUpdate(repo.owner, { $pull: { repositories: repo._id } });
    return { message: "Repository deleted." };
  }

  async getActivityForUser(userId) {
    const [repos, issues] = await Promise.all([
      Repository.find({ owner: userId }).select("createdAt updatedAt").lean(),
      Issue.find({
        author: userId,
      }).select("createdAt").lean(),
    ]);

    const activityMap = {};

    for (const repo of repos) {
      const createDate = repo.createdAt.toISOString().split("T")[0];
      activityMap[createDate] = (activityMap[createDate] || 0) + ACTIVITY_WEIGHTS.REPO_CREATED;

      if (repo.updatedAt.getTime() !== repo.createdAt.getTime()) {
        const updateDate = repo.updatedAt.toISOString().split("T")[0];
        activityMap[updateDate] = (activityMap[updateDate] || 0) + ACTIVITY_WEIGHTS.REPO_UPDATED;
      }
    }

    for (const issue of issues) {
      const date = issue.createdAt.toISOString().split("T")[0];
      activityMap[date] = (activityMap[date] || 0) + ACTIVITY_WEIGHTS.ISSUE_CREATED;
    }

    return Object.entries(activityMap).map(([date, count]) => ({ date, count }));
  }
}

module.exports = new RepoService();
