# Contributing Guide

Welcome to the **Group Trip Planning** project! This guide explains how to set up your local development environment and contribute to the repository.

---

## 1. Tech Stack

* **Backend:** Kotlin, Spring Boot, Maven (wrapper included), Java 21
* **Database:** PostgreSQL 17 (containerized via Docker Compose)
* **Frontend:** React + TypeScript (Vite)
* **Orchestration / Tooling:** GNU Make, Docker Compose

---

## 2. Prerequisites

Ensure you have the following installed before setting up the project:

* **[Git](https://git-scm.com/):** Version control.
* **[Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine:** To run the PostgreSQL database.
* **[JDK 21](https://adoptium.net/):** To compile and run the backend.
* **[Make](https://www.gnu.org/software/make/):** To execute automation commands.
* **[Node.js (v20+)](https://nodejs.org/):** For frontend development.

---

## 3. Quick Start

1. Clone the repository and copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
   *(Note: `make up` will automatically create `.env` from `.env.example` if it doesn't exist yet!)*

2. Start the database and backend with a single command:
   ```bash
   make up
   ```

This will:
1. Ensure `.env` exists and export all environment variables.
2. Spin up the PostgreSQL 17 container in the background.
3. Wait for the database healthcheck to report `healthy`.
4. Launch the Spring Boot backend on `http://localhost:8080`.

To stop the database:
```bash
make down
```

---

## 4. Project Structure

```text
.
├── .github/
│   └── CONTRIBUTING.md      # This contribution guide
├── backend/                 # Spring Boot backend application
│   ├── src/                 # Kotlin source code and application properties
│   ├── pom.xml              # Maven dependencies and build configuration
│   └── mvnw                 # Maven wrapper script
├── frontend/                # React (Vite + TypeScript) frontend application
├── docs/                    # Project ideas, pitch, and specifications
├── docker-compose.yml       # Local PostgreSQL database container configuration
├── Makefile                 # Developer automation commands
├── .env.example             # Template for local environment variables
└── .gitignore               # Ignored files for Java, Node, Docker, and IDEs
```

---

## 5. Development Commands

Use the provided `Makefile` to simplify common tasks:

| Command | Description |
|---|---|
| `make up` | Start PostgreSQL in Docker and launch the backend |
| `make db` | Start PostgreSQL in Docker only (wait until healthy) |
| `make down` | Stop the PostgreSQL container |
| `make backend` | Run the Spring Boot backend locally (requires DB running) |
| `make test` | Run backend automated tests |
| `make clean` | Clean Maven build artifacts |

---

## 6. Database Configuration

PostgreSQL runs via Docker Compose with the following local defaults:

| Setting | Value |
|---|---|
| Service Name | `database` |
| Database Name | `travel_planner` |
| Username | `travel_planner` |
| Password | `local_dev_password` |
| Host | `localhost` |
| Port | `5432` |

To override the database password locally, set the `DB_PASSWORD` environment variable:
```bash
export DB_PASSWORD=your_custom_password
```

---

## 7. IDE Setup

### IntelliJ IDEA
1. Open the project root or the `backend/` directory as a Maven project.
2. Verify that **Project SDK** is set to **Java 21** (`File > Project Structure > Project`).
3. Set Maven runner JRE to Java 21 (`Settings > Build, Execution, Deployment > Build Tools > Maven > Runner`).
4. Run `TravelplannerApplication.kt` directly from the IDE (ensure DB is running via `make db`).
