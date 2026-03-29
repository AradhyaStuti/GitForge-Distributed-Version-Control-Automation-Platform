const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mainRouter = require("../routes/main.router");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../models/userModel");
const AuditLog = require("../models/AuditLog");

const app = express();
app.use(express.json());
app.use("/", mainRouter);
app.use(errorHandler);

let authToken;
let userId;
let fakeResourceId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const signupRes = await request(app).post("/signup").send({
    username: `audit_user_${Date.now()}`,
    email: `test_jest_audit_${Date.now()}@example.com`,
    password: "TestPass123",
  });
  authToken = signupRes.body.token;
  userId = signupRes.body.userId;

  // Seed some audit log entries
  fakeResourceId = new mongoose.Types.ObjectId();
  await AuditLog.create([
    { actor: userId, action: "user.login", status: "success" },
    { actor: userId, action: "repo.create", status: "success", resource: { type: "repository", id: fakeResourceId } },
    { actor: userId, action: "apikey.create", status: "success" },
  ]);
});

afterAll(async () => {
  await AuditLog.deleteMany({ actor: userId });
  await User.deleteMany({ email: /^test_jest_audit_/ });
  await mongoose.connection.close();
});

describe("Audit Log Endpoints", () => {
  describe("GET /audit/me", () => {
    it("should return audit logs for the authenticated user", async () => {
      const res = await request(app)
        .get("/audit/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe("GET /audit/security", () => {
    it("should return security-related events", async () => {
      const res = await request(app)
        .get("/audit/security")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      // Should include user.login and apikey.create
      const actions = res.body.logs.map((l) => l.action);
      expect(actions).toEqual(expect.arrayContaining(["user.login"]));
    });
  });

  describe("GET /audit/stats", () => {
    it("should return audit statistics", async () => {
      const res = await request(app)
        .get("/audit/stats")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("actionCounts");
      expect(res.body).toHaveProperty("statusCounts");
      expect(res.body).toHaveProperty("dailyActivity");
    });
  });

  describe("GET /audit/resource/:type/:id", () => {
    it("should return logs for a specific resource", async () => {
      const res = await request(app)
        .get(`/audit/resource/repository/${fakeResourceId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
