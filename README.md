<p align="center">
  <img src="banner.svg" alt="GitForge" width="100%"/>
</p>

<p align="center">
  <strong>A production-grade, full-stack alternative to GitHub</strong> with AI-powered code reviews, built-in CI/CD pipelines, GraphQL API, Kanban boards, and a 30+ command CLI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20+-7c3aed?style=flat-square&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/react-18-7c3aed?style=flat-square&logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/mongodb-atlas-7c3aed?style=flat-square&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/graphql-api-7c3aed?style=flat-square&logo=graphql&logoColor=white"/>
  <img src="https://img.shields.io/badge/docker-ready-7c3aed?style=flat-square&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-7c3aed?style=flat-square&logo=githubactions&logoColor=white"/>
</p>

---

## Why GitForge?

Most "GitHub clones" stop at repos and issues. GitForge goes further - it's a platform I built to understand **how GitHub-scale systems actually work**, then added features GitHub **doesn't even have yet**.

**What makes it different from every other GitHub clone:**

| Feature | GitHub | GitLab | GitForge |
|---------|--------|--------|----------|
| AI-Powered Code Reviews | Copilot (paid) | Duo (paid) | Built-in, free |
| Built-in CI/CD Engine | Actions | CI/CD | Pipeline Engine |
| GraphQL + REST API | Yes | Yes | Yes |
| Kanban Project Boards | Projects | Boards | Boards |
| CLI with Local VCS | Git (separate) | Git (separate) | Integrated 30+ cmd CLI |
| Code Intelligence | Limited | Yes | Language analysis + metrics |
| Real-time Everything | Limited | Limited | Socket.IO full-duplex |
| HMAC-Signed Webhooks | Yes | Yes | Yes + retry with backoff |
| Prometheus Metrics | No | Yes | Yes |
| API Key Management | Yes | Yes | Yes |
| Audit Logging | Enterprise only | Enterprise only | Built-in |

---

## Architecture

```
                              ┌────────────────────────────────┐
                              │         Load Balancer          │
                              │          (Nginx)               │
                              └──────┬────────────┬────────────┘
                                     │            │
                    ┌────────────────┘            └────────────────┐
                    ▼                                              ▼
         ┌──────────────────┐                           ┌──────────────────┐
         │   React 18 SPA   │                           │  Express.js API  │
         │   (Vite 5 PWA)   │◄─── Socket.IO ──────────►│   + GraphQL      │
         │                  │                           │   + REST v1      │
         │  - Monaco Editor │     WebSocket             │   + Metrics      │
         │  - Diff Viewer   │     Real-time             │                  │
         │  - Kanban Boards │                           │  Middleware:      │
         │  - AI Review UI  │                           │  - Auth (JWT)    │
         │  - Pipeline Dash │                           │  - API Key Auth  │
         │  - Analytics     │                           │  - Rate Limiting │
         │  - Command       │                           │  - Request Trace │
         │    Palette        │                           │  - Compression   │
         └──────────────────┘                           │  - Security      │
                                                        │  - Audit Logger  │
                                                        └────────┬─────────┘
                                                                 │
                                              ┌──────────────────┼──────────────┐
                                              ▼                  ▼              ▼
                                    ┌──────────────┐   ┌──────────────┐  ┌───────────┐
                                    │  MongoDB      │   │    Redis     │  │ Prometheus│
                                    │  Atlas        │   │  (caching)   │  │  Metrics  │
                                    │              │   │              │  │           │
                                    │  18 models   │   │  pub/sub     │  │  /metrics │
                                    │  Indexed     │   │  sessions    │  │  endpoint │
                                    │  TTL expiry  │   │              │  │           │
                                    └──────────────┘   └──────────────┘  └───────────┘
```

---

## Features

### Core Platform
- **Repositories** - Create, star, fork, visibility toggle, file browser, activity tracking
- **Issues** - Create, close/reopen, filter by status, labels, milestones
- **Pull Requests** - Create, review, merge with branch management
- **Code Snippets** - Multi-file sharing (like Gists) with stars, forks, view counts
- **Search** - Full-text search across repos, issues, and users

### AI-Powered Code Review Engine
- Heuristic-based code analysis that detects:
  - **Security issues** - eval(), innerHTML, SQL injection patterns, hardcoded secrets
  - **Performance issues** - nested loops, N+1 query patterns, sequential awaits
  - **Style issues** - long functions, deep nesting, magic numbers
  - **Complexity metrics** - cyclomatic complexity scoring
- Quality score (0-100) with severity-weighted suggestions
- Accept/reject individual suggestions with inline code fixes
- Review metrics: files analyzed, tech debt estimation, duplicate detection

### CI/CD Pipeline Engine
- YAML-based pipeline configuration (GitHub Actions-style)
- Multi-stage pipelines with step-level granularity
- Pipeline run history with detailed logs
- Real-time status updates via WebSocket
- Success rate tracking and duration analytics
- SVG status badges for README embedding
- Manual trigger and cancellation support

