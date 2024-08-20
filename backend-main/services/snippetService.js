const Snippet = require("../models/snippetModel");
const { AppError } = require("../middleware/errorHandler");

class SnippetService {
  async create({ title, description, files, author, visibility }) {
    if (!files || files.length === 0) throw new AppError("At least one file is required.", 400);
    const snippet = await Snippet.create({ title, description, files, author, visibility });
    return snippet.populate("author", "username email");
  }

  async list({ author, visibility, page = 1, limit = 20 }) {
    const filter = {};
    if (author) filter.author = author;
    if (visibility !== undefined) filter.visibility = visibility;
    const skip = (page - 1) * limit;
    const [snippets, total] = await Promise.all([
      Snippet.find(filter).populate("author", "username email").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Snippet.countDocuments(filter),
    ]);
    return { snippets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getById(id, userId) {
    const snippet = await Snippet.findById(id).populate("author", "username email").populate("forkOf", "title");
    if (!snippet) throw new AppError("Snippet not found.", 404);
    if (!snippet.visibility && snippet.author._id.toString() !== userId) {
      throw new AppError("Snippet is private.", 403);
    }
    snippet.viewCount += 1;
    await snippet.save();
    return snippet;
  }

  async update(id, userId, updates) {
    const snippet = await Snippet.findById(id);
    if (!snippet) throw new AppError("Snippet not found.", 404);
    if (snippet.author.toString() !== userId) throw new AppError("Not authorized.", 403);
    const allowed = ["title", "description", "files", "visibility"];
    for (const k of Object.keys(updates)) { if (allowed.includes(k)) snippet[k] = updates[k]; }
    await snippet.save();
    return snippet.populate("author", "username email");
  }

  async delete(id, userId) {
    const snippet = await Snippet.findById(id);
    if (!snippet) throw new AppError("Snippet not found.", 404);
    if (snippet.author.toString() !== userId) throw new AppError("Not authorized.", 403);
    await Snippet.findByIdAndDelete(id);
    return { message: "Snippet deleted." };
  }

  async star(id, userId) {
    const snippet = await Snippet.findById(id);
    if (!snippet) throw new AppError("Snippet not found.", 404);
    if (snippet.stars.includes(userId)) throw new AppError("Already starred.", 400);
    snippet.stars.push(userId);
    await snippet.save();
    return snippet;
  }

  async unstar(id, userId) {
    const snippet = await Snippet.findById(id);
    if (!snippet) throw new AppError("Snippet not found.", 404);
    snippet.stars = snippet.stars.filter((s) => s.toString() !== userId);
    await snippet.save();
    return snippet;
  }

  async fork(id, userId) {
    const original = await Snippet.findById(id);
    if (!original) throw new AppError("Snippet not found.", 404);
    const forked = await Snippet.create({
      title: original.title,
      description: original.description,
      files: original.files,
      author: userId,
      forkOf: original._id,
    });
    original.forkCount += 1;
    await original.save();
    return forked.populate("author", "username email");
  }

  async discover({ page = 1, limit = 20, sort = "recent" }) {
    const skip = (page - 1) * limit;
    let sortBy = { createdAt: -1 };
    if (sort === "popular") sortBy = { viewCount: -1 };
    if (sort === "stars") sortBy = { "stars.length": -1, createdAt: -1 };
    const [snippets, total] = await Promise.all([
      Snippet.find({ visibility: true }).populate("author", "username email").sort(sortBy).skip(skip).limit(limit),
      Snippet.countDocuments({ visibility: true }),
    ]);
    return { snippets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}

module.exports = new SnippetService();
