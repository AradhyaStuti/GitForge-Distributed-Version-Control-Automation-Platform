const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const notificationService = require("./notificationService");
const { AppError } = require("../middleware/errorHandler");

class SocialService {
  async followUser(followerId, targetId) {
    if (followerId === targetId) throw new AppError("You cannot follow yourself.", 400);

    const [follower, target] = await Promise.all([
      User.findById(followerId),
      User.findById(targetId),
    ]);

    if (!target) throw new AppError("User not found.", 404);

    if (follower.followedUsers.includes(targetId)) {
      throw new AppError("Already following this user.", 409);
    }

    await User.findByIdAndUpdate(followerId, { $addToSet: { followedUsers: targetId } });

    await notificationService.create({
      recipient: targetId,
      type: "user_followed",
      message: `${follower.username} started following you.`,
      link: `/profile/${followerId}`,
      actor: followerId,
    });

    return { message: `Now following ${target.username}.` };
  }

  async unfollowUser(followerId, targetId) {
    await User.findByIdAndUpdate(followerId, { $pull: { followedUsers: targetId } });
    return { message: "Unfollowed successfully." };
  }

  async starRepo(userId, repoId) {
    const repo = await Repository.findById(repoId).populate("owner", "username");
    if (!repo) throw new AppError("Repository not found.", 404);

    const user = await User.findById(userId);
    if (user.starRepos.includes(repoId)) {
      throw new AppError("Repository already starred.", 409);
    }

    await User.findByIdAndUpdate(userId, { $addToSet: { starRepos: repoId } });

    if (repo.owner._id.toString() !== userId) {
      await notificationService.create({
        recipient: repo.owner._id,
        type: "repo_starred",
        message: `${user.username} starred your repository ${repo.name}.`,
        link: `/repo/${repoId}`,
        actor: userId,
      });
    }

    return { message: `Starred ${repo.name}.` };
  }

  async unstarRepo(userId, repoId) {
    await User.findByIdAndUpdate(userId, { $pull: { starRepos: repoId } });
    return { message: "Unstarred successfully." };
  }

  async forkRepo(userId, repoId) {
    const original = await Repository.findById(repoId).populate("owner", "username");
    if (!original) throw new AppError("Repository not found.", 404);

    const existingFork = await Repository.findOne({
      name: `${original.name}`,
      owner: userId,
      forkedFrom: repoId,
    });
    if (existingFork) throw new AppError("You already forked this repository.", 409);

    const fork = await Repository.create({
      name: original.name,
      description: `Forked from ${original.owner.username}/${original.name}`,
      visibility: original.visibility,
      owner: userId,
      content: [...original.content],
      forkedFrom: repoId,
    });

    await User.findByIdAndUpdate(userId, { $push: { repositories: fork._id } });

    const user = await User.findById(userId).select("username");
    if (original.owner._id.toString() !== userId) {
      await notificationService.create({
        recipient: original.owner._id,
        type: "repo_forked",
        message: `${user.username} forked your repository ${original.name}.`,
        link: `/repo/${fork._id}`,
        actor: userId,
      });
    }

    return { message: "Repository forked!", repository: fork };
  }
}

module.exports = new SocialService();
