const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await User.deleteMany({ email: /^test_jest_/ });
  await mongoose.connection.close();
});

describe("Auth Endpoints", () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_jest_${Date.now()}@example.com`,
    password: "TestPass123",
  };

  let authToken; // eslint-disable-line no-unused-vars
  let userId;

  describe("POST /signup", () => {
    it("should create a new user and return token", async () => {
      const res = await request(app).post("/signup").send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("userId");
      expect(res.body).toHaveProperty("username", testUser.username);

      authToken = res.body.token;
      userId = res.body.userId;
    });

    it("should reject duplicate username", async () => {
      const res = await request(app).post("/signup").send({
        ...testUser,
        email: `test_jest_dup_${Date.now()}@example.com`,
      });

      expect(res.status).toBe(409);
    });

    it("should reject invalid email", async () => {
      const res = await request(app).post("/signup").send({
        username: "validuser",
        email: "not-an-email",
        password: "TestPass123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
    });

    it("should reject weak password", async () => {
      const res = await request(app).post("/signup").send({
        username: "validuser2",
        email: "test_jest_weak@example.com",
        password: "123",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /login", () => {
    it("should login with valid credentials", async () => {
      const res = await request(app).post("/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("userId");
    });

    it("should reject invalid password", async () => {
      const res = await request(app).post("/login").send({
        email: testUser.email,
        password: "WrongPassword1",
      });

      expect(res.status).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const res = await request(app).post("/login").send({
        email: "nobody@example.com",
        password: "whatever1A",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /userProfile/:id", () => {
    it("should return user profile without password", async () => {
      const res = await request(app).get(`/userProfile/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("username", testUser.username);
      expect(res.body).not.toHaveProperty("password");
    });

    it("should return 400 for invalid ID format", async () => {
      const res = await request(app).get("/userProfile/invalid-id");

      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get(`/userProfile/507f1f77bcf86cd799439011`);

      expect(res.status).toBe(404);
    });
  });
});
