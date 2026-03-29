const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const APIKey = require("../models/APIKey");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let apiKeyId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const signupRes = await request(app).post("/signup").send({
    username: `ak_user_${Date.now()}`,
    email: `test_jest_ak_${Date.now()}@example.com`,
    password: "TestPass123",
  });
  authToken = signupRes.body.token;
  userId = signupRes.body.userId;
});

afterAll(async () => {
  await APIKey.deleteMany({ owner: userId });
  await User.deleteMany({ email: /^test_jest_ak_/ });
  await mongoose.connection.close();
});

describe("API Key Endpoints", () => {
  describe("POST /api-keys", () => {
    it("should create an API key", async () => {
      const res = await request(app)
        .post("/api-keys")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test Key", scopes: ["repo:read", "repo:write"] });

      expect(res.status).toBe(201);
      expect(res.body.key).toBeDefined();
      expect(res.body.key).toMatch(/^gf_/);
      expect(res.body.name).toBe("Test Key");
      expect(res.body.scopes).toEqual(["repo:read", "repo:write"]);
      apiKeyId = res.body._id;
    });

    it("should reject key without name", async () => {
      const res = await request(app)
        .post("/api-keys")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ scopes: ["repo:read"] });

      expect(res.status).toBe(400);
    });

    it("should reject key without scopes", async () => {
      const res = await request(app)
        .post("/api-keys")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "No Scopes" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api-keys", () => {
    it("should list user API keys without exposing key hash", async () => {
      const res = await request(app)
        .get("/api-keys")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.keys).toBeDefined();
      expect(res.body.keys.length).toBeGreaterThan(0);
      // Should not expose the hashed key
      for (const key of res.body.keys) {
        expect(key.key).toBeUndefined();
      }
    });
  });

  describe("GET /api-keys/usage", () => {
    it("should return usage stats", async () => {
      const res = await request(app)
        .get("/api-keys/usage")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalKeys");
      expect(res.body).toHaveProperty("activeKeys");
      expect(res.body).toHaveProperty("totalUsage");
    });
  });

  describe("POST /api-keys/:id/rotate", () => {
    it("should rotate an API key", async () => {
      const res = await request(app)
        .post(`/api-keys/${apiKeyId}/rotate`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.key).toBeDefined();
      expect(res.body.key).toMatch(/^gf_/);
      // New key should have a different ID
      expect(res.body._id).not.toBe(apiKeyId);
    });
  });

  describe("DELETE /api-keys/:id", () => {
    it("should revoke an API key", async () => {
      // Create a key to revoke
      const createRes = await request(app)
        .post("/api-keys")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "To Revoke", scopes: ["repo:read"] });

      const res = await request(app)
        .delete(`/api-keys/${createRes.body._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("API key revoked.");
    });
  });
});
