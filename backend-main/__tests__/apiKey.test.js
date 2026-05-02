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
  it("should create an API key with scopes", async () => {
    const res = await request(app)
      .post("/api-keys")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Test Key", scopes: ["repo:read", "repo:write"] });
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^gf_/);
    expect(res.body.scopes).toEqual(["repo:read", "repo:write"]);
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
