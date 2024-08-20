const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let repoId;
let issueId;
const timestamp = Date.now();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const res = await request(app).post("/signup").send({
    username: `issuetester_${timestamp}`,
    email: `test_jest_issue_${timestamp}@example.com`,
    password: "TestPass123",
  });

  authToken = res.body.token;
  userId = res.body.userId;

  const repoRes = await request(app)
    .post("/repo/create")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ name: `issue-test-repo-${timestamp}` });

  repoId = repoRes.body.repository._id;
});

afterAll(async () => {
  await Issue.deleteMany({ repository: repoId });
  await Repository.deleteMany({ _id: repoId });
  await User.deleteMany({ _id: userId });
  await mongoose.connection.close();
});

describe("Issue Endpoints", () => {
  describe("POST /issue/create", () => {
    it("should create an issue", async () => {
      const res = await request(app)
        .post("/issue/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Bug: Login fails",
          description: "Login button does nothing on click",
          repositoryId: repoId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("title", "Bug: Login fails");
      expect(res.body).toHaveProperty("status", "open");
      issueId = res.body._id;
    });

    it("should reject issue without title", async () => {
      const res = await request(app)
        .post("/issue/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "no title", repositoryId: repoId });

      expect(res.status).toBe(400);
    });

    it("should reject issue with invalid repo ID", async () => {
      const res = await request(app)
        .post("/issue/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "test",
          description: "test",
          repositoryId: "invalid",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /issue/all", () => {
    it("should return issues filtered by repository", async () => {
      const res = await request(app).get(`/issue/all?repositoryId=${repoId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("issues");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.issues.length).toBeGreaterThan(0);
    });

    it("should filter by status", async () => {
      const res = await request(app).get(`/issue/all?repositoryId=${repoId}&status=open`);

      expect(res.status).toBe(200);
      expect(res.body.issues.every((i) => i.status === "open")).toBe(true);
    });
  });

  describe("GET /issue/:id", () => {
    it("should return issue by ID", async () => {
      const res = await request(app).get(`/issue/${issueId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("title", "Bug: Login fails");
    });

    it("should return 404 for non-existent issue", async () => {
      const res = await request(app).get("/issue/507f1f77bcf86cd799439011");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /issue/update/:id", () => {
    it("should update issue status", async () => {
      const res = await request(app)
        .put(`/issue/update/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "closed" });

      expect(res.status).toBe(200);
      expect(res.body.issue.status).toBe("closed");
    });

    it("should reject invalid status value", async () => {
      const res = await request(app)
        .put(`/issue/update/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "invalid" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /issue/delete/:id", () => {
    it("should delete an issue", async () => {
      const res = await request(app)
        .delete(`/issue/delete/${issueId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });
});
