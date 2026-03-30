const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const authMiddleware = require("../middleware/authMiddleware");
const { AppError, errorHandler, asyncHandler } = require("../middleware/errorHandler");

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
  });

  it("should pass with valid token and set userId", async () => {
    const token = jwt.sign({ id: "user123" }, config.jwtSecret, { expiresIn: "1h" });
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user123");
  });
});

describe("Error Handler", () => {
  it("should handle AppError with correct status code", async () => {
    const app = express();
    app.get("/err", (req, res, next) => { next(new AppError("Not found", 404)); });
    app.use(errorHandler);

    const res = await request(app).get("/err");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Not found");
  });

  it("asyncHandler should catch thrown errors", async () => {
    const app = express();
    app.get("/err", asyncHandler(async () => { throw new AppError("Bad request", 400); }));
    app.use(errorHandler);

    const res = await request(app).get("/err");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Bad request");
  });
});
