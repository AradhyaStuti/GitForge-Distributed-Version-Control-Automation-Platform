const express    = require("express");
const cors       = require("cors");
const mongoose   = require("mongoose");
const helmet     = require("helmet");
const morgan     = require("morgan");
const http       = require("http");
const { Server } = require("socket.io");
const config     = require("./config/env");
const mainRouter = require("./routes/main.router");
const { errorHandler }   = require("./middleware/errorHandler");
const { globalLimiter }  = require("./middleware/rateLimiter");
const requestTracing     = require("./middleware/requestTracing");
const { securityMiddleware } = require("./middleware/security");
const compressionMiddleware  = require("./middleware/compression");
const { metricsMiddleware, metricsEndpoint } = require("./config/metrics");
const { executeQuery }   = require("./config/graphql");

const yargs      = require("yargs");
const { hideBin } = require("yargs/helpers");

// ── Controllers ──────────────────────────────────────────────────────────────
const { initRepo }                                   = require("./controllers/init");
const { addRepo }                                    = require("./controllers/add");
const { commitRepo }                                 = require("./controllers/commit");
const { pushRepo }                                   = require("./controllers/push");
const { pullRepo }                                   = require("./controllers/pull");
const { revertRepo }                                 = require("./controllers/revert");
const { statusRepo }                                 = require("./controllers/status");
const { logRepo, reflogRepo }                        = require("./controllers/log");
const { diffRepo, showCommit }                       = require("./controllers/diff");
const { listBranches, createBranch, deleteBranch,
        checkoutBranch, mergeBranch }                = require("./controllers/branch");
const { createTag, listTags }                        = require("./controllers/tag");
const { stashSave, stashPop }                        = require("./controllers/stash");
const { addAll }                                     = require("./controllers/fileops");
const { resetRepo, blameFile, cloneRepo }            = require("./controllers/advanced");

// ── CLI Commands ──────────────────────────────────────────────────────────────
yargs(hideBin(process.argv))
  .usage("Usage: node index.js <command> [options]")

  .command("start", "Start the web server", {}, startServer)

  .command("init",   "Initialize a new repository",   {}, initRepo)
  .command("status", "Show staged files and branch",  {}, statusRepo)
  .command("add <file>", "Stage a file", (y) => y.positional("file", { type: "string" }), (argv) => addRepo(argv.file))
  .command("add-all", "Stage all files", {}, addAll)
  .command("commit <message>", "Commit staged files", (y) => y.positional("message", { type: "string" }), (argv) => commitRepo(argv.message))
  .command("push",  "Push commits to MongoDB",   {}, pushRepo)
  .command("pull",  "Pull commits from MongoDB",  {}, pullRepo)
  .command("clone <repoName>", "Clone a repository from MongoDB", (y) => y.positional("repoName", { type: "string" }), (argv) => cloneRepo(argv.repoName))
  .command("log",    "Show commit history",        {}, logRepo)
  .command("reflog", "Show history of HEAD changes", {}, reflogRepo)
  .command("show <commitID>", "Show commit details", (y) => y.positional("commitID", { type: "string" }), (argv) => showCommit(argv.commitID))
  .command("diff <file>", "Diff staged vs committed", (y) => y.positional("file", { type: "string" }), (argv) => diffRepo(argv.file))
  .command("blame <file>", "Show which commit touched each line", (y) => y.positional("file", { type: "string" }), (argv) => blameFile(argv.file))
  .command("branch", "List branches", {}, listBranches)
  .command("branch-create <name>", "Create a branch", (y) => y.positional("name", { type: "string" }), (argv) => createBranch(argv.name))
  .command("branch-delete <name>", "Delete a branch", (y) => y.positional("name", { type: "string" }), (argv) => deleteBranch(argv.name))
  .command("checkout <branch>", "Switch to a branch", (y) => y.positional("branch", { type: "string" }), (argv) => checkoutBranch(argv.branch))
  .command("merge <branch>", "Merge a branch", (y) => y.positional("branch", { type: "string" }), (argv) => mergeBranch(argv.branch))
  .command("tag <name>", "Create a tag", (y) => y.positional("name", { type: "string" }), (argv) => createTag(argv.name))
  .command("tag-list", "List all tags", {}, listTags)
  .command("stash", "Stash staged files", {}, stashSave)
  .command("stash-pop", "Restore latest stash", {}, stashPop)
  .command("revert <commitID>", "Restore to a commit", (y) => y.positional("commitID", { type: "string" }), (argv) => revertRepo(argv.commitID))
  .command("reset <commitID>", "Hard reset to a commit", (y) => y.positional("commitID", { type: "string" }), (argv) => resetRepo(argv.commitID))

  .demandCommand(1, "Please provide a command. Run --help to see all commands.")
  .help()
  .argv;