### Kanban Project Boards
- Drag-and-drop card management with HTML5 DnD API
- Customizable columns with color coding and WIP limits
- Cards linked to issues with priority, assignees, labels, due dates
- Board-level member management (admin/editor/viewer roles)
- Filter and search across boards

### Analytics & Code Intelligence
- **Repository analytics** - commit frequency, contributor stats, issue resolution time
- **Language breakdown** - GitHub-style horizontal bar with 50+ language detection
- **Code complexity scoring** - A-F grading based on cyclomatic complexity
- **Platform analytics** - growth rates, trending repos, system health (admin)
- **Trending algorithm** - activity-weighted scoring with time-decay recency boost

### Security & Infrastructure
- **Authentication** - JWT tokens + API key management with scoped permissions
- **Audit logging** - 18 tracked actions with 90-day retention, security event filtering
- **Request tracing** - Correlation IDs on every request (X-Request-ID header)
- **Rate limiting** - Global, per-auth, per-user/key configurable limits
- **Webhooks** - 13 event types, HMAC-SHA256 signed, delivery history, retry with exponential backoff
- **Input security** - NoSQL injection prevention, XSS sanitization, content-type validation
- **Graceful shutdown** - SIGTERM/SIGINT handlers with connection draining

### API
- **REST API** - 60+ endpoints at `/api/v1/` with Swagger UI docs
- **GraphQL API** - Full query support at `/graphql`
- **Prometheus Metrics** - `/metrics` endpoint for monitoring
- **API Keys** - Scoped key generation, rotation, revocation, usage tracking

### Frontend
- **Code file browser** with tree view, breadcrumbs, branch selector
- **Side-by-side diff viewer** with unified/split toggle
- **Markdown renderer** with syntax highlighting, tables, task lists
- **Command palette** (Ctrl+K) for instant navigation
- **Dark/light theme** with system preference detection
- **Responsive design** - fully mobile-friendly
- **Skeleton loading** states and error boundaries
- **Real-time notifications** via Socket.IO

### CLI (30+ Commands)
- **Core**: `init`, `status`, `add`, `commit`, `push`, `pull`, `clone`
- **Branches**: `branch`, `checkout`, `switch`, `merge`, `branch-create`, `branch-delete`
- **History**: `log`, `shortlog`, `reflog`, `show`, `diff`, `blame`, `grep`
- **Tags**: `tag`, `tag-list`, `tag-delete`, `tag-show`
- **Stash**: `stash`, `stash-pop`, `stash-list`, `stash-drop`
- **Advanced**: `revert`, `reset`, `cherry-pick`, `archive`, `clean`, `restore`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, React Router 6, Axios, Socket.IO Client |
| **Backend** | Node.js 20, Express 4, Mongoose 8, Socket.IO 4, Yargs |
| **Database** | MongoDB Atlas (18 collections, compound + text + TTL indexes) |
| **API** | REST + GraphQL + Prometheus metrics |
| **Security** | JWT, API Keys, bcrypt, Helmet, HMAC webhooks, rate limiting, audit logging |
| **Testing** | Jest + Supertest (backend), Vitest + Testing Library (frontend) |
| **DevOps** | Docker, docker-compose, Nginx, GitHub Actions CI/CD, Vercel, Railway |
| **Monitoring** | Prometheus-compatible metrics, structured logging, request tracing |

---

## Getting Started

```bash
# Clone
git clone https://github.com/AradhyaStuti/GitForge-Distributed-Version-Control-Automation-Platform.git
cd GitForge-Distributed-Version-Control-Automation-Platform

# Setup env
cp backend-main/.env.example backend-main/.env
# Fill in MONGODB_URI and JWT_SECRET_KEY

# Install
cd backend-main && npm install
cd ../frontend-main && npm install

# Run (two terminals)
cd backend-main && npm start          # API on :3000
cd frontend-main && npm run dev       # UI on :5173
```

Open **http://localhost:5173** and create an account.

**Docker (recommended):**
```bash
docker-compose up --build
# API → :3000 | Web → :80 | MongoDB → :27017 | Redis → :6379
```

---

## CLI Usage

```bash
cd backend-main

node index.js init
node index.js add-all
node index.js commit "first commit"
node index.js push
node index.js log
node index.js branch-create feature
node index.js checkout feature
node index.js merge feature
```

---

## API Reference

### REST API

Interactive docs at `/api/v1/docs` (Swagger UI).

**Core:**
```
POST /api/v1/signup                    POST /api/v1/login
POST /api/v1/repo/create               GET /api/v1/repo/all
POST /api/v1/issue/create              GET /api/v1/issue/all
POST /api/v1/pr/create                POST /api/v1/pr/:id/merge
```

