import { Suspense, lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./authContext";

const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Profile = lazy(() => import("./components/user/Profile"));
const Login = lazy(() => import("./components/auth/Login"));
const Signup = lazy(() => import("./components/auth/Signup"));
const CreateRepo = lazy(() => import("./components/repo/CreateRepo"));
const RepoDetail = lazy(() => import("./components/repo/RepoDetail"));
const SearchPage = lazy(() => import("./components/search/SearchPage"));
const PullRequests = lazy(() => import("./components/pr/PullRequests"));
const CreatePR = lazy(() => import("./components/pr/CreatePR"));
const PRDetail = lazy(() => import("./components/pr/PRDetail"));
const Settings = lazy(() => import("./components/settings/Settings"));
const Snippets = lazy(() => import("./components/snippets/Snippets"));
const CreateSnippet = lazy(() => import("./components/snippets/CreateSnippet"));
const SnippetDetail = lazy(() => import("./components/snippets/SnippetDetail"));
const Explore = lazy(() => import("./components/explore/Explore"));
const Bookmarks = lazy(() => import("./components/bookmarks/Bookmarks"));
const Admin = lazy(() => import("./components/admin/Admin"));
const NotFound = lazy(() => import("./components/NotFound"));

// ── New FAANG-level features ──────────────────────────────────────────────
const PipelineDashboard = lazy(() => import("./components/pipeline/PipelineDashboard"));
const CodeReviewPanel = lazy(() => import("./components/code-review/CodeReviewPanel"));
const ProjectBoard = lazy(() => import("./components/board/ProjectBoard"));
const AnalyticsDashboard = lazy(() => import("./components/analytics/AnalyticsDashboard"));
const TrendingRepos = lazy(() => import("./components/trending/TrendingRepos"));
const APIKeyManager = lazy(() => import("./components/api-keys/APIKeyManager"));
const SecurityAuditLog = lazy(() => import("./components/audit/SecurityAuditLog"));
const FileBrowser = lazy(() => import("./components/file-browser/FileBrowser"));

function LoadingSpinner() {
  return <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }} role="status"><div className="spinner" /></div>;
}

// eslint-disable-next-line react/prop-types
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/auth" replace />;
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

// eslint-disable-next-line react/prop-types
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (currentUser) return <Navigate to="/" replace />;
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

// eslint-disable-next-line react/prop-types
function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main id="main-content" style={{ flex: 1 }} role="main">{children}</main>
    </>
  );
}

// eslint-disable-next-line react/prop-types
const P = ({ children }) => <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;

const ProjectRoutes = () => {
  return useRoutes([
    { path: "/", element: <P><Dashboard /></P> },
    { path: "/auth", element: <PublicRoute><Login /></PublicRoute> },
    { path: "/signup", element: <PublicRoute><Signup /></PublicRoute> },
    { path: "/profile", element: <P><Profile /></P> },
    { path: "/create", element: <P><CreateRepo /></P> },
    { path: "/repo/:id", element: <P><RepoDetail /></P> },
    { path: "/repo/:repoId/pulls", element: <P><PullRequests /></P> },
    { path: "/repo/:repoId/pr/new", element: <P><CreatePR /></P> },
    { path: "/pr/:prId", element: <P><PRDetail /></P> },
    { path: "/search", element: <P><SearchPage /></P> },
    { path: "/settings", element: <P><Settings /></P> },
    { path: "/snippets", element: <P><Snippets /></P> },
    { path: "/snippets/new", element: <P><CreateSnippet /></P> },
    { path: "/snippet/:id", element: <P><SnippetDetail /></P> },
    { path: "/explore", element: <P><Explore /></P> },
    { path: "/bookmarks", element: <P><Bookmarks /></P> },
    { path: "/admin", element: <P><Admin /></P> },

    // ── New FAANG-level routes ────────────────────────────────────────────
    { path: "/repo/:repoId/pipelines", element: <P><PipelineDashboard /></P> },
    { path: "/repo/:repoId/analytics", element: <P><AnalyticsDashboard /></P> },
    { path: "/repo/:repoId/boards", element: <P><ProjectBoard /></P> },
    { path: "/repo/:repoId/files", element: <P><FileBrowser /></P> },
    { path: "/pr/:prId/review", element: <P><CodeReviewPanel /></P> },
    { path: "/trending", element: <P><TrendingRepos /></P> },
    { path: "/settings/api-keys", element: <P><APIKeyManager /></P> },
    { path: "/settings/security-log", element: <P><SecurityAuditLog /></P> },
    { path: "*", element: <Suspense fallback={<LoadingSpinner />}><NotFound /></Suspense> },
  ]);
};

export default ProjectRoutes;
