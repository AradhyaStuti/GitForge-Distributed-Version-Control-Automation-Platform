const Label = require("../models/labelModel");
const { AppError } = require("../middleware/errorHandler");

const DEFAULT_LABELS = [
  { name: "bug", color: "#d73a4a", description: "Something isn't working" },
  { name: "enhancement", color: "#a2eeef", description: "New feature or request" },
  { name: "documentation", color: "#0075ca", description: "Improvements or additions to documentation" },
  { name: "good first issue", color: "#7057ff", description: "Good for newcomers" },
  { name: "help wanted", color: "#008672", description: "Extra attention is needed" },
  { name: "question", color: "#d876e3", description: "Further information is requested" },
  { name: "wontfix", color: "#ffffff", description: "This will not be worked on" },
  { name: "duplicate", color: "#cfd3d7", description: "This issue or pull request already exists" },
  { name: "priority: high", color: "#b60205", description: "High priority" },
  { name: "priority: low", color: "#0e8a16", description: "Low priority" },
];

class LabelService {
  async initDefaults(repositoryId) {
    const existing = await Label.countDocuments({ repository: repositoryId });
    if (existing > 0) return;

    const labels = DEFAULT_LABELS.map((l) => ({ ...l, repository: repositoryId }));
    await Label.insertMany(labels);
  }

  async create({ name, color, description, repository }) {
    const existing = await Label.findOne({ repository, name });
    if (existing) throw new AppError("Label already exists in this repository.", 409);

    return Label.create({ name, color, description, repository });
  }

  async list(repositoryId) {
    return Label.find({ repository: repositoryId }).sort({ name: 1 });
  }

  async update(labelId, updates) {
    const label = await Label.findByIdAndUpdate(labelId, updates, {
      new: true,
      runValidators: true,
    });
    if (!label) throw new AppError("Label not found.", 404);
    return label;
  }

  async delete(labelId) {
    const label = await Label.findByIdAndDelete(labelId);
    if (!label) throw new AppError("Label not found.", 404);
    return { message: "Label deleted." };
  }
}

module.exports = new LabelService();
