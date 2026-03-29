const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const PullRequest = require("../models/pullRequestModel");
const CodeReview = require("../models/CodeReview");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let repoId;
let prId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const signupRes = await request(app).post("/signup").send({
    username: `cr_user_${Date.now()}`,
    email: `test_jest_cr_${Date.now()}@example.com`,
    password: "TestPass123",
  });
  authToken = signupRes.body.token;
  userId = signupRes.body.userId;

  const repoRes = await request(app)
    .post("/repo/create")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ name: `cr-repo-${Date.now()}`, visibility: true });
  repoId = repoRes.body.repository?._id || repoRes.body._id;

  const prRes = await request(app)
    .post("/pr/create")
    .set("Authorization", `Bearer ${authToken}`)
    .send({
      title: "Test PR for review",
      repository: repoId,
      sourceBranch: "feature",
      targetBranch: "main",
    });
  prId = prRes.body._id;
});

afterAll(async () => {
  await CodeReview.deleteMany({ repository: repoId });
  await PullRequest.deleteMany({ repository: repoId });
  await Repository.deleteMany({ owner: userId });
  await User.deleteMany({ email: /^test_jest_cr_/ });
  await mongoose.connection.close();
});

describe("Code Review Endpoints", () => {
  let reviewId;

  describe("POST /code-review", () => {
    it("should create a code review for a PR", async () => {
      const res = await request(app)
        .post("/code-review")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ pullRequest: prId, repository: repoId });

      expect(res.status).toBe(201);
      expect(res.body.review).toBeDefined();
      expect(res.body.review.status).toBe("completed");
      expect(typeof res.body.review.score).toBe("number");
      reviewId = res.body.review._id;
    });
  });

  describe("GET /code-review/pr/:prId", () => {
    it("should list reviews for a PR", async () => {
      const res = await request(app)
        .get(`/code-review/pr/${prId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reviews).toBeDefined();
      expect(res.body.reviews.length).toBeGreaterThan(0);
    });
  });

  describe("GET /code-review/:id", () => {
    it("should return a review by ID", async () => {
      const res = await request(app)
        .get(`/code-review/${reviewId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(reviewId);
      expect(res.body).toHaveProperty("score");
      expect(res.body).toHaveProperty("summary");
      expect(res.body).toHaveProperty("metrics");
    });

    it("should return 404 for non-existent review", async () => {
      const res = await request(app)
        .get("/code-review/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /code-review/stats/:repoId", () => {
    it("should return review stats for a repo", async () => {
      const res = await request(app)
        .get(`/code-review/stats/${repoId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalReviews");
      expect(res.body).toHaveProperty("averageScore");
    });
  });
});