// ── Express Server ────────────────────────────────────────────────────────────
function startServer() {
  const app  = express();
  const port = config.port;

  // ── Request Tracing ────────────────────────────────────────────────────────
  app.use(requestTracing);

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(globalLimiter);
  app.use(...securityMiddleware);

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compressionMiddleware);

  // ── Metrics ───────────────────────────────────────────────────────────────
  app.use(metricsMiddleware);

  // ── Parsing ─────────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = config.allowedOrigins;

  app.use(
    cors({
      origin(origin, cb) {
        // Allow all localhost origins in development
        if (!origin || allowedOrigins.includes(origin) || (config.nodeEnv === "development" && origin?.startsWith("http://localhost"))) {
          return cb(null, true);
        }
        cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  // ── Logging ─────────────────────────────────────────────────────────────────
  const { requestLogger } = require("./middleware/logger");
  if (config.nodeEnv === "development") {
    app.use(morgan("dev"));
  } else {
    app.use(requestLogger);
  }

  // ── Metrics Endpoint ────────────────────────────────────────────────────────
  app.get("/metrics", metricsEndpoint);

  // ── GraphQL Endpoint ──────────────────────────────────────────────────────
  app.post("/graphql", express.json(), async (req, res) => {
    try {
      const { query, variables } = req.body;

      // Extract userId from JWT if present
      const context = {};
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const jwt = require("jsonwebtoken");
          const decoded = jwt.verify(authHeader.slice(7), config.jwtSecret);
          context.userId = decoded.id;
        } catch {
          // Unauthenticated — mutations that need auth will throw
        }
      }

      const result = await executeQuery(query, variables, context);
      res.json(result);
    } catch (err) {
      res.status(400).json({ errors: [{ message: err.message }] });
    }
  });

  // ── Routes (versioned) ────────────────────────────────────────────────────
  app.use("/api/v1", mainRouter);
  // Backward compatibility: mount same routes at root
  app.use("/", mainRouter);

  // ── Error Handling ──────────────────────────────────────────────────────────
  app.use(errorHandler);

  // ── Database ────────────────────────────────────────────────────────────────
  mongoose
    .connect(config.mongoUri)
    .then(() => console.log("MongoDB connected!"))
    .catch((err) => {
      console.error("Unable to connect to MongoDB:", err.message);
      process.exit(1);
    });

  // ── HTTP + Socket.IO ────────────────────────────────────────────────────────
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
  });

  // Store io on app for use in controllers
  app.set("io", io);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("joinRoom", (userID) => {
      socket.join(userID);
      console.log(`User ${userID} joined room`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log("HTTP server closed.");
      mongoose.connection.close(false).then(() => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });
    setTimeout(() => { console.error("Forced shutdown."); process.exit(1); }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

  httpServer.listen(port, () => {
    console.log(`Gitless Forge API running on http://localhost:${port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`GraphQL:     http://localhost:${port}/graphql`);
    console.log(`Metrics:     http://localhost:${port}/metrics`);
    console.log(`API Docs:    http://localhost:${port}/api/v1/docs`);
  });
}

module.exports = { startServer };
