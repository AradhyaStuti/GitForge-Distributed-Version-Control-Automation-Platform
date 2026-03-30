<p align="center">
  <img src="banner.svg" alt="GitForge" width="100%"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20+-7c3aed?style=flat-square&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/react-18-7c3aed?style=flat-square&logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/mongodb-7c3aed?style=flat-square&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/docker-ready-7c3aed?style=flat-square&logo=docker&logoColor=white"/>
</p>

A full-stack code hosting platform built to learn how systems like GitHub work. Custom file-based version control, CI/CD that executes real shell commands, regex-based code review, Kanban boards, and a React + Express stack.

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

## Features

**Custom VCS** — Commits stored as JSON + file snapshots under `.gitforge/`. CLI supports init, add, commit, push, pull, branch, merge, checkout, log, diff, blame, stash, tag, cherry-pick, reset, and more (24 commands).

**Pull Requests** — Create PRs with source/target branches, review, merge. Comment threads with reactions.

**Code Review** — Regex-based static analysis against real PR diffs (Myers diff algorithm). Detects eval(), innerHTML, SQL injection, hardcoded secrets, nested loops, sequential awaits. Quality score 0-100.

**CI/CD Pipelines** — Multi-stage pipelines. Each step runs via `child_process.execFile` with stdout/stderr capture, exit codes, timeouts, and env vars.

**Project Boards** — Kanban with drag-and-drop, WIP limits, card priorities, assignees, due dates.

**API** — 30 REST endpoints with Swagger docs + GraphQL (queries and mutations). JWT and API key auth.

**Security** — bcrypt, account lockout, rate limiting, NoSQL injection prevention, XSS sanitization, Helmet, HMAC-SHA256 webhooks, audit logging, request tracing.

**Other** — Snippets (like Gists), Socket.IO notifications, Redis cache with in-memory fallback, Prometheus metrics endpoint.

---

## Tech Stack

| | |
|---|---|
| **Frontend** | React 18, Vite, Primer CSS, Socket.IO Client |
| **Backend** | Node.js, Express, Mongoose, Socket.IO |
| **Database** | MongoDB, Redis (optional) |
| **Testing** | Jest + Supertest, Vitest + Testing Library (37 tests) |
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
```

Run `node index.js --help` for the full list.

---

## API

Swagger docs at `/api/v1/docs`. GraphQL at `/graphql`.

```
POST /signup              POST /login
POST /repo/create         GET  /repo/all
POST /pr/create           POST /pr/:id/merge
POST /pipeline            POST /pipeline/:id/trigger
POST /code-review         GET  /code-review/pr/:prId
POST /boards              POST /api-keys
```

---

## Testing

```bash
cd backend-main && npm test
cd frontend-main && npm test
```

37 integration and unit tests covering auth, repos, issues, PRs, pipelines, code review, boards, API keys, audit logs, search, snippets, and webhooks.

---

## Deployment

**CI** runs lint, tests, and build on every push via GitHub Actions.

**Docker Compose** runs backend, frontend (nginx), MongoDB 7, Redis 7, and Nginx reverse proxy.
