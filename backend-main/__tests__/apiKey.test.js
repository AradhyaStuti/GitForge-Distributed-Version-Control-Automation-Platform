const request = require("supertest");
const { buildApp, connectDb, disconnectDb, signupTestUser } = require("./helpers/setup");
const User = require("../models/userModel");
const APIKey = require("../models/APIKey");

const app = buildApp();
let authToken;
let userId;
let emailRegex;

beforeAll(async () => {
  await connectDb();
  ({ authToken, userId, emailRegex } = await signupTestUser(app, "ak"));
});

afterAll(async () => {
  await APIKey.deleteMany({ owner: userId });
  await User.deleteMany({ email: emailRegex });
  await disconnectDb();
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
