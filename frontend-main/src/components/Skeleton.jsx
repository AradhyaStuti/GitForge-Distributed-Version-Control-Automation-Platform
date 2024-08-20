// eslint-disable-next-line react/prop-types
const Skeleton = ({ width = "100%", height = "16px", borderRadius = "4px", style = {} }) => (
  <div
    className="skeleton"
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: "var(--color-bg-tertiary)",
      animation: "skeleton-pulse 1.5s ease-in-out infinite",
      ...style,
    }}
  />
);

export const RepoSkeleton = () => (
  <div style={{ padding: "16px 0", borderBottom: "1px solid var(--color-border)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <Skeleton width="200px" height="20px" />
      <Skeleton width="50px" height="18px" borderRadius="16px" />
    </div>
    <Skeleton width="60%" height="14px" style={{ marginBottom: "8px" }} />
    <Skeleton width="120px" height="12px" />
  </div>
);

export const ProfileSkeleton = () => (
  <div style={{ display: "flex", gap: "32px", padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
    <div style={{ width: "280px" }}>
      <Skeleton width="260px" height="260px" borderRadius="50%" style={{ marginBottom: "16px" }} />
      <Skeleton width="180px" height="24px" style={{ marginBottom: "8px" }} />
      <Skeleton width="200px" height="14px" style={{ marginBottom: "16px" }} />
      <Skeleton width="100%" height="32px" borderRadius="6px" />
    </div>
    <div style={{ flex: 1 }}>
      <Skeleton width="300px" height="16px" style={{ marginBottom: "24px" }} />
      <Skeleton width="100%" height="200px" borderRadius="6px" />
    </div>
  </div>
);

export default Skeleton;
