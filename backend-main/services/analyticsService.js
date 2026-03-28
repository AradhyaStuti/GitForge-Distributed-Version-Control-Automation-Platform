'use strict';

const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");
const PullRequest = require("../models/pullRequestModel");
const Pipeline = require("../models/Pipeline");
const CodeReview = require("../models/CodeReview");
const CodeIntelligence = require("../models/CodeIntelligence");
const { AppError } = require("../middleware/errorHandler");

class AnalyticsService {
  async getRepositoryAnalytics(repoId) {
    const repo = await Repository.findById(repoId);
    if (!repo) throw new AppError("Repository not found.", 404);

    const [issues, pullRequests, pipelineStats, codeReviews, codeIntel] = await Promise.all([
      Issue.find({ repository: repoId }).lean(),
      PullRequest.find({ repository: repoId }).lean(),
      Pipeline.find({ repository: repoId }).lean(),
      CodeReview.find({ repository: repoId, status: "completed" }).lean(),
      CodeIntelligence.findOne({ repository: repoId }).sort({ analyzedAt: -1 }).lean(),
    ]);

    // Issue resolution time
    const closedIssues = issues.filter((i) => i.status === "closed");
    const issueResolutionTimes = closedIssues.map((i) => i.updatedAt - i.createdAt);
    const avgIssueResolution = issueResolutionTimes.length > 0
      ? Math.round(issueResolutionTimes.reduce((a, b) => a + b, 0) / issueResolutionTimes.length)
      : 0;
    const medianIssueResolution = this._median(issueResolutionTimes);

    // PR merge time
    const mergedPRs = pullRequests.filter((pr) => pr.status === "merged" && pr.mergedAt);
    const prMergeTimes = mergedPRs.map((pr) => new Date(pr.mergedAt) - new Date(pr.createdAt));
    const avgPRMergeTime = prMergeTimes.length > 0
      ? Math.round(prMergeTimes.reduce((a, b) => a + b, 0) / prMergeTimes.length)
      : 0;
    const medianPRMergeTime = this._median(prMergeTimes);

    // Pipeline stats
    let pipelineSuccessRate = 0;
    let totalPipelineRuns = 0;
    let successfulRuns = 0;
    for (const p of pipelineStats) {
      totalPipelineRuns += p.totalRuns;
      successfulRuns += p.runs.filter((r) => r.status === "success").length;
    }
    if (totalPipelineRuns > 0) {
      pipelineSuccessRate = Math.round((successfulRuns / totalPipelineRuns) * 100);
    }

    // Code review stats
    const avgReviewScore = codeReviews.length > 0
      ? Math.round(codeReviews.reduce((sum, r) => sum + (r.score || 0), 0) / codeReviews.length)
      : 0;

    return {
      issues: {
        total: issues.length,
        open: issues.filter((i) => i.status === "open").length,
        closed: closedIssues.length,
        avgResolutionTimeMs: avgIssueResolution,
        medianResolutionTimeMs: medianIssueResolution,
      },
      pullRequests: {
        total: pullRequests.length,
        open: pullRequests.filter((pr) => pr.status === "open").length,
        merged: mergedPRs.length,
        closed: pullRequests.filter((pr) => pr.status === "closed").length,
        avgMergeTimeMs: avgPRMergeTime,
        medianMergeTimeMs: medianPRMergeTime,
      },
      pipelines: {
        total: pipelineStats.length,
        totalRuns: totalPipelineRuns,
        successRate: pipelineSuccessRate,
      },
      codeReviews: {
        total: codeReviews.length,
        averageScore: avgReviewScore,
      },
      languages: codeIntel ? codeIntel.languages : [],
    };
  }

  async getPlatformAnalytics() {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, totalRepos, totalIssues, totalPRs,
      newUsersDay, newUsersWeek, newUsersMonth,
      newReposDay, newReposWeek, newReposMonth,
      topUsers, topRepos,
    ] = await Promise.all([
      User.countDocuments(),
      Repository.countDocuments(),
      Issue.countDocuments(),
      PullRequest.countDocuments(),
      User.countDocuments({ createdAt: { $gte: dayAgo } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: { $gte: monthAgo } }),
      Repository.countDocuments({ createdAt: { $gte: dayAgo } }),
      Repository.countDocuments({ createdAt: { $gte: weekAgo } }),
      Repository.countDocuments({ createdAt: { $gte: monthAgo } }),
      User.aggregate([
        {
          $project: {
            username: 1,
            email: 1,
            repoCount: { $size: { $ifNull: ["$repositories", []] } },
          },
        },
        { $sort: { repoCount: -1 } },
        { $limit: 10 },
      ]),
      Repository.aggregate([
        { $match: { visibility: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            createdAt: 1,
            owner: { $arrayElemAt: ["$ownerInfo.username", 0] },
          },
        },
      ]),
    ]);

