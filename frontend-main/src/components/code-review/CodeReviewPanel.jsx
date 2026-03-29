import { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./code-review.css";

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, style: 3 };
const SEVERITY_LABELS = { critical: "Critical", warning: "Warning", info: "Info", style: "Style" };

// eslint-disable-next-line react/prop-types
const CodeReviewPanel = ({ prId }) => {
  useAuth();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchReview = async () => {
      try {
        const res = await api.get(`/v1/code-review/pr/${prId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setReview(res.data);
      } catch (err) {
        if (err.name === "CanceledError") return;
        // No review yet is not an error
        if (err.response?.status !== 404) {
          console.warn("Failed to load code review:", err.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (prId) fetchReview();
    return () => controller.abort();
  }, [prId]);

  const handleRunReview = async () => {
    try {
      setScanning(true);
      const res = await api.post("/v1/code-review", { pullRequestId: prId });
      setReview(res.data);
      toast.success("AI code review complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to run code review.");
    } finally {
      setScanning(false);
    }
  };

  const handleAcceptSuggestion = async (index) => {
    try {
      await api.put(`/v1/code-review/${review._id}/suggestions/${index}/accept`);
      setReview((prev) => {
        const updated = { ...prev };
        const suggestions = [...(updated.suggestions || [])];
        suggestions[index] = { ...suggestions[index], status: "accepted" };
        updated.suggestions = suggestions;
        return updated;
      });
      toast.success("Suggestion accepted.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept suggestion.");
    }
  };

  const handleRejectSuggestion = async (index) => {
    try {
      await api.put(`/v1/code-review/${review._id}/suggestions/${index}/reject`);
      setReview((prev) => {
        const updated = { ...prev };
        const suggestions = [...(updated.suggestions || [])];
        suggestions[index] = { ...suggestions[index], status: "rejected" };
        updated.suggestions = suggestions;
        return updated;
      });
      toast.success("Suggestion dismissed.");
    } catch {
      toast.error("Failed to reject suggestion.");
    }
  };

  const toggleSuggestion = (index) => {
    setExpandedSuggestion(expandedSuggestion === index ? null : index);
  };

  // Score circle calculations
  const score = review?.score ?? 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  // Group suggestions by severity
  const suggestions = review?.suggestions || [];
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );

  if (loading) {
    return (
      <div className="cr-panel">
        <div className="cr-loading" role="status"><div className="spinner" /></div>
      </div>
    );
  }

  if (scanning) {
    return (
      <div className="cr-panel">
        <div className="cr-scanning">
          <div className="cr-scan-animation">
            <div className="cr-scan-line" />
            <svg className="cr-scan-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" />
            </svg>
          </div>
          <h3>Analyzing code...</h3>
          <p>AI is reviewing your changes for issues and improvements.</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="cr-panel">
        <div className="cr-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5">
            <path d="M9 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" />
          </svg>
          <h3>No AI review yet</h3>
          <p>Run an AI-powered code review to get actionable suggestions.</p>
          <button className="cr-run-btn" onClick={handleRunReview}>Run AI Review</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-panel">
      {/* Header with score */}
      <div className="cr-header">
        <div className="cr-score-wrap">
          <svg className="cr-score-svg" width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke={scoreColor} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="cr-score-circle"
              transform="rotate(-90 48 48)"
            />
            <text x="48" y="44" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--color-text-primary)">{score}</text>
            <text x="48" y="58" textAnchor="middle" fontSize="9" fill="var(--color-text-secondary)">/ 100</text>
          </svg>
        </div>
        <div className="cr-header-info">
          <h3>Code Quality Score</h3>
          {review.summary && <p className="cr-summary">{review.summary}</p>}
          <button className="cr-run-btn cr-run-btn-sm" onClick={handleRunReview}>Re-run Review</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="cr-metrics">
        <div className="cr-metric">
          <span className="cr-metric-num">{review.filesAnalyzed ?? "—"}</span>
          <span className="cr-metric-label">Files Analyzed</span>
        </div>
        <div className="cr-metric">
          <span className="cr-metric-num">{review.linesAnalyzed ?? "—"}</span>
          <span className="cr-metric-label">Lines Analyzed</span>
        </div>
        <div className="cr-metric">
          <span className="cr-metric-num">{suggestions.length}</span>
          <span className="cr-metric-label">Issues Found</span>
        </div>
        <div className="cr-metric">
          <span className="cr-metric-num">{review.estimatedDebt ?? "—"}</span>
          <span className="cr-metric-label">Tech Debt (hrs)</span>
        </div>
      </div>

      {/* Suggestions */}
      <div className="cr-suggestions">
        <h4 className="cr-section-title">Suggestions ({suggestions.length})</h4>
        {sortedSuggestions.length === 0 ? (
          <div className="cr-no-suggestions">
            <p>No issues found. Your code looks great!</p>
          </div>
        ) : (
          <div className="cr-suggestion-list">
            {sortedSuggestions.map((suggestion) => {
              const originalIdx = suggestions.indexOf(suggestion);
              const isExpanded = expandedSuggestion === originalIdx;
              const isActioned = suggestion.status === "accepted" || suggestion.status === "rejected";

              return (
                <div key={originalIdx} className={`cr-suggestion ${isActioned ? "cr-suggestion-actioned" : ""}`}>
                  <button
                    className="cr-suggestion-header"
                    onClick={() => toggleSuggestion(originalIdx)}
                    aria-expanded={isExpanded}
                  >
                    <span className={`cr-severity-badge cr-severity-${suggestion.severity || "info"}`}>
                      {SEVERITY_LABELS[suggestion.severity] || "Info"}
                    </span>
                    {suggestion.category && (
                      <span className="cr-category-badge">{suggestion.category}</span>
                    )}
                    <span className="cr-suggestion-title">{suggestion.title || "Suggestion"}</span>
                    {suggestion.file && (
                      <span className="cr-suggestion-loc">{suggestion.file}{suggestion.line ? `:${suggestion.line}` : ""}</span>
                    )}
                    {isActioned && (
                      <span className={`cr-action-badge cr-action-${suggestion.status}`}>
                        {suggestion.status === "accepted" ? "Accepted" : "Dismissed"}
                      </span>
                    )}
                    <span className={`cr-suggestion-chevron ${isExpanded ? "expanded" : ""}`}>&#9662;</span>
                  </button>

                  {isExpanded && (
                    <div className="cr-suggestion-body">
                      {suggestion.description && <p className="cr-suggestion-desc">{suggestion.description}</p>}
                      {suggestion.suggestedFix && (
                        <div className="cr-code-block">
                          <div className="cr-code-header">Suggested Fix</div>
                          <pre className="cr-code-content">{suggestion.suggestedFix}</pre>
                        </div>
                      )}
                      {!isActioned && (
                        <div className="cr-suggestion-actions">
                          <button className="cr-accept-btn" onClick={() => handleAcceptSuggestion(originalIdx)}>Accept</button>
                          <button className="cr-reject-btn" onClick={() => handleRejectSuggestion(originalIdx)}>Dismiss</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeReviewPanel;
