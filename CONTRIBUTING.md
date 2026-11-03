# Contributing to PlanIt!

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Running Database & Services Locally](#3-running-database--services-locally)
   - [Option A: Local Supabase Stack (Recommended)](#option-a-local-supabase-stack-recommended)
   - [Option B: Standalone PostgreSQL via Docker Compose](#option-b-standalone-postgresql-via-docker-compose)
4. [Running the Web Application](#4-running-the-web-application)
5. [Testing & Code Quality](#5-testing--code-quality)
   - [Running Unit Tests & Coverage](#running-unit-tests--coverage)
   - [Linting and Code Formatting](#linting-and-code-formatting)
   - [Production Build Validation](#production-build-validation)
6. [Development Workflow & Guidelines](#6-development-workflow--guidelines)
   - [Branch Naming](#branch-naming)
   - [Commit Guidelines](#commit-guidelines)
   - [Documentation & Code Comments](#documentation--code-comments)
   - [Definition of Done](#definition-of-done)
   - [Submitting a Pull Request](#submitting-a-pull-request)

---

## 1. Prerequisites

Before running the application locally, ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** (v20+ or v24 LTS recommended)
- **[npm](https://www.npmjs.com/)** (comes bundled with Node.js)
- **[Docker](https://www.docker.com/)** and **Docker Compose**

---

## 2. Environment Setup

Clone the repository and prepare the local environment variables file:

```bash
# Clone the repository
git clone git@github.com:MESW-LES-2627/les-project-group-2.git
cd les-project-group-2

# Copy the example environment file
cp .env.example .env.local
```

The default values in `.env.example` are pre-configured to work out-of-the-box with the local Docker/Supabase environment:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJy...
NEXT_PUBLIC_CARTO_API_KEY=
```

---

## 3. Running Database & Services Locally

### Option A: Local Supabase Stack (Recommended)

The application utilizes Supabase Auth and PostgreSQL. You can start the full local stack (PostgreSQL, GoTrue Auth, Studio Web GUI, and Mailpit for email testing) using Docker via npm scripts or the `Makefile`:

```bash
# Start local Supabase containers in Docker
npm run db:start   # or: make db

# View service status and connection URLs
npm run db:status  # or: make status

# Stop local Supabase containers
npm run db:stop    # or: make db-stop

# Reset local database (migrations and seed data)
npm run db:reset   # or: make db-reset
```

#### Service URLs
| Service | URL / Port |
| :--- | :--- |
| **API Gateway** | `http://127.0.0.1:54321` |
| **PostgreSQL Database** | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| **Supabase Studio (Web GUI)** | [http://127.0.0.1:54323](http://127.0.0.1:54323) |
| **Mailpit (Local Email Testing)** | [http://127.0.0.1:54324](http://127.0.0.1:54324) |

### Option B: Standalone PostgreSQL via Docker Compose

If you only need a standalone PostgreSQL instance running in Docker without auth services:

```bash
# Start PostgreSQL container
docker compose up -d   # or: make compose-up

# Stop PostgreSQL container
docker compose down    # or: make compose-down
```

---

## 4. Running the Web Application

Install dependencies and start the Next.js development server:

```bash
# Install dependencies
npm install

# Start development server
npm run dev            # or: make dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application will automatically reload if you edit any files.

---

## 5. Testing & Code Quality

All pull requests must pass our automated quality gates before merging.

### Running Unit Tests & Coverage

We use [Vitest](https://vitest.dev/) with v8 coverage provider:

```bash
# Run tests and print coverage report
npm test
```

- Tests are located in the `tests/` directory.
- The project enforces a minimum **90% line coverage** for new business logic and service modules.

### Linting and Code Formatting

We use [ESLint](https://eslint.org/) configured for Next.js and TypeScript:

```bash
# Run ESLint checks
npm run lint
```

Ensure `npm run lint` finishes with **0 errors and 0 warnings**.

### Production Build Validation

Verify that Next.js compiles the production build without TypeScript or SSR errors:

```bash
# Build production bundle
npm run build
```

---

## 6. Development Workflow & Guidelines

### Branching Strategy & Environments

We follow a two-tier continuous deployment workflow:

- **`main`**: Production branch. Commits merged here automatically trigger production deployment to Vercel ([https://planit2.vercel.app](https://planit2.vercel.app)).
- **`staging`**: Staging & pre-release integration branch. Commits merged here automatically trigger a staging / preview deployment to Vercel.
- **Feature branches**: Branches for new features or bug fixes should branch off `staging` (or `main`) and be merged into `staging` for testing before promoting to `main`.

### Branch Naming

Create feature branches off the latest `staging` (or `main`):

- Features: `feature/US-x.y-Description` (e.g., `feature/US-3.1-InteractiveMapAndSearch`)
- Bug fixes: `fix/description`
- Documentation: `docs/description`

### Documentation & Code Comments

- Every exported function and class should have a Doxygen-style comment describing its parameters and return value:
  ```ts
  /**
   * @brief Validates if coordinates are within standard geographical bounds.
   * @param lat Latitude (-90 to 90).
   * @param lng Longitude (-180 to 180).
   * @return True if valid, false otherwise.
   */
  export function isValidCoordinate(lat: number, lng: number): boolean { ... }
  ```
- Keep client components SSR-safe (e.g., wrap browser-dependent libraries like Leaflet with dynamic `{ ssr: false }` imports).

### Definition of Done

A task or feature is considered complete when:

1. The feature compiles with no warnings or errors (`npm run build`).
2. The feature corresponds to an issue/user story on the project board.
3. The feature satisfies all acceptance criteria in the user story.
4. The feature includes comprehensive automated unit tests.
5. All tests are passing (`npm test`).
6. The new modules achieve a line coverage of at least **90%**.
7. Code adheres to ESLint rules with 0 errors and 0 warnings (`npm run lint`).
8. Functions include Doxygen-style documentation.
9. The Pull Request is reviewed and approved by at least one other team member.
10. All user stories' acceptance criteria have at least one corresponding, and passing, acceptance test 

### Submitting a Pull Request

1. Push your branch to GitHub:
   ```bash
   git push -u origin feature/your-feature-name
   ```
2. Open a Pull Request targeting `staging` (or `main` for release promotions).
3. Reference the relevant issue in the PR description (e.g., `Closes #10`).
4. Ensure all automated CI checks ([`checks.yaml`](.github/workflows/checks.yaml)) pass cleanly.
5. Request a review from team members.
