import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import { useSocket } from "../../hooks/useSocket";
import toast from "react-hot-toast";
import "./pipeline-dashboard.css";

const STATUS_LABELS = {
  success: "Success",
  failed: "Failed",
  running: "Running",
  pending: "Pending",
  cancelled: "Cancelled",
};

const PipelineDashboard = () => {
  const { repoId } = useParams();
  useAuth();
  const socketRef = useSocket();

  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("");
  const [expandedRun, setExpandedRun] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [runLogs, setRunLogs] = useState({});
  const [triggering, setTriggering] = useState(null);
  const [stats, setStats] = useState({ successRate: 0, avgDuration: 0, totalRuns: 0 });

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await api.get(`/v1/pipeline?repository=${repoId}`);
      const data = res.data?.pipelines || res.data || [];
      setPipelines(data);

      // Calculate stats
      const allRuns = data.flatMap((p) => p.runs || []);
      const total = allRuns.length;
      const successes = allRuns.filter((r) => r.status === "success").length;
      const durations = allRuns.filter((r) => r.duration).map((r) => r.duration);
      const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      setStats({
        successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
        avgDuration: Math.round(avg),
        totalRuns: total,
      });
    } catch (err) {
      if (err.name !== "CanceledError") {
        toast.error("Failed to load pipelines.");
      }
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPipelines();
    return () => controller.abort();
  }, [fetchPipelines]);

  // Real-time updates via socket
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handlePipelineUpdate = (data) => {
      if (data.repositoryId === repoId) {
        fetchPipelines();
      }
    };

    socket.on("pipelineUpdate", handlePipelineUpdate);
    return () => socket.off("pipelineUpdate", handlePipelineUpdate);
  }, [socketRef, repoId, fetchPipelines]);

  const handleTrigger = async (pipelineId) => {
    try {
      setTriggering(pipelineId);
      await api.post(`/v1/pipeline/${pipelineId}/trigger`);
      toast.success("Pipeline triggered!");
      fetchPipelines();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger pipeline.");
    } finally {
      setTriggering(null);
    }
  };

  const handleExpandRun = async (pipelineId, runNumber) => {
    const key = `${pipelineId}-${runNumber}`;
    if (expandedRun === key) {
      setExpandedRun(null);
      return;
    }
    setExpandedRun(key);

    if (!runLogs[key]) {
      try {
        const res = await api.get(`/v1/pipeline/${pipelineId}/runs/${runNumber}/logs`);
        setRunLogs((prev) => ({ ...prev, [key]: res.data }));
      } catch {
        toast.error("Failed to load run logs.");
      }
    }
  };

  const toggleStage = (stageKey) => {
    setExpandedStage(expandedStage === stageKey ? null : stageKey);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "--";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const filteredPipelines = pipelines.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterBranch && !p.branch?.toLowerCase().includes(filterBranch.toLowerCase())) return false;
    return true;
  });

  // Build bar chart data from stats
  const recentRuns = pipelines
    .flatMap((p) => (p.runs || []).map((r) => ({ ...r, pipelineName: p.name })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  const maxDuration = Math.max(...recentRuns.map((r) => r.duration || 0), 1);

  if (loading) {
    return (
      <div className="pl-dash">
        <div className="pl-loading" role="status" aria-label="Loading pipelines">
          <div className="spinner" />
          <p>Loading pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-dash">
      <div className="pl-header">
        <div className="pl-header-left">
          <h1>CI/CD Pipelines</h1>
          <p className="pl-subtitle">Continuous integration and deployment for your repository.</p>
        </div>
        <Link to={`/repo/${repoId}`} className="pl-back-link">Back to repository</Link>
      </div>

      {/* Stats Cards */}
      <div className="pl-stats">
        <div className="pl-stat-card">
          <span className="pl-stat-num">{stats.totalRuns}</span>
          <span className="pl-stat-label">Total Runs</span>
        </div>
        <div className="pl-stat-card">
          <span className="pl-stat-num pl-stat-success">{stats.successRate}%</span>
          <span className="pl-stat-label">Success Rate</span>
        </div>
        <div className="pl-stat-card">
          <span className="pl-stat-num">{formatDuration(stats.avgDuration)}</span>
          <span className="pl-stat-label">Avg Duration</span>
        </div>
        <div className="pl-stat-card">
          <span className="pl-stat-num">{pipelines.length}</span>
          <span className="pl-stat-label">Pipelines</span>
        </div>
      </div>

      {/* Success Rate Bar Chart */}
      {recentRuns.length > 0 && (
        <div className="pl-chart-card">
          <h3 className="pl-chart-title">Recent Run Durations</h3>
          <div className="pl-bar-chart">
            {recentRuns.map((run, i) => (
              <div key={i} className="pl-bar-col" title={`${run.pipelineName} #${run.number || i + 1} - ${formatDuration(run.duration)}`}>
                <div
                  className={`pl-bar pl-bar-${run.status || "pending"}`}
                  style={{ height: `${((run.duration || 0) / maxDuration) * 100}%` }}
                />
                <span className="pl-bar-label">#{run.number || i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="pl-filters">
        <select
          className="pl-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          className="pl-filter-input"
          placeholder="Filter by branch..."
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          aria-label="Filter by branch"
        />
      </div>

      {/* Pipeline List */}
      {filteredPipelines.length === 0 ? (
        <div className="pl-empty">
          <h3>No pipelines found</h3>
          <p>{pipelines.length === 0 ? "Configure a pipeline to automate your builds and deployments." : "No pipelines match your filters."}</p>
        </div>
      ) : (
        <div className="pl-list">
          {filteredPipelines.map((pipeline) => (
            <div key={pipeline._id} className="pl-card">
              <div className="pl-card-header">
                <div className="pl-card-info">
                  <span className={`pl-status-dot pl-status-${pipeline.status || "pending"}`} />
                  <h3 className="pl-card-name">{pipeline.name}</h3>
                  <span className="pl-card-branch">{pipeline.branch || "main"}</span>
                  <span className="pl-card-status-text">{STATUS_LABELS[pipeline.status] || "Unknown"}</span>
                </div>
                <div className="pl-card-actions">
                  <button
                    className="pl-trigger-btn"
                    onClick={() => handleTrigger(pipeline._id)}
                    disabled={triggering === pipeline._id}
                    aria-label={`Trigger pipeline ${pipeline.name}`}
                  >
                    {triggering === pipeline._id ? (
                      <span className="pl-trigger-spinner" />
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.005-2.13a.75.75 0 0 1 .77-.04l5 3a.75.75 0 0 1 0 1.27l-5 3A.75.75 0 0 1 5 12.31V3.69a.75.75 0 0 1 .505-.82Z"/></svg>
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pipeline Visualization - Stage Nodes */}
              {pipeline.stages && pipeline.stages.length > 0 && (
                <div className="pl-stages-viz">
                  {pipeline.stages.map((stage, idx) => (
                    <div key={idx} className="pl-stage-node-wrap">
                      {idx > 0 && <div className="pl-stage-connector" />}
                      <div className={`pl-stage-node pl-stage-${stage.status || "pending"}`}>
                        <span className="pl-stage-name">{stage.name}</span>
                        <span className="pl-stage-duration">{formatDuration(stage.duration)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Runs */}
              {pipeline.runs && pipeline.runs.length > 0 && (
                <div className="pl-runs">
                  <h4 className="pl-runs-title">Run History</h4>
                  {pipeline.runs.slice(0, 5).map((run) => {
                    const runKey = `${pipeline._id}-${run.number || run._id}`;
                    const isExpanded = expandedRun === runKey;
                    const logs = runLogs[runKey];

                    return (
                      <div key={runKey} className="pl-run-item">
                        <button
                          className="pl-run-header"
                          onClick={() => handleExpandRun(pipeline._id, run.number || run._id)}
                          aria-expanded={isExpanded}
                        >
                          <span className={`pl-status-dot pl-status-${run.status || "pending"}`} />
                          <span className="pl-run-number">#{run.number || "—"}</span>
                          <span className="pl-run-msg">{run.commitMessage || run.trigger || "Manual run"}</span>
                          <span className="pl-run-duration">{formatDuration(run.duration)}</span>
                          <span className="pl-run-time">{run.createdAt ? new Date(run.createdAt).toLocaleDateString() : ""}</span>
                          <span className={`pl-run-chevron ${isExpanded ? "expanded" : ""}`}>&#9662;</span>
                        </button>

                        {isExpanded && (
                          <div className="pl-run-detail">
                            {logs ? (
                              logs.stages?.map((stage, sIdx) => {
                                const stageKey = `${runKey}-${sIdx}`;
                                const stageExpanded = expandedStage === stageKey;

                                return (
                                  <div key={sIdx} className="pl-log-stage">
                                    <button
                                      className="pl-log-stage-header"
                                      onClick={() => toggleStage(stageKey)}
                                      aria-expanded={stageExpanded}
                                    >
                                      <span className={`pl-status-dot pl-status-${stage.status || "pending"}`} />
                                      <span>{stage.name}</span>
                                      <span className="pl-log-stage-dur">{formatDuration(stage.duration)}</span>
                                      <span className={`pl-run-chevron ${stageExpanded ? "expanded" : ""}`}>&#9662;</span>
                                    </button>
                                    {stageExpanded && stage.steps && (
                                      <div className="pl-log-steps">
                                        {stage.steps.map((step, stepIdx) => (
                                          <div key={stepIdx} className={`pl-log-step pl-step-${step.status || "pending"}`}>
                                            <div className="pl-step-header">
                                              <span className={`pl-status-dot-sm pl-status-${step.status || "pending"}`} />
                                              <span className="pl-step-cmd">{step.command || step.name}</span>
                                              <span className="pl-step-dur">{formatDuration(step.duration)}</span>
                                            </div>
                                            {step.output && (
                                              <pre className="pl-step-output">{step.output}</pre>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="pl-log-loading"><div className="spinner" /></div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelineDashboard;
