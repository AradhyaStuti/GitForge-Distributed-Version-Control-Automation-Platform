const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let repoId;
const timestamp = Date.now();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Create test user
  const res = await request(app).post("/signup").send({
    username: `repotester_${timestamp}`,
    email: `test_jest_repo_${timestamp}@example.com`,
    password: "TestPass123",
  });

  authToken = res.body.token;
  userId = res.body.userId;
});

afterAll(async () => {
  await Repository.deleteMany({ owner: userId });
  await User.deleteMany({ _id: userId });
  await mongoose.connection.close();
});

describe("Repository Endpoints", () => {
  describe("POST /repo/create", () => {
    it("should create a repository when authenticated", async () => {
      const res = await request(app)
        .post("/repo/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: `test-repo-${timestamp}`,
          description: "A test repository",
          visibility: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("repository");
      expect(res.body.repository).toHaveProperty("name", `test-repo-${timestamp}`);
      repoId = res.body.repository._id;
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).post("/repo/create").send({
        name: "should-fail",
        description: "no auth",
      });

      expect(res.status).toBe(401);
    });

    it("should reject invalid repo name", async () => {
      const res = await request(app)
        .post("/repo/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "invalid name with spaces" });

      expect(res.status).toBe(400);
    });

    it("should reject duplicate repo name for same user", async () => {
      const res = await request(app)
        .post("/repo/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: `test-repo-${timestamp}` });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /repo/all", () => {
    it("should return paginated public repositories", async () => {
      const res = await request(app).get("/repo/all?page=1&limit=5");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("repositories");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toHaveProperty("page", 1);
      expect(res.body.pagination).toHaveProperty("limit", 5);
    });
  });

  describe("GET /repo/:id", () => {
    it("should return a repository by ID", async () => {
      const res = await request(app).get(`/repo/${repoId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", `test-repo-${timestamp}`);
      expect(res.body).toHaveProperty("owner");
    });

    it("should return 404 for non-existent repo", async () => {
      const res = await request(app).get("/repo/507f1f77bcf86cd799439011");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /repo/user/:userID", () => {
    it("should return user repositories", async () => {
      const res = await request(app).get(`/repo/user/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("repositories");
      expect(res.body.repositories.length).toBeGreaterThan(0);
    });
  });

  describe("PATCH /repo/toggle/:id", () => {
    it("should toggle visibility when owner", async () => {
      const res = await request(app)
        .patch(`/repo/toggle/${repoId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.repository.visibility).toBe(false);
    });
  });

  describe("DELETE /repo/delete/:id", () => {
    it("should delete repository when owner", async () => {
      const res = await request(app)
        .delete(`/repo/delete/${repoId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Repository deleted.");
    });
  });
});
