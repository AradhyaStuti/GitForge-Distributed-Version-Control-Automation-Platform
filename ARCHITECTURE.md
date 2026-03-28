# GitForge Architecture

This document describes the system architecture of GitForge, a distributed version control and automation platform.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Component Descriptions](#component-descriptions)
- [Data Flow](#data-flow)
- [API Design Principles](#api-design-principles)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Technology Choices](#technology-choices)

---

## High-Level Architecture

```
                              +------------------+
                              |    CDN / Edge    |
                              | (Static Assets)  |
                              +--------+---------+
                                       |
                                       v
+----------+    HTTPS    +-------------+--------------+
|  Browser | ----------> |       Nginx Reverse        |
|  Client  | <---------- |         Proxy              |
+----------+             +--+---------------------+---+
                             |                     |
                    /api/*   |                     | /*
                             v                     v
                  +----------+-------+    +--------+---------+
                  |   Backend API    |    |    Frontend SPA   |
                  |   (Express.js)   |    |   (React + Vite)  |
                  +--+----+----+----++    +------------------+
                     |    |    |    |
           +---------+    |    |    +---------+
           |              |    |              |
           v              v    v              v
    +------+-----+ +------+----+--+   +------+------+
    |  MongoDB   | |    Redis     |   |  Socket.IO  |
    | (Primary)  | |   (Cache)    |   | (Real-time) |
    +------------+ +--------------+   +-------------+
```

---

## Component Descriptions

### Frontend (React SPA)

| Aspect      | Detail                                                  |
|-------------|---------------------------------------------------------|
| Framework   | React 18 with functional components and hooks           |
| Build Tool  | Vite 5 for development server and production builds     |
| UI Library  | Primer React (GitHub's design system)                   |
| Routing     | React Router v6 with client-side navigation             |
| HTTP Client | Axios with interceptors for auth token injection        |
| Real-time   | Socket.IO client for live notifications and updates     |
| State       | React Context + hooks for global state management       |

The frontend is a single-page application that compiles to static assets. In production, these are served by Nginx. During development, Vite provides hot module replacement on port 5173.

### Backend (Express.js API)

| Aspect       | Detail                                                 |
|--------------|--------------------------------------------------------|
| Runtime      | Node.js 20 LTS                                        |
| Framework    | Express.js 4.x                                        |
| Database     | MongoDB 7 via Mongoose ODM                            |
| Auth         | JWT-based stateless authentication (jsonwebtoken)      |
| Validation   | express-validator for request payload validation       |
| Security     | Helmet, CORS, bcryptjs, rate limiting                  |
| Real-time    | Socket.IO for WebSocket connections                    |
| API Docs     | Swagger/OpenAPI via swagger-jsdoc and swagger-ui       |
| Logging      | Morgan for HTTP request logging                        |
| CLI          | Yargs for command-line interface and server startup    |

The backend follows a layered architecture:

```
routes/          Define HTTP endpoints and attach middleware
controllers/     Handle request/response, delegate to services
services/        Business logic and data orchestration
middleware/      Cross-cutting concerns (auth, validation, rate limiting)
models/          Mongoose schemas and database models
utils/           Shared helper functions and constants
```

### MongoDB

Primary data store for all persistent application data including user accounts, repositories, issues, pull requests, and activity logs. Mongoose provides schema validation and query building at the application layer.

### Redis

Optional caching layer used for:
- Session data and rate limiter state
- Frequently accessed query results
- Real-time pub/sub for multi-instance Socket.IO

Falls back to in-memory storage when Redis is unavailable, enabling single-node development without Redis installed.

### Nginx Reverse Proxy

Routes incoming traffic to the appropriate service:
- `/api/*` requests proxy to the Express.js backend on port 3000
- All other requests serve the React SPA static files
- Handles TLS termination and HTTP/2 in production
- Provides gzip compression and static asset caching headers

---

## Data Flow

### Authentication Flow

```
Client                    API Server                  MongoDB
  |                           |                          |
  |-- POST /api/v1/login ---->|                          |
  |                           |-- Find user by email --->|
  |                           |<-- User document --------|
  |                           |                          |
  |                           |-- Compare bcrypt hash    |
  |                           |-- Generate JWT token     |
  |                           |                          |
  |<-- 200 { token } --------|                          |
  |                           |                          |
  |-- GET /api/v1/repos ----->|                          |
  |   Authorization: Bearer   |                          |
  |                           |-- Verify JWT             |
  |                           |-- Query repos ---------->|
  |                           |<-- Repo documents -------|
  |<-- 200 { repos } --------|                          |
```

### Real-time Updates Flow

```
Client A          Socket.IO Server          Client B
  |                     |                      |
  |-- connect --------->|                      |
  |                     |<------- connect -----|
  |                     |                      |
  |-- push event ------>|                      |
  |                     |-- broadcast -------->|
  |                     |                      |
```

### Repository Operations Flow

```
Client --> Nginx --> Express Router --> Auth Middleware --> Rate Limiter
  --> Validation Middleware --> Controller --> Service --> Mongoose Model
  --> MongoDB --> Response back through the chain
```

---

## API Design Principles

1. **RESTful conventions.** Resources are nouns, HTTP methods define actions. Standard status codes indicate outcomes.

2. **Versioned endpoints.** All API routes are prefixed with `/api/v1/` to allow non-breaking evolution.

3. **Consistent response format.** All responses follow a uniform structure:
   ```json
   {
     "success": true,
     "data": { },
     "message": "Description of the result"
   }
   ```

4. **Input validation at the boundary.** All request bodies, query parameters, and URL parameters are validated using express-validator before reaching business logic.

5. **Pagination by default.** List endpoints return paginated results with `page`, `limit`, `total`, and `totalPages` metadata.

6. **Error responses include codes.** Errors return machine-readable error codes alongside human-readable messages for client-side handling.

---

## Security Architecture

### Authentication and Authorization

- **Password hashing:** bcryptjs with configurable rounds (default 12).
- **Token-based auth:** JWT tokens with configurable expiration. Tokens are stateless and verified on each request.
- **Account lockout:** Configurable maximum failed attempts before temporary account lockout.
- **Role-based access:** Users have roles that determine access to resources and administrative functions.

### Transport Security

- **HTTPS enforced** in production via Nginx TLS termination.
- **HSTS headers** set via Helmet middleware.
- **Secure cookie flags** when cookies are used.

### Input Protection

- **Request validation** on all endpoints via express-validator.
- **Rate limiting** globally and per-endpoint (stricter on auth routes).
- **Helmet** sets security headers (CSP, X-Frame-Options, X-Content-Type-Options).
- **CORS** restricted to explicitly allowed origins.
- **Mongoose sanitization** prevents NoSQL injection through schema enforcement.

### Dependency Security

- **npm audit** runs in CI on every pull request.
- **CodeQL analysis** scans for vulnerabilities on a weekly schedule and on every push to main.
- **Dependabot** (when enabled) provides automated dependency update PRs.

### Secrets Management

- All secrets are stored in environment variables, never in source code.
- `.env` files are gitignored. `.env.example` provides a template.
- Production secrets are managed through the deployment platform (Railway, Vercel).

---

## Scalability Considerations

### Horizontal Scaling

The backend is designed for stateless horizontal scaling:

- **No server-side sessions.** JWT tokens eliminate the need for shared session stores.
- **Redis pub/sub** enables Socket.IO to broadcast across multiple Node.js instances.
- **MongoDB connection pooling** handled by Mongoose with configurable pool sizes.
- **Docker Compose** `deploy.replicas` can scale individual services.

### Performance Optimizations

- **Redis caching** for frequently accessed data (user profiles, repository metadata).
- **MongoDB indexes** on commonly queried fields (username, email, repository name).
- **Nginx gzip compression** reduces payload sizes.
- **Frontend code splitting** via Vite's dynamic imports reduces initial load time.
- **Static asset caching** with long-lived cache headers for hashed filenames.

### Monitoring and Observability

- **Health check endpoints** on all services for load balancer integration.
- **Morgan HTTP logging** for request tracking and latency measurement.
- **Docker healthchecks** enable automatic container restart on failure.
- **Metrics endpoint** (when enabled) exposes runtime metrics for Prometheus scraping.

### Database Scaling Path

```
Phase 1: Single MongoDB instance (current)
Phase 2: MongoDB Replica Set for read scaling and high availability
Phase 3: MongoDB Sharding for write scaling across large datasets
```

---

## Technology Choices

| Technology      | Rationale                                                           |
|-----------------|---------------------------------------------------------------------|
| Node.js 20      | JavaScript across the full stack; LTS with long-term support        |
| Express.js      | Minimal, well-understood HTTP framework with rich middleware        |
| React 18        | Component model, large ecosystem, concurrent rendering features     |
| Vite            | Fast dev server with HMR; optimized production builds               |
| MongoDB         | Flexible document model suits varied repository metadata            |
| Mongoose        | Schema validation and query building without raw driver complexity  |
| Redis           | Sub-millisecond caching; native pub/sub for real-time features      |
| Socket.IO       | Reliable WebSocket abstraction with automatic reconnection          |
| Nginx           | Battle-tested reverse proxy with TLS termination and compression    |
| Docker          | Reproducible environments across development and production         |
| GitHub Actions  | Integrated CI/CD with the source repository                        |
| Railway         | Backend hosting with managed infrastructure and auto-scaling        |
| Vercel          | Frontend hosting optimized for static SPA deployments               |
| Primer React    | GitHub's own design system provides familiar, accessible UI         |
| JWT             | Stateless auth tokens enable horizontal scaling without shared state|
| Helmet          | Security headers with sensible defaults                             |
