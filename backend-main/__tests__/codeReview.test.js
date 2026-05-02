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
let reviewId;

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
    .send({ title: "Test PR", repository: repoId, sourceBranch: "feature", targetBranch: "main" });
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
  it("should create a code review for a PR", async () => {
    const res = await request(app)
      .post("/code-review")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ pullRequest: prId, repository: repoId });
    expect(res.status).toBe(201);
    expect(res.body.review.status).toBe("completed");
    expect(typeof res.body.review.score).toBe("number");
    reviewId = res.body.review._id;
  });

  it("should return a review by ID with metrics", async () => {
    const res = await request(app)
      .get(`/code-review/${reviewId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("score");
    expect(res.body).toHaveProperty("summary");
    expect(res.body).toHaveProperty("metrics");
  });

  it("should list reviews for a PR", async () => {
    const res = await request(app)
      .get(`/code-review/pr/${prId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBeGreaterThan(0);
  });
});
