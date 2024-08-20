const Milestone = require("../models/milestoneModel");
const Issue = require("../models/issueModel");
const { AppError } = require("../middleware/errorHandler");

class MilestoneService {
  async create({ title, description, dueDate, repository, creator }) {
    return Milestone.create({ title, description, dueDate, repository, creator });
  }

  async list(repositoryId) {
    const milestones = await Milestone.find({ repository: repositoryId })
      .populate("creator", "username")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    for (const m of milestones) {
      const [open, closed] = await Promise.all([
        Issue.countDocuments({ repository: repositoryId, milestone: m._id, status: "open" }),
        Issue.countDocuments({ repository: repositoryId, milestone: m._id, status: "closed" }),
      ]);
      m.openIssues = open;
      m.closedIssues = closed;
      m.progress = open + closed > 0 ? Math.round((closed / (open + closed)) * 100) : 0;
    }
    return milestones;
  }

  async update(id, userId, updates) {
    const m = await Milestone.findById(id);
    if (!m) throw new AppError("Milestone not found.", 404);
    const allowed = ["title", "description", "dueDate", "status"];
    for (const k of Object.keys(updates)) { if (allowed.includes(k)) m[k] = updates[k]; }
    await m.save();
    return m;
  }

  async delete(id) {
    const m = await Milestone.findByIdAndDelete(id);
    if (!m) throw new AppError("Milestone not found.", 404);
    return { message: "Milestone deleted." };
  }
}

module.exports = new MilestoneService();