    return {
      totals: { users: totalUsers, repositories: totalRepos, issues: totalIssues, pullRequests: totalPRs },
      growth: {
        daily: { users: newUsersDay, repositories: newReposDay },
        weekly: { users: newUsersWeek, repositories: newReposWeek },
        monthly: { users: newUsersMonth, repositories: newReposMonth },
      },
      mostActiveUsers: topUsers,
      topRepositories: topRepos,
    };
  }

  async getUserAnalytics(userId) {
    const user = await User.findById(userId).select("-password -loginAttempts -lockUntil").lean();
    if (!user) throw new AppError("User not found.", 404);

    const [repos, issues, pullRequests, reviews] = await Promise.all([
      Repository.find({ owner: userId }).lean(),
      Issue.find({ author: userId }).lean(),
      PullRequest.find({ author: userId }).lean(),
      PullRequest.find({ reviewers: userId }).lean(),
    ]);

    // Contribution over time (last 12 months)
    const contributions = {};
    const allItems = [
      ...repos.map((r) => ({ date: r.createdAt, type: "repo" })),
      ...issues.map((i) => ({ date: i.createdAt, type: "issue" })),
      ...pullRequests.map((pr) => ({ date: pr.createdAt, type: "pr" })),
    ];

    for (const item of allItems) {
      const month = new Date(item.date).toISOString().substring(0, 7);
      if (!contributions[month]) contributions[month] = { repos: 0, issues: 0, prs: 0 };
      if (item.type === "repo") contributions[month].repos++;
      if (item.type === "issue") contributions[month].issues++;
      if (item.type === "pr") contributions[month].prs++;
    }

    return {
      user: { _id: user._id, username: user.username, email: user.email, createdAt: user.createdAt },
      stats: {
        totalRepos: repos.length,
        totalIssues: issues.length,
        totalPRs: pullRequests.length,
        totalReviews: reviews.length,
        mergedPRs: pullRequests.filter((pr) => pr.status === "merged").length,
      },
      contributions: Object.entries(contributions)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  async getTrendingRepos(timeframe = "week") {
    const now = new Date();
    let since;

    switch (timeframe) {
      case "day":
        since = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case "month":
        since = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case "week":
      default:
        since = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Trending: recently active public repos
    const repos = await Repository.aggregate([
      { $match: { visibility: true, updatedAt: { $gte: since } } },
      {
        $lookup: {
          from: "issues",
          localField: "_id",
          foreignField: "repository",
          as: "recentIssues",
        },
      },
      {
        $lookup: {
          from: "pullrequests",
          localField: "_id",
          foreignField: "repository",
          as: "recentPRs",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      {
        $addFields: {
          activityScore: {
            $add: [
              { $multiply: [{ $size: { $ifNull: ["$recentIssues", []] } }, 2] },
              { $multiply: [{ $size: { $ifNull: ["$recentPRs", []] } }, 3] },
              1,
            ],
          },
          // Time decay: more recent = higher score
          recencyBoost: {
            $divide: [
              { $subtract: ["$updatedAt", since] },
              { $subtract: [now, since] },
            ],
          },
        },
      },
      {
        $addFields: {
          trendScore: { $multiply: ["$activityScore", { $add: ["$recencyBoost", 0.5] }] },
        },
      },
      { $sort: { trendScore: -1 } },
      { $limit: 20 },
      {
        $project: {
          name: 1,
          description: 1,
          updatedAt: 1,
          trendScore: 1,
          issueCount: { $size: { $ifNull: ["$recentIssues", []] } },
          prCount: { $size: { $ifNull: ["$recentPRs", []] } },
          owner: { $arrayElemAt: ["$ownerInfo.username", 0] },
        },
      },
    ]);

    return repos;
  }

  _median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}

module.exports = new AnalyticsService();
