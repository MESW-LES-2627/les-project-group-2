# PlanIt!

> - A trip planning application based on standardized decision making processes.
 
<br>

## Project Vision

### Problem
Going out is fun. Planning trips and hangovers isn't. Many people have seen that lots of trips end up getting cancelled due to organization related issues. Examples of such problems would be availability conflicts and unfair bill splitting that leaves lingering resentment. 

### Solution
An application that helps groups organize (and visualize) itineraries, activities, preferences, availability and shared expenses. With our app, people will be able to register themselves, create plans for future trips, manage those plans by adding/removing people/places amongst other features aiming at improving organization and standardizing the decision making process. 

<br>

## Technology Stack 
We intend on using:

- React/Typescript for frontend
- NextJS/Typescritpt for backend
- Supabase and Postgres for database implementation 
- Vercel and github actions for CI/CD 

<br>

## Definition of Done

A Task/Feature is considered complete when all off the following conditions are satisfied: 

- The feature compiles with no warnings/errors
- The feature corresponds to an issue/user story on the project board 
- The feature behaves as specified on the above referred user story
- The feature has tests
- All of the feature's tests are passing 
- The project with the new feature has a line coverage of, at least, 90%.
- The Feature as approved by, at least, one other member of the team
- Every function has a doxygen style comment above it 
- Occasional general comments can be sparsely found enlightening complex implementation details

<br>

## Vertical Prototype

<br>

## MVP : Minimum Viable Product 

<br>

## Local Development Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://www.docker.com/) & Docker Compose

### 2. Environment Setup
Copy the example environment variables file:
```bash
cp .env.example .env.local
```
The defaults in `.env.example` are pre-configured to work out-of-the-box with the local Docker environment — no external or production Supabase credentials are required.

### 3. Running Database & Services Locally

#### Option A: Local Supabase Stack (Postgres + Auth + Studio via Docker)
The application uses Supabase Auth and database features. You can start the full local stack (PostgreSQL, GoTrue Auth, Studio web UI, and Mailpit for email testing) using Docker via the npm scripts or Makefile:

```bash
# Start local Supabase containers in Docker
npm run db:start   # or: make db

# View status and access URLs
npm run db:status  # or: make status

# Stop local Supabase containers
npm run db:stop    # or: make db-stop
```

- **Local API Gateway:** `http://127.0.0.1:54321`
- **Postgres Database:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Supabase Studio (Web GUI):** [http://127.0.0.1:54323](http://127.0.0.1:54323)
- **Mailpit (Local Email Inbox):** [http://127.0.0.1:54324](http://127.0.0.1:54324)

#### Option B: Standalone PostgreSQL (via Docker Compose)
If you only need a standalone PostgreSQL database running in Docker:

```bash
docker compose up -d   # or: make compose-up
docker compose down    # or: make compose-down
```

### 4. Running the Web Application
Install dependencies and run the Next.js development server:

```bash
npm install
npm run dev            # or: make dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

<br>

## Authors 

This project is being developed by: 
- Gonçalo Sousa, nºXXXXXXXXX
- Cássia Chagas, nº202600801
- Pedro Monteiro, nºXXXXXXXXX
- Daniel Duarte, nº202306000
