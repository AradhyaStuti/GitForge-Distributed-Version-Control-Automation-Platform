const { logger } = require("./logger");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error.";

  if (!err.isOperational) {
    logger.error("Unhandled error", {
      message: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.userId || "anonymous",
    });
  } else if (statusCode >= 500) {
    logger.error("Operational server error", {
      message: err.message,
      method: req.method,
      url: req.originalUrl,
    });
  }

  res.status(statusCode).json({
    status: "error",
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { AppError, errorHandler, asyncHandler };
