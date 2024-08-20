const mongoose = require("mongoose");
const Snippet = require("../models/snippetModel");
const SnippetService = require("../services/snippetService");

describe("Snippet Service", () => {
  let testUserId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/gitforge-test";
    await mongoose.connect(uri);
    testUserId = new mongoose.Types.ObjectId().toString();
  });

  afterAll(async () => {
    await Snippet.deleteMany({ author: testUserId });
    await mongoose.disconnect();
  });

  it("should create a snippet with files", async () => {
    const snippet = await SnippetService.create({
      title: "Test Snippet",
      description: "A test",
      files: [{ filename: "test.js", language: "javascript", content: "console.log('hi');" }],
      author: testUserId,
      visibility: true,
    });
    expect(snippet.title).toBe("Test Snippet");
    expect(snippet.files).toHaveLength(1);
    expect(snippet.files[0].filename).toBe("test.js");
  });

  it("should fail to create without files", async () => {
    await expect(SnippetService.create({ title: "Empty", files: [], author: testUserId }))
      .rejects.toThrow("At least one file is required.");
  });

  it("should list public snippets", async () => {
    const result = await SnippetService.discover({ page: 1, limit: 10 });
    expect(result).toHaveProperty("snippets");
    expect(result).toHaveProperty("pagination");
    expect(Array.isArray(result.snippets)).toBe(true);
  });

  it("should get snippet by id and increment view count", async () => {
    const created = await SnippetService.create({
      title: "View Test",
      files: [{ filename: "a.txt", language: "text", content: "hello" }],
      author: testUserId,
      visibility: true,
    });
    const snippet = await SnippetService.getById(created._id.toString(), testUserId);
    expect(snippet.viewCount).toBe(1);
    const again = await SnippetService.getById(created._id.toString(), testUserId);
    expect(again.viewCount).toBe(2);
  });

  it("should star and unstar a snippet", async () => {
    const created = await SnippetService.create({
      title: "Star Test",
      files: [{ filename: "b.txt", language: "text", content: "world" }],
      author: testUserId,
      visibility: true,
    });
    const starred = await SnippetService.star(created._id.toString(), testUserId);
    expect(starred.stars).toHaveLength(1);

    const unstarred = await SnippetService.unstar(created._id.toString(), testUserId);
    expect(unstarred.stars).toHaveLength(0);
  });

  it("should fork a snippet", async () => {
    const original = await SnippetService.create({
      title: "Fork Me",
      files: [{ filename: "c.txt", language: "text", content: "fork this" }],
      author: testUserId,
      visibility: true,
    });
    const otherUser = new mongoose.Types.ObjectId().toString();
    const forked = await SnippetService.fork(original._id.toString(), otherUser);
    expect(forked.forkOf.toString()).toBe(original._id.toString());
    expect(forked.author._id.toString()).toBe(otherUser);
  });

  it("should delete a snippet", async () => {
    const created = await SnippetService.create({
      title: "Delete Me",
      files: [{ filename: "d.txt", language: "text", content: "bye" }],
      author: testUserId,
    });
    const result = await SnippetService.delete(created._id.toString(), testUserId);
    expect(result.message).toBe("Snippet deleted.");
  });
});
