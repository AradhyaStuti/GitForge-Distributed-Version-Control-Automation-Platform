const request = require("supertest");
const { buildApp, connectDb, disconnectDb, signupTestUser } = require("./helpers/setup");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const PullRequest = require("../models/pullRequestModel");
const CodeReview = require("../models/CodeReview");

const app = buildApp();
let authToken;
let userId;
let emailRegex;
let repoId;
let prId;
let reviewId;

beforeAll(async () => {
  await connectDb();
  ({ authToken, userId, emailRegex } = await signupTestUser(app, "cr"));

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
  await User.deleteMany({ email: emailRegex });
  await disconnectDb();
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
