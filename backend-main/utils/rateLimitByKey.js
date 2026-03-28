/**
 * Per-user / per-key rate limiting utility using an in-memory sliding window.
 */

class RateLimiter {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultLimit=100] - Default request limit per window
   * @param {number} [options.defaultWindowMs=60000] - Default window in milliseconds
   * @param {number} [options.cleanupIntervalMs=60000] - Interval for cleaning expired entries
   */
  constructor(options = {}) {
    this.defaultLimit = options.defaultLimit || 100;
    this.defaultWindowMs = options.defaultWindowMs || 60000;
    this._entries = new Map();

    // Auto-cleanup of expired entries
    this._cleanupInterval = setInterval(() => this._cleanup(), options.cleanupIntervalMs || 60000);
    // Allow the process to exit even if the interval is active
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  /**
   * Check whether a key is within its rate limit using a sliding window.
   *
   * @param {string} key - Unique key (e.g. userId, IP, API key prefix)
   * @param {number} [limit] - Maximum requests allowed in the window
   * @param {number} [windowMs] - Window duration in milliseconds
   * @returns {{ allowed: boolean, remaining: number, resetAt: Date }}
   */
  check(key, limit, windowMs) {
    const maxRequests = limit || this.defaultLimit;
    const window = windowMs || this.defaultWindowMs;
    const now = Date.now();
    const windowStart = now - window;

    let entry = this._entries.get(key);
    if (!entry) {
      entry = { timestamps: [], windowMs: window };
      this._entries.set(key, entry);
    }

    // Slide the window: remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const currentCount = entry.timestamps.length;
    const allowed = currentCount < maxRequests;

    if (allowed) {
      entry.timestamps.push(now);
    }

    const resetAt = new Date(
      entry.timestamps.length > 0 ? entry.timestamps[0] + window : now + window
    );

    return {
      allowed,
      remaining: Math.max(0, maxRequests - entry.timestamps.length),
      resetAt,
    };
  }

  /**
   * Reset the rate limit for a key.
   * @param {string} key
   */
  reset(key) {
    this._entries.delete(key);
  }

  /**
   * Get statistics about the current rate limiter state.
   * @returns {{ totalKeys: number, entries: object }}
   */
  getStats() {
    const entries = {};
    for (const [key, entry] of this._entries) {
      entries[key] = {
        requests: entry.timestamps.length,
        oldestRequest: entry.timestamps.length > 0 ? new Date(entry.timestamps[0]) : null,
        newestRequest:
          entry.timestamps.length > 0 ? new Date(entry.timestamps[entry.timestamps.length - 1]) : null,
      };
    }
    return { totalKeys: this._entries.size, entries };
  }

  /**
   * Remove expired entries from the map.
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this._entries) {
      const window = entry.windowMs || this.defaultWindowMs;
      entry.timestamps = entry.timestamps.filter((ts) => ts > now - window);
      if (entry.timestamps.length === 0) {
        this._entries.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for graceful shutdown / testing).
   */
  destroy() {
    clearInterval(this._cleanupInterval);
  }
}

module.exports = RateLimiter;
