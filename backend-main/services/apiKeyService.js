'use strict';

const APIKey = require("../models/APIKey");
const { AppError } = require("../middleware/errorHandler");

class APIKeyService {
  async createKey(userId, { name, scopes, expiresIn }) {
    if (!name) throw new AppError("API key name is required.", 400);
    if (!scopes || scopes.length === 0) throw new AppError("At least one scope is required.", 400);

    const plainKey = APIKey.generateKey();
    const hashedKey = APIKey.hashKey(plainKey);
    const prefix = plainKey.substring(0, 8);

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn);
    }

    const apiKey = await APIKey.create({
      name,
      key: hashedKey,
      prefix,
      owner: userId,
      scopes,
      expiresAt,
    });

    // Return the plain key only once
    return {
      _id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      key: plainKey,
    };
  }

  async listKeys(userId) {
    const keys = await APIKey.find({ owner: userId })
      .select("-key")
      .sort({ createdAt: -1 });

    return keys;
  }

  async revokeKey(keyId, userId) {
    const apiKey = await APIKey.findOne({ _id: keyId, owner: userId });
    if (!apiKey) throw new AppError("API key not found.", 404);

    if (!apiKey.isActive) throw new AppError("API key is already revoked.", 400);

    apiKey.isActive = false;
    await apiKey.save();
    return { message: "API key revoked." };
  }

  async validateKey(plainKey) {
    if (!plainKey || !plainKey.startsWith("gf_")) {
      throw new AppError("Invalid API key format.", 401);
    }

    const hashedKey = APIKey.hashKey(plainKey);
    const apiKey = await APIKey.findOne({ key: hashedKey });

    if (!apiKey) throw new AppError("Invalid API key.", 401);

    if (!apiKey.isActive) throw new AppError("API key has been revoked.", 401);

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new AppError("API key has expired.", 401);
    }

    apiKey.lastUsedAt = new Date();
    apiKey.usageCount += 1;
    await apiKey.save();

    return apiKey;
  }

  async rotateKey(keyId, userId) {
    const existing = await APIKey.findOne({ _id: keyId, owner: userId });
    if (!existing) throw new AppError("API key not found.", 404);

    // Revoke old key
    existing.isActive = false;
    await existing.save();

    // Create new key with same config
    const newKey = await this.createKey(userId, {
      name: existing.name,
      scopes: existing.scopes,
      expiresIn: existing.expiresAt
        ? existing.expiresAt.getTime() - existing.createdAt.getTime()
        : null,
    });

    return newKey;
  }

  async getKeyUsageStats(userId) {
    const keys = await APIKey.find({ owner: userId }).lean();

    const totalKeys = keys.length;
    const activeKeys = keys.filter((k) => k.isActive).length;
    const revokedKeys = keys.filter((k) => !k.isActive).length;
    const expiredKeys = keys.filter((k) => k.expiresAt && k.expiresAt < new Date()).length;
    const totalUsage = keys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

    const mostUsed = keys
      .filter((k) => k.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map((k) => ({ name: k.name, prefix: k.prefix, usageCount: k.usageCount }));

    return { totalKeys, activeKeys, revokedKeys, expiredKeys, totalUsage, mostUsed };
  }
}

module.exports = new APIKeyService();
