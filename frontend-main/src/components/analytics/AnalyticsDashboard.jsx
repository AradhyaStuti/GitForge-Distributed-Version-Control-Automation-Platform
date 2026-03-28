import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./analytics-dashboard.css";

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219",
  Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516", CSS: "#563d7c",
  HTML: "#e34c26", Shell: "#89e051", C: "#555555", "C++": "#f34b7d",
  PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
};

const AnalyticsDashboard = () => {
  const { repoId } = useParams();
  const { currentUser } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("year");

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [analyticsRes, langRes] = await Promise.all([
          api.get(`/v1/analytics/repo/${repoId}`, { signal: controller.signal }).catch(() => ({ data: null })),
          api.get(`/v1/analytics/languages/${repoId}`, { signal: controller.signal }).catch(() => ({ data: [] })),
        ]);
        if (controller.signal.aborted) return;
        setAnalytics(analyticsRes.data);
        setLanguages(langRes.data?.languages || langRes.data || []);
      } catch (err) {
        if (err.name === "CanceledError") return;
        toast.error("Failed to load analytics.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [repoId]);

  const commitData = analytics?.commitActivity || [];
  const maxCommits = Math.max(...commitData.map((w) => w.total || 0), 1);
  const contributors = analytics?.contributors || [];
  const activityFeed = analytics?.recentActivity || [];

  // Metrics
  const avgIssueResolution = analytics?.avgIssueResolutionTime ?? "—";
  const medianIssueResolution = analytics?.medianIssueResolutionTime ?? "—";
  const avgPRMergeTime = analytics?.avgPRMergeTime ?? "—";
  const pipelineSuccessRate = analytics?.pipelineSuccessRate ?? "—";
  const codeReviewScore = analytics?.avgCodeReviewScore ?? "—";

  // Language totals
  const totalLangBytes = languages.reduce((sum, l) => sum + (l.bytes || l.percentage || 0), 0);

  if (loading) {
    return (
      <div className="an-dash">
        <div className="an-loading" role="status" aria-label="Loading analytics">
          <div className="spinner" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="an-dash">
        <div className="an-empty">
          <h3>No analytics data available</h3>
          <p>Analytics will appear once there is activity in this repository.</p>
          <Link to={`/repo/${repoId}`} className="an-back-link">Back to repository</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="an-dash">
      <div className="an-header">
        <div>
          <h1>Analytics</h1>
          <p className="an-subtitle">Repository insights and activity metrics.</p>
        </div>
        <Link to={`/repo/${repoId}`} className="an-back-link">Back to repository</Link>
      </div>

      {/* Metric Cards */}
      <div className="an-metrics">
        <div className="an-metric-card">
          <span className="an-metric-num">{analytics.totalCommits ?? "—"}</span>
          <span className="an-metric-label">Total Commits</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num an-metric-green">{typeof pipelineSuccessRate === "number" ? `${pipelineSuccessRate}%` : pipelineSuccessRate}</span>
          <span className="an-metric-label">Pipeline Success</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num">{typeof avgPRMergeTime === "number" ? `${avgPRMergeTime}h` : avgPRMergeTime}</span>
          <span className="an-metric-label">Avg PR Merge Time</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num">{typeof avgIssueResolution === "number" ? `${avgIssueResolution}h` : avgIssueResolution}</span>
          <span className="an-metric-label">Avg Issue Resolution</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num">{typeof medianIssueResolution === "number" ? `${medianIssueResolution}h` : medianIssueResolution}</span>
          <span className="an-metric-label">Median Resolution</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num an-metric-purple">{typeof codeReviewScore === "number" ? `${codeReviewScore}/100` : codeReviewScore}</span>
          <span className="an-metric-label">Code Review Score</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num">{analytics.openIssues ?? "—"}</span>
          <span className="an-metric-label">Open Issues</span>
        </div>
        <div className="an-metric-card">
          <span className="an-metric-num">{analytics.openPRs ?? "—"}</span>
          <span className="an-metric-label">Open PRs</span>
        </div>
      </div>

      <div className="an-body">
        <div className="an-main">
          {/* Contribution Activity Chart */}
          {commitData.length > 0 && (
            <div className="an-chart-card">
              <h3 className="an-card-title">Contribution Activity</h3>
              <p className="an-card-subtitle">Commits per week, last {commitData.length} weeks</p>
              <div className="an-commit-chart">
                {commitData.map((week, i) => (
                  <div key={i} className="an-commit-bar-col" title={`Week ${i + 1}: ${week.total || 0} commits`}>
                    <div
                      className="an-commit-bar"
                      style={{ height: `${((week.total || 0) / maxCommits) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Language Breakdown */}
          {languages.length > 0 && (
            <div className="an-chart-card">
              <h3 className="an-card-title">Languages</h3>
              <div className="an-lang-bar">
                {languages.map((lang, i) => {
                  const pct = totalLangBytes > 0
                    ? ((lang.bytes || lang.percentage || 0) / totalLangBytes * 100).toFixed(1)
                    : 0;
                  return (
                    <div
                      key={i}
                      className="an-lang-segment"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: LANGUAGE_COLORS[lang.name] || "#6b7280",
                      }}
                      title={`${lang.name}: ${pct}%`}
                    />
                  );
                })}
              </div>
              <div className="an-lang-legend">
                {languages.map((lang, i) => {
                  const pct = totalLangBytes > 0
                    ? ((lang.bytes || lang.percentage || 0) / totalLangBytes * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={i} className="an-lang-item">
                      <span className="an-lang-dot" style={{ backgroundColor: LANGUAGE_COLORS[lang.name] || "#6b7280" }} />
                      <span className="an-lang-name">{lang.name}</span>
                      <span className="an-lang-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Contributors */}
          {contributors.length > 0 && (
            <div className="an-chart-card">
              <h3 className="an-card-title">Top Contributors</h3>
              <div className="an-contributors">
                {contributors.map((contrib, i) => (
                  <div key={i} className="an-contributor">
                    <span className="an-contributor-rank">#{i + 1}</span>
                    <div className="an-contributor-avatar">
                      {(contrib.username || contrib.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="an-contributor-info">
                      <span className="an-contributor-name">{contrib.username || contrib.name}</span>
                      <span className="an-contributor-stats">
                        {contrib.commits || 0} commits
                        {contrib.additions != null && (
                          <> &middot; <span className="an-additions">+{contrib.additions}</span> <span className="an-deletions">-{contrib.deletions || 0}</span></>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Activity Feed */}
        <aside className="an-side">
          <div className="an-chart-card">
            <h3 className="an-card-title">Recent Activity</h3>
            {activityFeed.length === 0 ? (
              <p className="an-card-empty">No recent activity.</p>
            ) : (
              <ul className="an-activity-feed">
                {activityFeed.map((event, i) => (
                  <li key={i} className="an-activity-item">
                    <span className={`an-activity-dot an-activity-${event.type || "default"}`} />
                    <div className="an-activity-body">
                      <span className="an-activity-msg">{event.message || event.description || "Activity"}</span>
                      <span className="an-activity-time">{event.createdAt ? new Date(event.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
