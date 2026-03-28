'use strict';

const Pipeline = require("../models/Pipeline");
const Repository = require("../models/repoModel");
const { AppError } = require("../middleware/errorHandler");

class PipelineService {
  async createPipeline(data) {
    const repo = await Repository.findById(data.repository);
    if (!repo) throw new AppError("Repository not found.", 404);

    if (!data.config || !data.config.stages || data.config.stages.length === 0) {
      throw new AppError("Pipeline config must include at least one stage.", 400);
    }

    for (const stage of data.config.stages) {
      if (!stage.steps || stage.steps.length === 0) {
        throw new AppError(`Stage "${stage.name}" must include at least one step.`, 400);
      }
    }

    const existing = await Pipeline.findOne({ repository: data.repository, name: data.name });
    if (existing) throw new AppError("A pipeline with this name already exists for this repository.", 409);

    const pipeline = await Pipeline.create({
      name: data.name,
      repository: data.repository,
      owner: data.owner,
      config: data.config,
    });

    return pipeline;
  }

  async getPipelinesByRepo(repoId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [pipelines, total] = await Promise.all([
      Pipeline.find({ repository: repoId })
        .populate("owner", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Pipeline.countDocuments({ repository: repoId }),
    ]);

    return { pipelines, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getPipelineById(id) {
    const pipeline = await Pipeline.findById(id)
      .populate("owner", "username email")
      .populate("repository", "name owner");

    if (!pipeline) throw new AppError("Pipeline not found.", 404);
    return pipeline;
  }

  async updatePipeline(id, data) {
    const pipeline = await Pipeline.findById(id);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    const allowed = ["name", "config"];
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) pipeline[key] = data[key];
    }

    await pipeline.save();
    return pipeline;
  }

  async deletePipeline(id) {
    const pipeline = await Pipeline.findByIdAndDelete(id);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);
    return { message: "Pipeline deleted." };
  }

  async triggerRun(pipelineId, { trigger, branch, commitSha, triggeredBy }) {
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
      trigger: trigger || "manual",
      triggerBy: triggeredBy,
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

    // Fire-and-forget simulation
    this.simulateExecution(pipeline, pipeline.runs.length - 1).catch(() => {});

    return pipeline;
  }

  async cancelRun(pipelineId, runNumber) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) throw new AppError("Pipeline not found.", 404);

    const run = pipeline.runs.find((r) => r.runNumber === runNumber);
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

    const run = pipeline.runs.find((r) => r.runNumber === runNumber);
    if (!run) throw new AppError("Run not found.", 404);

    const logs = [];
    for (const stage of run.stages) {
      logs.push(`=== Stage: ${stage.name} [${stage.status}] ===`);
      for (const step of stage.steps) {
        logs.push(`  > ${step.name}: ${step.status} (exit: ${step.exitCode ?? "N/A"}, ${step.duration ?? 0}ms)`);
        if (step.output) logs.push(`    ${step.output}`);
      }
    }

    return { runNumber, status: run.status, logs: logs.join("\n"), duration: run.duration };
  }

  async getPipelineStats(repoId) {
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

  async simulateExecution(pipeline, runIndex) {
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

        const duration = Math.floor(Math.random() * 3000) + 500;
        await new Promise((resolve) => setTimeout(resolve, Math.min(duration, 100)));

        const failed = Math.random() < 0.1;
        step.status = failed ? "failed" : "success";
        step.exitCode = failed ? 1 : 0;
        step.duration = duration;
        step.completedAt = new Date();
        step.output = failed
          ? `Error: Process exited with code 1`
          : `Step "${step.name}" completed successfully.`;

        if (failed) {
          stageSuccess = false;
          const configStage = pipeline.config.stages.find((s) => s.name === stage.name);
          const configStep = configStage?.steps.find((s) => s.name === step.name);
          if (!configStep?.continueOnError) break;
        }
      }

      stage.status = stageSuccess ? "success" : "failed";
      stage.completedAt = new Date();

      if (!stageSuccess) {
        overallSuccess = false;
        // Skip remaining stages
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

    // Update stats
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
