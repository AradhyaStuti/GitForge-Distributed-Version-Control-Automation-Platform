const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Search & Health Endpoints", () => {
  describe("GET /", () => {
    it("should return API status", async () => {
      const res = await request(app).get("/");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("version", "1.0.0");
    });
  });

  describe("GET /health", () => {
    it("should return health check", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("uptime");
    });
  });

  describe("GET /search", () => {
    it("should search across repos, issues, and users", async () => {
      const res = await request(app).get("/search?q=test");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("query", "test");
      expect(res.body).toHaveProperty("results");
      expect(res.body.results).toHaveProperty("repositories");
      expect(res.body.results).toHaveProperty("issues");
      expect(res.body.results).toHaveProperty("users");
    });

    it("should reject empty search query", async () => {
      const res = await request(app).get("/search?q=");

      expect(res.status).toBe(400);
    });
  });
});