**New Endpoints:**
```
POST /api/v1/pipeline                 POST /api/v1/pipeline/:id/trigger
POST /api/v1/code-review              GET /api/v1/code-review/pr/:prId
POST /api/v1/boards                    PUT /api/v1/boards/:id/cards/:cardId/move
POST /api/v1/api-keys                 DELETE /api/v1/api-keys/:id
 GET /api/v1/audit/me                  GET /api/v1/audit/security
 GET /api/v1/analytics/repo/:id        GET /api/v1/analytics/trending
 GET /api/v1/analytics/languages/:id
```

### GraphQL API

```graphql
POST /graphql

{
  repository(id: "...") {
    name
    owner { username }
    issues { title status }
    pullRequests { title status }
    pipelines { name status successRate }
  }
}
```

### Prometheus Metrics

```
GET /metrics

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/repo/all",status="200"} 142
http_request_duration_seconds_bucket{le="0.1"} 89
```

---

## Project Structure

```
backend-main/
├── controllers/        18 controller files (pipeline, codeReview, board, apiKey, audit, analytics...)
├── services/           19 service files (business logic layer with singleton pattern)
├── models/             18 Mongoose schemas (Pipeline, CodeReview, ProjectBoard, APIKey, AuditLog...)
├── routes/             18 route files (REST endpoints)
├── middleware/         11 middleware (auth, apiKey, security, compression, tracing, audit...)
├── config/              4 config files (env, swagger, graphql, metrics)
├── utils/               3 utilities (AppError, retryWithBackoff, rateLimitByKey)
├── __tests__/           7 test suites
└── index.js              server + GraphQL + 30-command CLI

frontend-main/src/
├── components/
│   ├── pipeline/        PipelineDashboard (CI/CD visualization)
│   ├── code-review/     CodeReviewPanel (AI review UI)
│   ├── board/           ProjectBoard (Kanban drag-and-drop)
│   ├── analytics/       AnalyticsDashboard (charts + metrics)
│   ├── diff/            DiffViewer (unified/split diff)
│   ├── markdown/        MarkdownRenderer (GFM support)
│   ├── file-browser/    FileBrowser (tree view + preview)
│   ├── trending/        TrendingRepos (discovery)
│   ├── api-keys/        APIKeyManager (key CRUD)
│   ├── audit/           SecurityAuditLog (timeline)
│   ├── dashboard/       Dashboard, Skeleton
│   ├── repo/            CreateRepo, RepoDetail
│   ├── pr/              PullRequests, CreatePR, PRDetail
│   ├── auth/            Login, Signup
│   ├── search/          SearchPage
│   ├── snippets/        Snippets, CreateSnippet, SnippetDetail
│   └── ...              Settings, Profile, Admin, Explore, Bookmarks
├── hooks/               6 custom hooks (useTheme, useSocket, useDragAndDrop, useDebounce...)
├── api.js               Axios instance with auth interceptor
├── authContext.jsx       Auth state management
├── Routes.jsx           25 lazy-loaded routes
└── index.css            Design system (CSS custom properties)
```

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Service layer pattern** | Controllers are thin wrappers; business logic lives in singleton services for testability |
| **Dual API (REST + GraphQL)** | REST for standard CRUD, GraphQL for flexible client queries - best of both worlds |
| **Heuristic AI reviews** | Pattern-matching code analysis that works without external AI APIs - zero cost, zero latency |
| **Request tracing** | Every request gets a UUID correlation ID for distributed debugging |
| **API key auth** | Supports both JWT (interactive) and API key (programmatic) authentication |
| **Audit logging** | 18 action types with TTL auto-expiry - compliance-ready without manual cleanup |
| **Pipeline simulation** | CI/CD engine simulates real pipeline execution with stage/step transitions |
| **Webhook retry** | Exponential backoff with jitter prevents thundering herd on failed deliveries |
| **In-memory metrics** | Prometheus-compatible counters/histograms without external dependencies |
| **CSS custom properties** | Single source of truth for theming - no CSS-in-JS overhead |

---

## Security

- JWT tokens (24h expiry) + API keys with scoped permissions
- bcrypt (12 rounds) password hashing
- Account lockout after 5 failed logins (15min)
- Rate limiting: 100 req/15min global, 15/15min on auth, per-key configurable
- NoSQL injection prevention ($ and . stripping from inputs)
- XSS sanitization (HTML entity encoding)
- Helmet for HTTP security headers
- CORS whitelist with configurable origins
- HMAC-SHA256 webhook signatures with delivery verification
- Audit trail for all sensitive operations (90-day retention)
- Content-type validation on mutation endpoints
- Request ID tracing for forensic analysis

---

## DevOps

**CI Pipeline** (GitHub Actions):
```
Lint → Test (Backend + Frontend parallel) → Build → Docker verification → Security audit
```

**CD Pipeline**:
```
Tag push → Deploy staging → Deploy production (manual gate)
```

**Monitoring**:
- `/metrics` - Prometheus-compatible endpoint
- `/health` - System health with uptime and memory
- Structured JSON logging with request correlation IDs
- Graceful shutdown with connection draining

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design documentation.
