const Comment = require("../models/commentModel");
const { AppError } = require("../middleware/errorHandler");

class CommentService {
  async create({ body, author, issue, pullRequest, filePath, lineNumber }) {
    if (!issue && !pullRequest) {
      throw new AppError("Comment must belong to an issue or pull request.", 400);
    }

    const comment = await Comment.create({
      body,
      author,
      issue: issue || undefined,
      pullRequest: pullRequest || undefined,
      filePath,
      lineNumber,
    });

    return comment.populate("author", "username email");
  }

  async listByIssue(issueId, { page = 1, limit = 50 }) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      Comment.find({ issue: issueId })
        .populate("author", "username email")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ issue: issueId }),
    ]);
    return { comments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async listByPR(prId, { page = 1, limit = 50 }) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      Comment.find({ pullRequest: prId })
        .populate("author", "username email")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ pullRequest: prId }),
    ]);
    return { comments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async update(commentId, userId, body) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError("Comment not found.", 404);
    if (comment.author.toString() !== userId) {
      throw new AppError("You can only edit your own comments.", 403);
    }

    comment.body = body;
    comment.edited = true;
    await comment.save();
    return comment.populate("author", "username email");
  }

  async delete(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError("Comment not found.", 404);
    if (comment.author.toString() !== userId) {
      throw new AppError("You can only delete your own comments.", 403);
    }

    await Comment.findByIdAndDelete(commentId);
    return { message: "Comment deleted." };
  }

  async toggleReaction(commentId, userId, reactionType) {
    const validReactions = ["thumbsUp", "thumbsDown", "heart", "hooray"];
    if (!validReactions.includes(reactionType)) {
      throw new AppError("Invalid reaction type.", 400);
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError("Comment not found.", 404);

    const arr = comment.reactions[reactionType];
    const idx = arr.findIndex((id) => id.toString() === userId);

    if (idx === -1) {
      arr.push(userId);
    } else {
      arr.splice(idx, 1);
    }

    await comment.save();
    return comment.populate("author", "username email");
  }

  async countByIssue(issueId) {
    return Comment.countDocuments({ issue: issueId });
  }

  async countByPR(prId) {
    return Comment.countDocuments({ pullRequest: prId });
  }
}

module.exports = new CommentService();
