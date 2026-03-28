# Contributing to GitForge

Thank you for your interest in contributing to GitForge. This guide covers everything you need to get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Format](#commit-message-format)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)

---

## Development Setup

### Prerequisites

- **Node.js** >= 20.x (LTS recommended)
- **npm** >= 10.x
- **MongoDB** >= 7.0 (local or Docker)
- **Redis** >= 7.0 (optional, falls back to in-memory)
- **Docker** and **Docker Compose** (for containerized development)

### Quick Start

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/<your-username>/gitforge.git
   cd gitforge
   ```

2. **Set up the backend**

   ```bash
   cd backend-main
   cp .env.example .env
   # Edit .env with your local configuration
   npm install
   npm run dev
   ```

3. **Set up the frontend**

   ```bash
   cd frontend-main
   npm install
   npm run dev
   ```

4. **Or use Docker Compose for the full stack**

   ```bash
   docker-compose up -d
   ```

   This starts the API server, frontend, MongoDB, Redis, and Nginx reverse proxy.

### Verifying Your Setup

- Backend API: `http://localhost:3000/health`
- Frontend: `http://localhost:5173` (dev) or `http://localhost:80` (Docker)
- API Docs: `http://localhost:3000/api-docs`

---

## Architecture Overview

GitForge follows a standard two-tier web architecture:

```
frontend-main/          React 18 SPA (Vite, Primer React)
backend-main/           Express.js REST API
  controllers/          Route handlers
  services/             Business logic
  middleware/           Auth, validation, rate limiting
  models/              Mongoose schemas
  routes/              API route definitions
  utils/               Shared utilities
  __tests__/           Jest test suites
```

- **Frontend** communicates with the backend via Axios over REST endpoints and Socket.IO for real-time features.
- **Backend** connects to MongoDB for persistence and optionally Redis for caching and session management.
- **Nginx** serves as a reverse proxy in production, terminating TLS and routing traffic.

---

## Code Style Guidelines

### General

- Use **ESLint** for all JavaScript code. Run `npm run lint` before committing.
- Use **2-space indentation** (no tabs).
- Prefer `const` over `let`; never use `var`.
- Use descriptive variable and function names.
- Keep functions small and focused on a single responsibility.

### Backend (Node.js / Express)

- Use `async/await` for asynchronous operations. Avoid raw callbacks.
- Always handle errors with try/catch blocks or error-handling middleware.
- Validate all incoming request data using `express-validator`.
- Never expose stack traces or internal error details to clients.
- Use environment variables for all configuration. Never hardcode secrets.

### Frontend (React)

- Use functional components with hooks.
- Co-locate component styles and tests with the component file.
- Use Primer React components for UI consistency.
- Manage API calls through a centralized service layer.

---

## Commit Message Format

GitForge follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Description                                      |
|------------|--------------------------------------------------|
| `feat`     | A new feature                                    |
| `fix`      | A bug fix                                        |
| `docs`     | Documentation changes only                       |
| `style`    | Code style changes (formatting, no logic change) |
| `refactor` | Code restructuring without feature/fix change    |
| `perf`     | Performance improvements                         |
| `test`     | Adding or updating tests                         |
| `chore`    | Build process, tooling, or dependency updates    |
| `ci`       | CI/CD configuration changes                      |

### Examples

```
feat(auth): add two-factor authentication support

fix(api): prevent duplicate repository names per user

chore(deps): upgrade mongoose to v8.5.0

test(repos): add integration tests for fork endpoint
```

---

## Branch Naming Conventions

| Pattern                  | Use Case                     |
|--------------------------|------------------------------|
| `feature/<description>`  | New features                 |
| `fix/<description>`      | Bug fixes                    |
| `hotfix/<description>`   | Urgent production fixes      |
| `docs/<description>`     | Documentation updates        |
| `refactor/<description>` | Code refactoring             |
| `test/<description>`     | Test additions or updates    |
| `chore/<description>`    | Maintenance and tooling      |

Use lowercase with hyphens. Keep branch names concise but descriptive.

```
feature/oauth-github-integration
fix/rate-limiter-memory-leak
docs/api-authentication-guide
```

---

## Pull Request Process

1. **Create a feature branch** from `develop` (or `main` if no `develop` branch exists).
2. **Make your changes** following the code style guidelines.
3. **Write or update tests** to cover your changes.
4. **Run the full test suite** locally to confirm everything passes:
   ```bash
   cd backend-main && npm test
   cd frontend-main && npm test
   ```
5. **Run the linter** and fix any issues:
   ```bash
   cd backend-main && npm run lint
   cd frontend-main && npm run lint
   ```
6. **Push your branch** and open a pull request against `main`.
7. **Fill out the PR template** completely, including the type of change and testing checklist.
8. **Request a review** from at least one maintainer.
9. **Address review feedback** promptly. Push additional commits rather than force-pushing.
10. Once approved, a maintainer will merge your PR using squash-and-merge.

### PR Requirements

- All CI checks must pass (lint, tests, build, security audit).
- Coverage must not decrease below the configured thresholds.
- At least one approving review from a maintainer.
- No unresolved review comments.

---

## Testing Requirements

### Backend

- **Framework:** Jest with Supertest for HTTP assertions.
- **Location:** Place tests in `backend-main/__tests__/` mirroring the source structure.
- **Coverage thresholds:** 80% lines, 75% functions, 70% branches.
- **Run tests:**
  ```bash
  cd backend-main
  npm test                    # Standard run
  npm test -- --coverage      # With coverage report
  npm run test:verbose        # Verbose output
  ```

### Frontend

- **Framework:** Vitest with React Testing Library.
- **Location:** Co-locate test files with components or place in `__tests__/` directories.
- **Run tests:**
  ```bash
  cd frontend-main
  npm test                    # Standard run
  npm test -- --coverage      # With coverage report
  ```

### Writing Good Tests

- Test behavior, not implementation details.
- Each test should verify one specific behavior.
- Use descriptive test names that read as specifications.
- Mock external dependencies (database, APIs) but avoid over-mocking.
- Include both happy path and error case tests.

---

## Questions?

If you have questions about contributing, open a [Discussion](https://github.com/gitforge/gitforge/discussions) or reach out to the maintainers. We are happy to help.
