const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const authMiddleware = require("../middleware/authMiddleware");
const { AppError, errorHandler, asyncHandler } = require("../middleware/errorHandler");

// ── Auth Middleware Tests ─────────────────────────────────────────────────────
describe("Auth Middleware", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get("/protected", authMiddleware, (req, res) => {
      res.json({ userId: req.userId });
    });
    app.use(errorHandler);
  });

  it("should reject requests without authorization header", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it("should reject requests with malformed header", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "NotBearer token123");
    expect(res.status).toBe(401);
  });

  it("should reject expired tokens", async () => {
    const token = jwt.sign({ id: "user123" }, config.jwtSecret, { expiresIn: "0s" });

    // Wait a moment for expiry
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("should reject tokens with wrong secret", async () => {
    const token = jwt.sign({ id: "user123" }, "wrong-secret", { expiresIn: "1h" });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it("should pass with valid token and set userId", async () => {
    const token = jwt.sign({ id: "user123" }, config.jwtSecret, { expiresIn: "1h" });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user123");
  });
});

// ── Error Handler Tests ──────────────────────────────────────────────────────
describe("Error Handler", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it("should handle AppError with correct status code", async () => {
    app.get("/err", (req, res, next) => {
      next(new AppError("Not found", 404));
    });
    app.use(errorHandler);

    const res = await request(app).get("/err");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Not found");
  });

  it("should return 500 for unknown errors", async () => {
    app.get("/err", (req, res, next) => {
      next(new Error("something broke"));
    });
    app.use(errorHandler);

    const res = await request(app).get("/err");
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error.");
  });

  it("asyncHandler should catch thrown errors", async () => {
    app.get(
      "/err",
      asyncHandler(async () => {
        throw new AppError("Bad request", 400);
      })
    );
    app.use(errorHandler);

    const res = await request(app).get("/err");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Bad request");
  });
});

// ── Validation Middleware Tests ───────────────────────────────────────────────
describe("Validation Middleware", () => {
  let app;

  beforeAll(() => {
    const { signupRules, createRepoRules, mongoIdParam } = require("../middleware/validate");

    app = express();
    app.use(express.json());

    app.post("/test-signup", signupRules, (req, res) => res.json({ ok: true }));
    app.post("/test-repo", createRepoRules, (req, res) => res.json({ ok: true }));
    app.get("/test-id/:id", mongoIdParam, (req, res) => res.json({ ok: true }));
  });

  it("should reject signup with short username", async () => {
    const res = await request(app).post("/test-signup").send({
      username: "ab",
      email: "test@test.com",
      password: "TestPass123",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("username");
  });

  it("should reject signup with weak password (no uppercase)", async () => {
    const res = await request(app).post("/test-signup").send({
      username: "testuser",
      email: "test@test.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
  });

  it("should accept valid signup", async () => {
    const res = await request(app).post("/test-signup").send({
      username: "testuser",
      email: "test@test.com",
      password: "TestPass123",
    });
    expect(res.status).toBe(200);
  });

  it("should reject repo name with spaces", async () => {
    const res = await request(app).post("/test-repo").send({
      name: "invalid name with spaces",
    });
    expect(res.status).toBe(400);
  });

  it("should accept valid repo name", async () => {
    const res = await request(app).post("/test-repo").send({
      name: "valid-repo.name_123",
    });
    expect(res.status).toBe(200);
  });

  it("should reject invalid MongoDB ID", async () => {
    const res = await request(app).get("/test-id/not-a-valid-id");
    expect(res.status).toBe(400);
  });

  it("should accept valid MongoDB ID", async () => {
    const res = await request(app).get("/test-id/507f1f77bcf86cd799439011");
    expect(res.status).toBe(200);
  });
});
