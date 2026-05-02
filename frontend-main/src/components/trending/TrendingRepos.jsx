import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./trending-repos.css";

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219",
  Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516", CSS: "#563d7c",
  HTML: "#e34c26", Shell: "#89e051", C: "#555555", "C++": "#f34b7d",
  PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
};

const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const TrendingRepos = () => {
  useAuth();

  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("week");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchTrending = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ timeframe });
        if (filterLanguage !== "all") params.append("language", filterLanguage);

        const res = await api.get(`/v1/analytics/trending?${params}`, { signal: controller.signal });
        if (controller.signal.aborted) return;

        const data = res.data?.repositories || res.data || [];
        setRepos(data);

        // Extract unique languages
        const langs = [...new Set(data.map((r) => r.language).filter(Boolean))];
        setLanguages(langs);
      } catch (err) {
        if (err.name === "CanceledError") return;
        toast.error("Failed to load trending repositories.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchTrending();
    return () => controller.abort();
  }, [timeframe, filterLanguage]);

  const maxStarGrowth = Math.max(...repos.map((r) => r.starGrowth || r.starsGained || 0), 1);

  return (
    <div className="tr-page">
      <div className="tr-header">
        <h1>Trending</h1>
        <p className="tr-subtitle">Discover the most popular repositories on Gitless Forge.</p>
      </div>

      {/* Filters */}
      <div className="tr-filters">
        <div className="tr-time-toggle">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              className={`tr-time-btn ${timeframe === range.value ? "active" : ""}`}
              onClick={() => setTimeframe(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
        <select
          className="tr-lang-select"
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          aria-label="Filter by language"
        >
          <option value="all">All Languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      {/* Repo List */}
      {loading ? (
        <div className="tr-loading" role="status"><div className="spinner" /><p>Loading trending repos...</p></div>
      ) : repos.length === 0 ? (
        <div className="tr-empty">
          <h3>No trending repositories found</h3>
          <p>Try changing the time range or language filter.</p>
        </div>
      ) : (
        <div className="tr-list">
          {repos.map((repo, idx) => {
            const starGrowth = repo.starGrowth || repo.starsGained || 0;
            const sparkWidth = maxStarGrowth > 0 ? (starGrowth / maxStarGrowth) * 100 : 0;

            return (
              <div key={repo._id || idx} className="tr-repo-card">
                <div className="tr-rank">#{idx + 1}</div>
                <div className="tr-repo-body">
                  <div className="tr-repo-header">
                    <Link to={`/repo/${repo._id}`} className="tr-repo-name">
                      {repo.owner?.username && <span className="tr-repo-owner">{repo.owner.username} / </span>}
                      {repo.name}
                    </Link>
                  </div>
                  {repo.description && <p className="tr-repo-desc">{repo.description}</p>}
                  <div className="tr-repo-meta">
                    {repo.language && (
                      <span className="tr-lang">
                        <span className="tr-lang-dot" style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#6b7280" }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="tr-stars">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
                      {repo.stars ?? repo.starCount ?? 0}
                    </span>
                    {(repo.forks ?? repo.forkCount) != null && (
                      <span className="tr-forks">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
                        {repo.forks ?? repo.forkCount ?? 0}
                      </span>
                    )}
                    {starGrowth > 0 && (
                      <span className="tr-growth">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M6 9V3M3 5l3-3 3 3"/></svg>
                        {starGrowth} stars {timeframe === "today" ? "today" : `this ${timeframe}`}
                      </span>
                    )}
                  </div>
                  {/* Sparkline bar */}
                  {starGrowth > 0 && (
                    <div className="tr-sparkline">
                      <div className="tr-sparkline-bar" style={{ width: `${sparkWidth}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrendingRepos;
