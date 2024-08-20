const Bookmark = require("../models/bookmarkModel");
const { AppError } = require("../middleware/errorHandler");

class BookmarkService {
  async add({ user, repository, snippet, note }) {
    if (!repository && !snippet) throw new AppError("Must bookmark a repository or snippet.", 400);
    const filter = { user };
    if (repository) filter.repository = repository;
    if (snippet) filter.snippet = snippet;
    const existing = await Bookmark.findOne(filter);
    if (existing) throw new AppError("Already bookmarked.", 409);
    return Bookmark.create({ user, repository, snippet, note });
  }

  async remove(user, bookmarkId) {
    const bm = await Bookmark.findOne({ _id: bookmarkId, user });
    if (!bm) throw new AppError("Bookmark not found.", 404);
    await Bookmark.findByIdAndDelete(bookmarkId);
    return { message: "Bookmark removed." };
  }

  async list(user) {
    return Bookmark.find({ user })
      .populate("repository", "name description owner visibility")
      .populate("snippet", "title description author")
      .populate({ path: "repository", populate: { path: "owner", select: "username" } })
      .populate({ path: "snippet", populate: { path: "author", select: "username" } })
      .sort({ createdAt: -1 });
  }

  async isBookmarked(user, { repository, snippet }) {
    const filter = { user };
    if (repository) filter.repository = repository;
    if (snippet) filter.snippet = snippet;
    const bm = await Bookmark.findOne(filter);
    return !!bm;
  }
}

module.exports = new BookmarkService();
