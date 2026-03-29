'use strict';

const { execFile } = require("child_process");
const Pipeline = require("../models/Pipeline");
const Repository = require("../models/repoModel");
const { AppError } = require("../middleware/errorHandler");

const DEFAULT_STEP_TIMEOUT = 60_000;
const MAX_OUTPUT_SIZE = 512 * 1024; // 512 KB

// Deny-list: block shell metacharacters and dangerous commands
const DANGEROUS_PATTERNS = [
  /;\s*(rm|del|format|mkfs|dd)\b/i,
  /\|.*\b(bash|sh|cmd|powershell)\b/i,
  />\s*\/dev\/sd/i,
  /\$\(.*\)/,       // command substitution
  /`.*`/,           // backtick substitution
];

function validateCommand(command) {
  if (!command || typeof command !== "string" || command.trim().length === 0) {
    throw new AppError("Pipeline step command must be a non-empty string.", 400);
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      throw new AppError(`Pipeline step command blocked by security policy: ${command}`, 400);
    }
  }
}

function runCommand(command, { timeout = DEFAULT_STEP_TIMEOUT, env } = {}) {
  return new Promise((resolve) => {
    const mergedEnv = env ? { ...process.env, ...env } : process.env;
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/sh";
    const shellArgs = isWin ? ["/c", command] : ["-c", command];

    const child = execFile(shell, shellArgs, { timeout, env: mergedEnv, maxBuffer: MAX_OUTPUT_SIZE }, (err, stdout, stderr) => {
      const output = (stdout || "") + (stderr ? `\n${stderr}` : "");
      if (err) {
        resolve({ exitCode: err.code ?? 1, output: output || err.message });
      } else {
        resolve({ exitCode: 0, output });
      }
    });
    child.on("error", (err) => {
      resolve({ exitCode: 1, output: err.message });
    });
  });
}

class PipelineService {
  // ── Controller-facing methods (match pipelineController.js signatures) ──

  async create({ name, repository, config, createdBy }) {
    const repo = await Repository.findById(repository);
    if (!repo) throw new AppError("Repository not found.", 404);

    if (!config || !config.stages || config.stages.length === 0) {
      throw new AppError("Pipeline config must include at least one stage.", 400);
    }

    for (const stage of config.stages) {
      if (!stage.steps || stage.steps.length === 0) {
        throw new AppError(`Stage "${stage.name}" must include at least one step.`, 400);
      }
      for (const step of stage.steps) {
        validateCommand(step.command);
      }
    }

    const existing = await Pipeline.findOne({ repository, name });
    if (existing) throw new AppError("A pipeline with this name already exists for this repository.", 409);

    return Pipeline.create({ name, repository, owner: createdBy, config });
  }

  async list({ repository, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (repository) filter.repository = repository;
    const skip = (page - 1) * limit;

    const [pipelines, total] = await Promise.all([
      Pipeline.find(filter)
        .populate("owner", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Pipeline.countDocuments(filter),
    ]);

    return { pipelines, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const pipeline = await Pipeline.findById(id)
      .populate("owner", "username email")
      .populate("repository", "name owner");
    if (!pipeline) throw new AppError("Pipeline not found.", 404);
    return pipeline;
  }

  async update(id, userId, data) {
    const pipeline = await Pipeline.findById(id);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    if (data.config) {
      for (const stage of data.config.stages || []) {
        for (const step of stage.steps || []) {
          validateCommand(step.command);
        }
      }
    }

    const allowed = ["name", "config"];
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) pipeline[key] = data[key];
    }

    await pipeline.save();
    return pipeline;
  }

  async delete(id, userId) {
    const pipeline = await Pipeline.findByIdAndDelete(id);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);
    return { message: "Pipeline deleted." };
  }

  async triggerRun(pipelineId, userId, { branch, commitSha } = {}) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    const runNumber = pipeline.totalRuns + 1;

    const stages = pipeline.config.stages.map((stage) => ({
      name: stage.name,
      status: "pending",
      steps: stage.steps.map((step) => ({
        name: step.name,
        command: step.command,
        status: "pending",
      })),
    }));

    const run = {
      runNumber,
      trigger: "manual",
      triggerBy: userId,
      branch: branch || "main",
      commitSha: commitSha || "",
      status: "queued",
      stages,
      startedAt: new Date(),
    };

    pipeline.runs.push(run);
    pipeline.totalRuns = runNumber;
    pipeline.status = "running";
    pipeline.lastRunAt = new Date();
    await pipeline.save();

    this.executeRun(pipeline, pipeline.runs.length - 1).catch((err) => {
      console.error(`Pipeline execution error [${pipelineId}]: ${err.message}`);
    });

