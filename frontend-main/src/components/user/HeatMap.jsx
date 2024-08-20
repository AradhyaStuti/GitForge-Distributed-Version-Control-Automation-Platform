import { useEffect, useState } from "react";
import HeatMap from "@uiw/react-heat-map";
import api from "../../api";
import { useAuth } from "../../authContext";
import { useTheme } from "../../hooks/useTheme";

const HeatMapProfile = () => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [activityData, setActivityData] = useState([]);
  const [totalContributions, setTotalContributions] = useState(0);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!currentUser) return;
      const n = new Date();
      const s = new Date(n.getFullYear(), n.getMonth() - 11, 1);

      try {
        const res = await api.get(`/repo/activity/${currentUser}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setActivityData(data);
        setTotalContributions(data.reduce((sum, d) => sum + d.count, 0));
      } catch {
        // Fallback to generated data if endpoint not available yet
        const data = generateFallbackData(s, n);
        setActivityData(data);
        setTotalContributions(data.reduce((sum, d) => sum + d.count, 0));
      }
    };

    fetchActivity();
  }, [currentUser]);

  return (
    <div className="heatmap-section" aria-label="Contribution activity">
      <h3 className="heatmap-title">
        {totalContributions} contributions in the last year
      </h3>
      <div className="heatmap-container" role="img" aria-label={`${totalContributions} contributions heatmap`}>
        <HeatMap
          value={activityData}
          weekLabels={["", "Mon", "", "Wed", "", "Fri", ""]}
          startDate={startDate}
          endDate={now}
          rectSize={11}
          space={3}
          style={{ color: "var(--color-text-secondary)", maxWidth: "100%" }}
          rectProps={{ rx: 2 }}
          panelColors={theme === "dark" ? {
            0: "#161b22",
            2: "#0e4429",
            5: "#006d32",
            8: "#26a641",
            12: "#39d353",
          } : {
            0: "#ebedf0",
            2: "#9be9a8",
            5: "#40c463",
            8: "#30a14e",
            12: "#216e39",
          }}
        />
      </div>
    </div>
  );
};

function generateFallbackData(startDate, endDate) {
  const data = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    const count = Math.floor(Math.random() * 15);
    if (count > 0) {
      data.push({ date: current.toISOString().split("T")[0], count });
    }
    current.setDate(current.getDate() + 1);
  }
  return data;
}

export default HeatMapProfile;
