/**
 * Prometheus-compatible metrics collection and endpoint.
 * Uses simple in-memory counters and histograms — no external dependencies.
 */

// ── Counters ─────────────────────────────────────────────────────────────────

const counters = {
  http_requests_total: {},         // { "method:route:status": count }
  mongodb_operations_total: {},    // { "operation": count }
};

// ── Histograms ───────────────────────────────────────────────────────────────

const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

const histograms = {
  http_request_duration_seconds: {
    buckets: {},   // { "method:route": { bucket_le: count, sum, count } }
  },
};

// ── Gauges ───────────────────────────────────────────────────────────────────

let activeConnections = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRoute(url) {
  // Collapse MongoDB ObjectIds and UUIDs to :id
  return (url || "/")
    .split("?")[0]
    .replace(/\/[0-9a-fA-F]{24}/g, "/:id")
    .replace(/\/[0-9a-fA-F-]{36}/g, "/:id");
}

function getOrCreateHistogramEntry(metricName, labelKey) {
  const h = histograms[metricName];
  if (!h.buckets[labelKey]) {
    h.buckets[labelKey] = { sum: 0, count: 0 };
    for (const b of DURATION_BUCKETS) {
      h.buckets[labelKey][`le_${b}`] = 0;
    }
    h.buckets[labelKey]["le_+Inf"] = 0;
  }
  return h.buckets[labelKey];
}

function observeHistogram(metricName, labelKey, value) {
  const entry = getOrCreateHistogramEntry(metricName, labelKey);
  entry.sum += value;
  entry.count++;
  for (const b of DURATION_BUCKETS) {
    if (value <= b) entry[`le_${b}`]++;
  }
  entry["le_+Inf"]++;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a generic metric.
 * @param {string} name - Metric name (e.g. "mongodb_operations_total")
 * @param {object} labels - Label key-value pairs
 * @param {number} [value=1] - Value to increment by
 */
function recordMetric(name, labels = {}, value = 1) {
  if (name === "active_connections") {
    activeConnections += value;
    return;
  }

  if (counters[name]) {
    const labelKey = Object.values(labels).join(":");
    counters[name][labelKey] = (counters[name][labelKey] || 0) + value;
  }
}

/**
 * Express middleware: records http_requests_total, http_request_duration_seconds,
 * and tracks active connections.
 */
function metricsMiddleware(req, res, next) {
  activeConnections++;
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    activeConnections--;

    const route = normalizeRoute(req.originalUrl);
    const method = req.method;
    const status = res.statusCode;

    // Counter
    const counterKey = `${method}:${route}:${status}`;
    counters.http_requests_total[counterKey] =
      (counters.http_requests_total[counterKey] || 0) + 1;

    // Histogram
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    observeHistogram("http_request_duration_seconds", `${method}:${route}`, durationSec);
  });

  next();
}

/**
 * Format all metrics as Prometheus text exposition format.
 */
function formatMetrics() {
  const lines = [];

  // http_requests_total
  lines.push("# HELP http_requests_total Total number of HTTP requests.");
  lines.push("# TYPE http_requests_total counter");
  for (const [labelKey, count] of Object.entries(counters.http_requests_total)) {
    const [method, route, status] = labelKey.split(":");
    lines.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
  }

  // http_request_duration_seconds
  lines.push("# HELP http_request_duration_seconds HTTP request duration in seconds.");
  lines.push("# TYPE http_request_duration_seconds histogram");
  for (const [labelKey, entry] of Object.entries(histograms.http_request_duration_seconds.buckets)) {
    const [method, route] = labelKey.split(":");
    for (const b of DURATION_BUCKETS) {
      lines.push(`http_request_duration_seconds_bucket{method="${method}",route="${route}",le="${b}"} ${entry[`le_${b}`]}`);
    }
    lines.push(`http_request_duration_seconds_bucket{method="${method}",route="${route}",le="+Inf"} ${entry["le_+Inf"]}`);
    lines.push(`http_request_duration_seconds_sum{method="${method}",route="${route}"} ${entry.sum.toFixed(6)}`);
    lines.push(`http_request_duration_seconds_count{method="${method}",route="${route}"} ${entry.count}`);
  }

  // active_connections
  lines.push("# HELP active_connections Number of active HTTP connections.");
  lines.push("# TYPE active_connections gauge");
  lines.push(`active_connections ${activeConnections}`);

  // nodejs_memory_usage
  const mem = process.memoryUsage();
  lines.push("# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes.");
  lines.push("# TYPE nodejs_memory_usage_bytes gauge");
  lines.push(`nodejs_memory_usage_bytes{type="rss"} ${mem.rss}`);
  lines.push(`nodejs_memory_usage_bytes{type="heapTotal"} ${mem.heapTotal}`);
  lines.push(`nodejs_memory_usage_bytes{type="heapUsed"} ${mem.heapUsed}`);
  lines.push(`nodejs_memory_usage_bytes{type="external"} ${mem.external}`);

  // mongodb_operations_total
  lines.push("# HELP mongodb_operations_total Total MongoDB operations.");
  lines.push("# TYPE mongodb_operations_total counter");
  for (const [op, count] of Object.entries(counters.mongodb_operations_total)) {
    lines.push(`mongodb_operations_total{operation="${op}"} ${count}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Express route handler for GET /metrics.
 */
function metricsEndpoint(_req, res) {
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(formatMetrics());
}

module.exports = { metricsMiddleware, metricsEndpoint, recordMetric };
