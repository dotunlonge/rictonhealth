<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=Ricton+Health" alt="Ricton Health Logo" width="120" />
  <h1>Ricton Healthcare Platform Backend</h1>
  
  <p>
    <strong>A high-performance, strictly-typed microservices architecture powering the Ricton B2B and B2C healthcare platforms.</strong>
  </p>

  <p>
    <a href="#-integration-guide-frontend--mobile">Integration Guide</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#testing">Testing</a>
  </p>
</div>

---

## 🚀 Integration Guide (Frontend & Mobile)

We utilize **Pure OpenAPI Routes** strictly typed at the backend layer. There are no tedious NPM packages to install, publish, or bump every time an endpoint changes. You hit the REST endpoints directly using standard `fetch` or `axios`.

### How to test and explore the API:

1. Boot up the platform: `yarn dev`
2. Navigate to the interactive **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
3. The raw `openapi.yaml` spec is available at the root of this repository if you wish to pipe it into your own local tooling (like `openapi-typescript` on the frontend side).

### Authentication Flow

1. **Register**: `POST http://localhost:8000/api/auth/register` (returns `201`)
2. **Login**: `POST http://localhost:8000/api/auth/login` (returns a `JWT` token)
3. **Protected Routes**: Pass the JWT in the `Authorization: Bearer <token>` header to access protected routes like `GET http://localhost:8000/api/users/me`.

---

## 🚀 Tech Stack

- **Runtime & Language**: Node.js, Express, TypeScript (Strict)
- **API Gateway**: Kong (Declarative Databaseless Mode)
- **Database**: PostgreSQL (Amazon RDS) managed via **Prisma** ORM
- **Caching & Ephemeral Store**: Redis
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes (Amazon EKS) via Helm
- **Observability**: Pino (Logging), Datadog (APM), Sentry (Error Tracking)
- **CI/CD**: GitHub Actions

---

## 🏗 Architecture

The backend is built as an **NPM Workspaces Monorepo**. This allows us to maintain the strict boundary of independently deployable microservices, while sharing essential packages (like `Prisma` schemas, `Types`, and `Observability` setups).

### The Kong Gateway Pattern

All incoming traffic is managed by **Kong API Gateway**. Kong natively handles:

1. **Routing**: Forwarding `/api/auth` to the Auth Service and `/api/users` to the User Service.
2. **Security**: Enforcing global CORS and (soon) JWT signature validation.
3. **Observability**: Standardizing request logs before traffic even hits the Node.js instances.

### Services

| Service        | Port   | Description                                                                                    |
| -------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `auth-service` | `3001` | Handles user registration, OTP generation (SMS/Email), OAuth (Google/Apple), and JWT issuance. |
| `user-service` | `3002` | Manages role-based profiles (Patient, Consultant, Pharmacist, Admin) and medical histories.    |

### Shared Packages

| Package                   | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `@ricton/db`              | Centralized Prisma schema, migrations, and generated TypeScript client.            |
| `@ricton/shared`          | Unified error handling, Pino + Datadog logger, Zod schemas, and utility functions. |
| `@ricton/auth-middleware` | JWT verification and Role-Based Access Control (RBAC) Express middleware.          |

---

## 🛠 Getting Started (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js (v20+)
- npm or yarn

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/YourOrg/Ricton.git
cd Ricton

# Install dependencies (from root to trigger npm workspaces)
npm ci
```

### 2. Environment Variables

Create a `.env` file at the root. The `docker-compose.yml` expects default values:

```bash
DATABASE_URL="postgresql://ricton:password@localhost:5432/ricton?schema=public"
JWT_SECRET="super-secret-development-key"
```

### 3. Database Migrations

Generate the Prisma client and push the schema to the database:

```bash
# Start just the database
docker-compose up -d postgres

# Run migrations
npm run db:migrate

# Generate the Prisma client
npm run db:generate
```

### 4. Boot up the Platform

To spin up the entire suite—Kong Gateway, Redis, Postgres, Auth Service, and User Service—run:

```bash
yarn dev
# or
docker-compose up --build
```

> The API Gateway is now listening on **`http://localhost:8000`**

---

## 🧪 Testing

We employ a "No Mocks" testing strategy. Integration tests spin up an isolated, disposable PostGIS database to guarantee complete end-to-end reliability.

To run the entire integration test suite:

```bash
./scripts/test-e2e.sh
```

---

# Ricton
