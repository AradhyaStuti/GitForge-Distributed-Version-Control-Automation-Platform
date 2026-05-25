const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const mainRouter = require("../../routes/main.router");
const { errorHandler } = require("../../middleware/errorHandler");

// thin wrappers around the same supertest/mongo dance every suite was redoing.
// kept dumb on purpose -- if a test needs different middleware it can build its own app.

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", mainRouter);
  app.use(errorHandler);
  return app;
}

async function connectDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

async function disconnectDb() {
  await mongoose.connection.close();
}

// signs up a fresh user keyed by `prefix` so test files don't collide.
// returns the token + ids tests need to authenticate follow-up calls.
async function signupTestUser(app, prefix) {
  const stamp = Date.now();
  const res = await request(app).post("/signup").send({
    username: `${prefix}_${stamp}`,
    email: `test_jest_${prefix}_${stamp}@example.com`,
    password: "TestPass123",
  });
  return {
    authToken: res.body.token,
    userId: res.body.userId,
    emailRegex: new RegExp(`^test_jest_${prefix}_`),
  };
}

module.exports = { buildApp, connectDb, disconnectDb, signupTestUser };