    return pipeline;
  }

  async cancelRun(pipelineId, runNumber, userId) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    const run = pipeline.runs.find((r) => r.runNumber === Number(runNumber));
    if (!run) throw new AppError("Run not found.", 404);

    if (run.status !== "queued" && run.status !== "running") {
      throw new AppError("Can only cancel queued or running runs.", 400);
    }

    run.status = "cancelled";
    run.completedAt = new Date();
    run.duration = run.completedAt - run.startedAt;

    for (const stage of run.stages) {
      if (stage.status === "pending" || stage.status === "running") {
        stage.status = "skipped";
        for (const step of stage.steps) {
          if (step.status === "pending" || step.status === "running") {
            step.status = "skipped";
          }
        }
      }
    }

    pipeline.status = "cancelled";
    await pipeline.save();
    return pipeline;
  }

  async getRunLogs(pipelineId, runNumber) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    const run = pipeline.runs.find((r) => r.runNumber === Number(runNumber));
    if (!run) throw new AppError("Run not found.", 404);

    const logs = [];
    for (const stage of run.stages) {
      logs.push(`=== Stage: ${stage.name} [${stage.status}] ===`);
      for (const step of stage.steps) {
        logs.push(`  > ${step.name}: ${step.status} (exit: ${step.exitCode ?? "N/A"}, ${step.duration ?? 0}ms)`);
        if (step.output) logs.push(`    ${step.output}`);
      }
    }

    return { runNumber: run.runNumber, status: run.status, logs: logs.join("\n"), duration: run.duration };
  }

  async getStats(repoId) {
    const pipelines = await Pipeline.find({ repository: repoId }).lean();

    let totalRuns = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    let durationCount = 0;

    for (const pipeline of pipelines) {
      totalRuns += pipeline.totalRuns;
      for (const run of pipeline.runs) {
        if (run.status === "success") totalSuccess++;
        if (run.status === "failed") totalFailed++;
        if (run.duration) {
          totalDuration += run.duration;
          durationCount++;
        }
      }
    }

    return {
      totalPipelines: pipelines.length,
      totalRuns,
      totalSuccess,
      totalFailed,
      successRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0,
      averageDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    };
  }

  async getBadge(pipelineId) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    const status = pipeline.status || "idle";
    const color = { success: "#22c55e", failed: "#ef4444", running: "#3b82f6", idle: "#6b7280", cancelled: "#f59e0b" }[status] || "#6b7280";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
      <rect width="120" height="20" rx="3" fill="#555"/>
      <rect x="60" width="60" height="20" rx="3" fill="${color}"/>
      <text x="30" y="14" fill="#fff" font-family="sans-serif" font-size="11" text-anchor="middle">pipeline</text>
      <text x="90" y="14" fill="#fff" font-family="sans-serif" font-size="11" text-anchor="middle">${status}</text>
    </svg>`;
  }

  async executeRun(pipeline, runIndex) {
    const reloaded = await Pipeline.findById(pipeline._id);
    if (!reloaded) return;

    const run = reloaded.runs[runIndex];
    if (!run || run.status === "cancelled") return;

    run.status = "running";
    let overallSuccess = true;

    for (const stage of run.stages) {
      if (run.status === "cancelled") break;

      stage.status = "running";
      stage.startedAt = new Date();
      await reloaded.save();

      let stageSuccess = true;
      for (const step of stage.steps) {
        if (run.status === "cancelled") break;

        step.status = "running";
        step.startedAt = new Date();
        await reloaded.save();

        const configStage = pipeline.config.stages.find((s) => s.name === stage.name);
        const configStep = configStage?.steps.find((s) => s.name === step.name);
        const timeout = configStep?.timeout || DEFAULT_STEP_TIMEOUT;
        const env = configStep?.env || undefined;

        const result = await runCommand(step.command, { timeout, env });

        step.exitCode = result.exitCode;
        step.output = result.output;
        step.status = result.exitCode === 0 ? "success" : "failed";
        step.duration = Date.now() - step.startedAt.getTime();
        step.completedAt = new Date();

        if (result.exitCode !== 0) {
          stageSuccess = false;
          if (!configStep?.continueOnError) break;
        }
      }

      stage.status = stageSuccess ? "success" : "failed";
      stage.completedAt = new Date();

      if (!stageSuccess) {
        overallSuccess = false;
        const stageIdx = run.stages.indexOf(stage);
        for (let i = stageIdx + 1; i < run.stages.length; i++) {
          run.stages[i].status = "skipped";
          for (const step of run.stages[i].steps) {
            step.status = "skipped";
          }
        }
        break;
      }
    }

    run.status = overallSuccess ? "success" : "failed";
    run.completedAt = new Date();
    run.duration = run.completedAt - run.startedAt;

    reloaded.status = run.status;

    const successCount = reloaded.runs.filter((r) => r.status === "success").length;
    reloaded.successRate = reloaded.totalRuns > 0
      ? Math.round((successCount / reloaded.totalRuns) * 100)
      : 0;

    const durations = reloaded.runs.filter((r) => r.duration).map((r) => r.duration);
    reloaded.averageDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    await reloaded.save();
  }
}

module.exports = new PipelineService();
