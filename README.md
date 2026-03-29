<p align="center">
  <img src="banner.svg" alt="GitForge" width="100%"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20+-7c3aed?style=flat-square&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/react-18-7c3aed?style=flat-square&logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/mongodb-7c3aed?style=flat-square&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/docker-ready-7c3aed?style=flat-square&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/CI-GitHub_Actions-7c3aed?style=flat-square&logo=githubactions&logoColor=white"/>
</p>

A full-stack code hosting platform built from scratch to understand how systems like GitHub work under the hood. Custom file-based VCS, real CI/CD pipeline execution, static code review with Myers diff, Kanban boards, Redis caching, GraphQL mutations, and 129 passing tests across 20 suites.

---

## Quick Start

```bash
git clone https://github.com/AradhyaStuti/GitForge-Distributed-Version-Control-Automation-Platform.git
cd GitForge-Distributed-Version-Control-Automation-Platform

cp backend-main/.env.example backend-main/.env
# Fill in MONGODB_URI and JWT_SECRET_KEY

cd backend-main && npm install
cd ../frontend-main && npm install

# Two terminals:
cd backend-main && npm start          # API on :3000
cd frontend-main && npm run dev       # UI on :5173
```

Or with Docker: `docker compose up --build`

---

## What's in it

**Custom VCS** — Not a git wrapper. Commits are stored as JSON metadata + file snapshots on disk under `.gitforge/`. Supports branching, merging, tagging, stash, reflog, blame, grep, cherry-pick, reset, and more through a 30+ command CLI.

**Repositories & Pull Requests** — Create repos (public/private), open PRs with source/target branches, review and merge them. Comment threads with emoji reactions. File browser with tree view.

**Code Review** — Runs regex-based static analysis against real PR diffs (built using Myers diff algorithm against `.gitforge` branch tips). Catches security issues (eval, innerHTML, SQL injection, hardcoded secrets), performance anti-patterns, and style problems. Gives a 0-100 quality score.

**CI/CD Pipelines** — Multi-stage pipelines where each step actually runs shell commands via `child_process.execFile`. Real stdout/stderr capture, exit codes, per-step timeouts, env vars, `continueOnError`. Command validation blocks shell injection patterns.

**Project Boards** — Kanban boards with drag-and-drop, WIP limits, color-coded columns, card priorities, assignees, and due dates. Ships with default columns (Backlog, To Do, In Progress, In Review, Done).

**Snippets** — Multi-file code sharing (like Gists) with starring and forking.

**API** — REST (60+ endpoints with Swagger docs) + GraphQL (queries and mutations) + Prometheus metrics. Dual auth: JWT tokens and scoped API keys.

**Security** — bcrypt (12 rounds), account lockout, rate limiting, NoSQL injection prevention, XSS sanitization, Helmet headers, HMAC-SHA256 webhooks with retry, audit logging (90-day TTL), request tracing via correlation IDs.

**Real-time** — Socket.IO for live notifications across the app.

**Analytics** — Repo-level contributor stats, language breakdown, platform-wide trending with time-decay scoring.

---

## Tech Stack

| | |
|---|---|
| **Frontend** | React 18, Vite 5, Primer CSS, Socket.IO Client |
| **Backend** | Node.js, Express, Mongoose, Socket.IO, Yargs |
| **Database** | MongoDB (18 collections, compound + text + TTL indexes), Redis (optional cache) |
| **Testing** | Jest + Supertest (96 tests), Vitest + Testing Library (33 tests) |
| **DevOps** | Docker Compose, GitHub Actions, Nginx |

---

## CLI

```bash
cd backend-main

node index.js init
node index.js add-all
node index.js commit "initial commit"
node index.js push
node index.js log
node index.js branch-create feature
node index.js checkout feature
node index.js diff app.js
node index.js merge feature
node index.js tag v1.0
node index.js stash && node index.js stash-pop
```

Run `node index.js --help` for the full list.

---

## API

Swagger docs at `/api/v1/docs`. A few highlights:

```
POST /signup                          POST /login
POST /repo/create                     GET  /repo/all
POST /pr/create                       POST /pr/:id/merge
POST /pipeline                        POST /pipeline/:id/trigger
POST /code-review                     GET  /code-review/pr/:prId
POST /boards                          POST /boards/:id/columns/:colId/cards
POST /api-keys                        GET  /audit/me
```

GraphQL at `/graphql` — supports both queries and mutations (signup, login, CRUD for repos/issues/PRs, merge).

Prometheus metrics at `/metrics`.

---

## Project Layout

```
backend-main/
  controllers/     30 files (API + CLI controllers)
  services/        20 files (business logic)
  models/          18 Mongoose schemas
  routes/          19 route files
  middleware/      13 (auth, rate limiting, security, cache, tracing...)
  __tests__/       12 test suites, 96 tests
  index.js         server + GraphQL + CLI

frontend-main/src/
  components/      34 components across 18 directories
  hooks/           6 custom hooks
  __tests__/       8 test suites, 33 tests
```

---

## Testing

```bash
cd backend-main && npm test       # 12 suites, 96 tests
cd frontend-main && npm test      # 8 suites, 33 tests
```

Backend tests cover auth, repos, issues, search, snippets, webhooks, pipelines, code review, boards, API keys, and audit logs. Frontend tests cover login, signup, repo creation, snippet creation, search, dashboard, error boundaries, and hooks.

---

## Deployment

**CI** runs lint, tests, build, and Docker verification on every push via GitHub Actions.

**CD** deploys to Railway (staging on tag push, production via manual gate). Frontend auto-deploys on Vercel.

**Docker Compose** runs 5 services: backend, frontend (nginx), MongoDB 7, Redis 7, and an Nginx reverse proxy.
