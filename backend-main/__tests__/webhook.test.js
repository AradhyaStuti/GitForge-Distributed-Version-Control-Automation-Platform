const mongoose = require("mongoose");
const Webhook = require("../models/webhookModel");
const WebhookService = require("../services/webhookService");

describe("Webhook Service", () => {
  let testUserId, testRepoId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/gitforge-test";
    await mongoose.connect(uri);
    testUserId = new mongoose.Types.ObjectId().toString();
    testRepoId = new mongoose.Types.ObjectId().toString();
  });

  afterAll(async () => {
    await Webhook.deleteMany({ owner: testUserId });
    await mongoose.disconnect();
  });

  it("should create a webhook", async () => {
    const wh = await WebhookService.create({
      url: "https://example.com/hook",
      events: ["repo.created", "push"],
      repository: testRepoId,
      owner: testUserId,
    });
    expect(wh.url).toBe("https://example.com/hook");
    expect(wh.events).toContain("push");
    expect(wh.active).toBe(true);
  });

  it("should list webhooks for a repo", async () => {
    const webhooks = await WebhookService.list(testRepoId, testUserId);
    expect(Array.isArray(webhooks)).toBe(true);
    expect(webhooks.length).toBeGreaterThan(0);
  });

  it("should update a webhook", async () => {
    const created = await WebhookService.create({
      url: "https://example.com/hook2",
      events: ["issue.created"],
      repository: testRepoId,
      owner: testUserId,
    });
    const updated = await WebhookService.update(created._id.toString(), testUserId, { active: false });
    expect(updated.active).toBe(false);
  });

  it("should delete a webhook", async () => {
    const created = await WebhookService.create({
      url: "https://example.com/hook3",
      events: ["star"],
      repository: testRepoId,
      owner: testUserId,
    });
    const result = await WebhookService.delete(created._id.toString(), testUserId);
    expect(result.message).toBe("Webhook deleted.");
  });

  it("should not find webhook for wrong owner", async () => {
    const created = await WebhookService.create({
      url: "https://example.com/hook4",
      events: ["fork"],
      repository: testRepoId,
      owner: testUserId,
    });
    const otherUser = new mongoose.Types.ObjectId().toString();
    await expect(WebhookService.getById(created._id.toString(), otherUser))
      .rejects.toThrow("Webhook not found.");
  });
});
