const Issue = require("../models/issueModel");
const Repository = require("../models/repoModel");
const { AppError } = require("../middleware/errorHandler");

class IssueService {
  async create({ title, description, repositoryId, authorId }) {
    const repo = await Repository.findById(repositoryId).select("name owner issues");
    if (!repo) throw new AppError("Repository not found.", 404);

    const issue = await Issue.create({
      title,
      description,
      repository: repositoryId,
      author: authorId,
    });

    await Repository.findByIdAndUpdate(repositoryId, {
      $push: { issues: issue._id },
    });

    return { issue, repoName: repo.name, repoOwnerId: repo.owner.toString() };
  }

  async getById(id) {
    const issue = await Issue.findById(id).populate("repository", "name");
    if (!issue) throw new AppError("Issue not found.", 404);
    return issue;
  }

  async list({ repositoryId, status, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const filter = {};
    if (repositoryId) filter.repository = repositoryId;
    if (status && ["open", "closed"].includes(status)) filter.status = status;

    const [issues, total] = await Promise.all([
      Issue.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Issue.countDocuments(filter),
    ]);

    return { issues, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async update(id, updates) {
    const issue = await Issue.findById(id);
    if (!issue) throw new AppError("Issue not found.", 404);

    if (updates.title) issue.title = updates.title;
    if (updates.description) issue.description = updates.description;
    if (updates.status && ["open", "closed"].includes(updates.status)) {
      issue.status = updates.status;
    }

    await issue.save();
    return issue;
  }

  async delete(id) {
    const issue = await Issue.findByIdAndDelete(id);
    if (!issue) throw new AppError("Issue not found.", 404);

    await Repository.findByIdAndUpdate(issue.repository, {
      $pull: { issues: issue._id },
    });

    return { message: "Issue deleted." };
  }
}

module.exports = new IssueService();
