const request = require("supertest");
const { buildApp, connectDb, disconnectDb, signupTestUser } = require("./helpers/setup");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const ProjectBoard = require("../models/ProjectBoard");

const app = buildApp();
let authToken;
let userId;
let emailRegex;
let repoId;
let boardId;

beforeAll(async () => {
  await connectDb();
  ({ authToken, userId, emailRegex } = await signupTestUser(app, "board"));

  const repoRes = await request(app)
    .post("/repo/create")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ name: `board-repo-${Date.now()}`, visibility: true });
  repoId = repoRes.body.repository?._id || repoRes.body._id;
});

afterAll(async () => {
  await ProjectBoard.deleteMany({ owner: userId });
  await Repository.deleteMany({ owner: userId });
  await User.deleteMany({ email: emailRegex });
  await disconnectDb();
});

describe("Board Endpoints", () => {
  it("should create a board with default columns", async () => {
    const res = await request(app)
      .post("/boards")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Sprint Board", repository: repoId });
    expect(res.status).toBe(201);
    expect(res.body.board.name).toBe("Sprint Board");
    expect(res.body.board.columns.length).toBe(5);
    boardId = res.body.board._id;
  });

  it("should list boards for a repo", async () => {
    const res = await request(app)
      .get(`/boards?repository=${repoId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.boards.length).toBeGreaterThan(0);
  });

  it("should get a board by ID", async () => {
    const res = await request(app)
      .get(`/boards/${boardId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(boardId);
    expect(res.body.columns.length).toBe(5);
  });

  it("should return 404 for non-existent board", async () => {
    const res = await request(app)
      .get("/boards/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });
});
