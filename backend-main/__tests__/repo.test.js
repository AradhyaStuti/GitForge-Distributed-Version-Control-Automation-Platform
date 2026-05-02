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
  it("should create a repository when authenticated", async () => {
    const res = await request(app)
      .post("/repo/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: `test-repo-${timestamp}`, description: "A test repository", visibility: true });

    expect(res.status).toBe(201);
    expect(res.body.repository).toHaveProperty("name", `test-repo-${timestamp}`);
    repoId = res.body.repository._id;
  });

  it("should reject unauthenticated requests", async () => {
    const res = await request(app).post("/repo/create").send({ name: "should-fail" });
    expect(res.status).toBe(401);
  });

  it("should return a repository by ID", async () => {
    const res = await request(app).get(`/repo/${repoId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name", `test-repo-${timestamp}`);
  });

  it("should return 404 for non-existent repo", async () => {
    const res = await request(app).get("/repo/507f1f77bcf86cd799439011");
    expect(res.status).toBe(404);
  });
});
