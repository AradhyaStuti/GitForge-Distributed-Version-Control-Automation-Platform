
##  Gitless Forge — Distributed Version Control & Automation Platform

A full-stack engineering system built to **experiment with version control concepts, CI/CD pipelines, and collaborative development workflows from scratch**.

Unlike a Git wrapper or Git-based tool, this project implements a **custom file-snapshot based versioning system and workflow engine independently**, designed purely for learning how modern developer platforms function under the hood.

---

## Quick Start

```bash
git clone https://github.com/AradhyaStuti/Gitless-Forge-Distributed-Version-Control-Automation-Platform.git
cd Gitless-Forge-Distributed-Version-Control-Automation-Platform

cp backend-main/.env.example backend-main/.env
# Configure MongoDB URI and JWT secret

cd backend-main && npm install
cd ../frontend-main && npm install

# Run backend
cd backend-main && npm start

# Run frontend
cd frontend-main && npm run dev
```

Or using Docker:

```bash
docker compose up --build
```

---

##  Key Features

###  Custom Versioning System (Not Git-based)

Built independently using **file snapshot storage + commit metadata tracking**.
Implements version history, branching logic, and merges without relying on Git or any Git internals.

Core operations include:

* Initialize repository structure
* Create commits with snapshots
* Branch creation and switching
* Merge simulation and history tracking
* Diff and log visualization

---

###  Pull Request Workflow Engine

Supports structured collaboration through:

* Branch-based pull requests
* Review discussions and comments
* Controlled merge flow between branches

---

### Code Review Automation

Static analysis engine that evaluates code changes in pull requests and flags risky patterns such as:

* Unsafe function usage
* Hardcoded secrets
* SQL injection-prone patterns
* Inefficient nested logic

---

###  CI/CD Pipeline System

A lightweight pipeline execution engine that:

* Runs build/test steps via Node.js child processes
* Captures logs, exit codes, and errors
* Supports multi-stage execution flow

---

###  Project Management Boards

Kanban-style task system with:

* Drag-and-drop task movement
* Priority levels and assignment tracking
* Simple workflow visualization

---

###  Authentication & Security Layer

* JWT-based authentication
* Password hashing with bcrypt
* API protection middleware
* Basic rate limiting and request validation

---

## Tech Stack

**Frontend:** React, Vite
**Backend:** Node.js, Express
**Database:** MongoDB
**Realtime:** Socket.IO
**Testing:** Jest, React Testing Library
**DevOps:** Docker, GitHub Actions

---

## Testing

```bash
cd backend-main && npm test
cd frontend-main && npm test
```

Includes unit and integration tests covering authentication, versioning system, PR workflows, pipelines, and APIs.

---

## Deployment

* Docker Compose for full-stack orchestration
* GitHub Actions for CI pipeline (lint, test, build)

---

## What this project demonstrates

This project is focused on understanding **how modern developer platforms are built internally**, including:

* Designing a version control-like system without Git dependency
* Building CI/CD execution pipelines
* Implementing collaborative workflows (PRs, reviews)
* Handling backend-heavy system design in Node.js

---
