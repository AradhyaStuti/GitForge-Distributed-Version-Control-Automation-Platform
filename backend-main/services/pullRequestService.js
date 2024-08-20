const PullRequest = require("../models/pullRequestModel");
const Repository = require("../models/repoModel");
const { AppError } = require("../middleware/errorHandler");

class PullRequestService {
  async create({ title, description, repository, author, sourceBranch, targetBranch, labels }) {
    const repo = await Repository.findById(repository);
    if (!repo) throw new AppError("Repository not found.", 404);

    if (sourceBranch === targetBranch) {
      throw new AppError("Source and target branches must be different.", 400);
    }

    const pr = await PullRequest.create({
      title,
      description,
      repository,
      author,
      sourceBranch,
      targetBranch: targetBranch || "main",
      labels: labels || [],
    });

    return pr.populate([
      { path: "author", select: "username email" },
      { path: "repository", select: "name owner" },
    ]);
  }

  async list({ repositoryId, status, author, page = 1, limit = 20 }) {
    const filter = {};
    if (repositoryId) filter.repository = repositoryId;
    if (status) filter.status = status;
    if (author) filter.author = author;

    const skip = (page - 1) * limit;

    const [pullRequests, total] = await Promise.all([
      PullRequest.find(filter)
        .populate("author", "username email")
        .populate("repository", "name owner")
        .populate("reviewers", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PullRequest.countDocuments(filter),
    ]);

    return {
      pullRequests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getById(id) {
    const pr = await PullRequest.findById(id)
      .populate("author", "username email")
      .populate("repository", "name owner")
      .populate("reviewers", "username email")
      .populate("reviews.reviewer", "username email")
      .populate("mergedBy", "username email");

    if (!pr) throw new AppError("Pull request not found.", 404);
    return pr;
  }

  async update(id, userId, updates) {
    const pr = await PullRequest.findById(id);
    if (!pr) throw new AppError("Pull request not found.", 404);

    if (pr.status === "merged") {
      throw new AppError("Cannot update a merged pull request.", 400);
    }

    const allowed = ["title", "description", "labels", "status"];
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) pr[key] = updates[key];
    }

    await pr.save();
    return pr.populate([
      { path: "author", select: "username email" },
      { path: "repository", select: "name owner" },
    ]);
  }

  async merge(id, userId) {
    const pr = await PullRequest.findById(id).populate("repository");
    if (!pr) throw new AppError("Pull request not found.", 404);

    if (pr.status === "merged") {
      throw new AppError("Pull request is already merged.", 400);
    }
    if (pr.status === "closed") {
      throw new AppError("Cannot merge a closed pull request.", 400);
    }

    // Check if user is repo owner or PR author
    const repo = await Repository.findById(pr.repository._id || pr.repository);
    if (!repo) throw new AppError("Repository not found.", 404);

    if (repo.owner.toString() !== userId && pr.author.toString() !== userId) {
      throw new AppError("Only the repository owner or PR author can merge.", 403);
    }

    pr.status = "merged";
    pr.mergedBy = userId;
    pr.mergedAt = new Date();
    await pr.save();

    return pr.populate([
      { path: "author", select: "username email" },
      { path: "mergedBy", select: "username email" },
      { path: "repository", select: "name owner" },
    ]);
  }

  async addReview(prId, reviewerId, { status, body }) {
    const pr = await PullRequest.findById(prId);
    if (!pr) throw new AppError("Pull request not found.", 404);

    if (pr.status !== "open") {
      throw new AppError("Can only review open pull requests.", 400);
    }

    pr.reviews.push({ reviewer: reviewerId, status, body });

    if (!pr.reviewers.some((r) => r.toString() === reviewerId)) {
      pr.reviewers.push(reviewerId);
    }

    await pr.save();
    return pr.populate("reviews.reviewer", "username email");
  }

  async countByRepo(repositoryId) {
    const [open, closed, merged] = await Promise.all([
      PullRequest.countDocuments({ repository: repositoryId, status: "open" }),
      PullRequest.countDocuments({ repository: repositoryId, status: "closed" }),
      PullRequest.countDocuments({ repository: repositoryId, status: "merged" }),
    ]);
    return { open, closed, merged, total: open + closed + merged };
  }
}

module.exports = new PullRequestService();
