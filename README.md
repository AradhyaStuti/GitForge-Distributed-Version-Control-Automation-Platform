# Gitless Forge

A side project where I tried to build a GitHub-style platform from scratch — including my own version control instead of wrapping Git.

It started because I wanted to understand what's actually happening when you run `git commit` or open a PR, so I built the pieces myself: file snapshots, branch state, a CI runner, code review, project boards.

Not production software. It's a learning project that turned into something I keep adding to.

## Running it

```bash
git clone https://github.com/AradhyaStuti/Gitless-Forge-Distributed-Version-Control-Automation-Platform.git
cd Gitless-Forge-Distributed-Version-Control-Automation-Platform

cp backend-main/.env.example backend-main/.env
# set MONGO_URI and JWT_SECRET in .env

cd backend-main && npm install && npm start
cd ../frontend-main && npm install && npm run dev
```

Or:

```bash
docker compose up --build
```

## What's in here

**The VCS part.** No libgit2, no shelling out to `git`. Repos are tracked as file snapshots with commit metadata. There's a CLI (`node index.js init`, `add`, `commit`, `branch`, `merge`, `diff`, `log`, `stash`, `revert`, …) wired through `yargs`. Commits get pushed to MongoDB so the web app can show history.

**Pull requests.** Branch-based, with review threads, status, and a merge flow.

**Code review.** Static analysis pass over the diff that flags hardcoded secrets, unsafe function calls (`eval`, etc.), and a few SQL-injection-shaped patterns. Not a linter replacement — more of a sanity check.

**CI/CD.** Pipelines run as Node child processes. Multi-stage steps, captured logs, exit codes, success rate per pipeline.

**Project boards.** Kanban with drag-and-drop, priorities, assignees.

**Auth and the rest.** JWT, bcrypt, rate limiting, request validation, swagger docs at `/api/v1/docs`, socket.io for live updates on PRs and boards, API keys for programmatic access.

## Stack

React + Vite on the front. Node + Express + MongoDB on the back. Jest for tests. Docker Compose ties it together.

## Tests

```bash
cd backend-main && npm test
cd frontend-main && npm test
```

Backend has integration tests for auth, repos, PRs, code review, pipelines, project boards, API keys, and middleware. Most of the business logic is covered; UI tests are sparser.

## Status

Works on my machine and the docker-compose setup. Some edges are rough — the merge logic doesn't handle three-way conflicts cleanly yet, and the diff view is line-based, not token-based. PRs welcome if anyone's actually reading this.
