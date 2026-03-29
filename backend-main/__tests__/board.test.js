const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const ProjectBoard = require("../models/ProjectBoard");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let repoId;
let boardId;
let columnId;
let cardId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const signupRes = await request(app).post("/signup").send({
    username: `board_user_${Date.now()}`,
    email: `test_jest_board_${Date.now()}@example.com`,
    password: "TestPass123",
  });
  authToken = signupRes.body.token;
  userId = signupRes.body.userId;

  const repoRes = await request(app)
    .post("/repo/create")
    .set("Authorization", `Bearer ${authToken}`)
    .send({ name: `board-repo-${Date.now()}`, visibility: true });
  repoId = repoRes.body.repository?._id || repoRes.body._id;
});

afterAll(async () => {
  await ProjectBoard.deleteMany({ owner: userId });
  await Repository.deleteMany({ owner: userId });
  await User.deleteMany({ email: /^test_jest_board_/ });
  await mongoose.connection.close();
});

describe("Project Board Endpoints", () => {
  describe("POST /boards", () => {
    it("should create a new board", async () => {
      const res = await request(app)
        .post("/boards")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Sprint Board", repository: repoId });

      expect(res.status).toBe(201);
      expect(res.body.board).toBeDefined();
      expect(res.body.board.name).toBe("Sprint Board");
      boardId = res.body.board._id;
    });
  });

  describe("GET /boards", () => {
    it("should list boards", async () => {
      const res = await request(app)
        .get(`/boards?repository=${repoId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.boards).toBeDefined();
      expect(res.body.boards.length).toBeGreaterThan(0);
    });
  });

  describe("GET /boards/:id", () => {
    it("should get a board by ID", async () => {
      const res = await request(app)
        .get(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(boardId);
    });
  });

  describe("POST /boards/:id/columns", () => {
    it("should have default columns on creation", async () => {
      const res = await request(app)
        .get(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Board ships with 5 default columns
      expect(res.body.columns.length).toBe(5);
      columnId = res.body.columns[0].id;
    });

    it("should add a new column to the board", async () => {
      const res = await request(app)
        .post(`/boards/${boardId}/columns`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Custom", color: "#ef4444" });

      expect(res.status).toBe(201);
      expect(res.body.board.columns.length).toBe(6);
      const custom = res.body.board.columns.find((c) => c.name === "Custom");
      expect(custom).toBeDefined();
    });
  });

  describe("POST /boards/:id/columns/:columnId/cards", () => {
    it("should add a card to a column", async () => {
      const res = await request(app)
        .post(`/boards/${boardId}/columns/${columnId}/cards`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Implement feature X", priority: "high" });

      expect(res.status).toBe(201);
      const col = res.body.board.columns.find((c) => c.id === columnId);
      expect(col.cards.length).toBe(1);
      expect(col.cards[0].title).toBe("Implement feature X");
      cardId = col.cards[0].id;
    });
  });

  describe("PUT /boards/:id/columns/:columnId/cards/:cardId", () => {
    it("should update a card", async () => {
      const res = await request(app)
        .put(`/boards/${boardId}/columns/${columnId}/cards/${cardId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated title", priority: "critical" });

      expect(res.status).toBe(200);
      const col = res.body.board.columns.find((c) => c.id === columnId);
      const card = col.cards.find((c) => c.id === cardId);
      expect(card.title).toBe("Updated title");
      expect(card.priority).toBe("critical");
    });
  });

  describe("DELETE /boards/:id/columns/:columnId/cards/:cardId", () => {
    it("should delete a card", async () => {
      const res = await request(app)
        .delete(`/boards/${boardId}/columns/${columnId}/cards/${cardId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const col = res.body.board.columns.find((c) => c.id === columnId);
      expect(col.cards.length).toBe(0);
    });
  });

  describe("DELETE /boards/:id", () => {
    it("should delete the board", async () => {
      const res = await request(app)
        .delete(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Project board deleted.");
    });
  });
});
