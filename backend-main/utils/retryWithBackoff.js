/**
 * Retry utility with exponential backoff for webhook delivery and external calls.
 *
 * @param {Function} fn - Async function to retry
 * @param {object} [options]
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds
 * @param {number} [options.factor=2] - Exponential backoff factor
 * @param {boolean} [options.jitter=true] - Add random jitter to delay
 * @param {Function} [options.onRetry] - Callback (error, attempt) invoked before each retry
 * @returns {Promise<*>} Resolves with fn's result or rejects after all retries exhausted
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = true,
    onRetry,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      if (attempt >= maxRetries) break;

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);

      // Add jitter: random value between 0 and delay
      if (jitter) {
        delay = Math.floor(delay * (0.5 + Math.random() * 0.5));
      }

      if (typeof onRetry === "function") {
        onRetry(err, attempt + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = retryWithBackoff;
