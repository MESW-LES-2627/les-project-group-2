# PlanIt!

> **A collaborative trip planning application based on standardized decision-making processes.**

---

## Live Application

The vertical prototype is live and deployed on Vercel:

**[https://planit2.vercel.app](https://planit2.vercel.app)**

---

## Project Vision

### The Problem
Going out is fun; planning trips and managing logistics isn't. Many group trips are abandoned or turn stressful due to:
- **Availability conflicts** and back-and-forth messaging across disparate chats.
- **Disorganized itineraries** where opinions are lost and decisions lack consensus.
- **Unfair or confusing bill splitting** that causes lingering friction among friends.

### The Solution
**PlanIt!** provides an all-in-one collaborative workspace that standardizes group decision-making:
- **Interactive Spatial Discovery:** Explore destinations on a full-screen interactive map, search for landmarks and restaurants, and drop categorized recommendation pins.
- **Collaborative Workspaces:** Create shared trip rooms where participants align preferences and activities.
- **Automated Date Consensus:** Propose candidate travel windows and let the platform find overlapping dates where everyone is available.
- **In-Place Pin Voting:** Democratically vote on proposed places and lock winning spots into the itinerary.
- **Smart Expense Splitting:** Track shared costs and automatically calculate simplified debt settlements so everyone pays their fair share.

---

## Key Features & Roadmap

| Feature Area | Description | Status |
| :--- | :--- | :--- |
| **Interactive Map & Discovery** | Full-screen Carto Leaflet map centered on Portugal, place search with OpenStreetMap Nominatim, and categorized pin markers | **Live (Vertical Prototype)** |
| **Authentication & Workspaces** | Secure user registration, authentication, and session handling via Supabase Auth | **Live (Vertical Prototype)** |
| **Trip Workspaces** | Create and manage custom trips with dedicated workspaces and member collaboration | In Progress ([PR #47](https://github.com/MESW-LES-2627/les-project-group-2/pull/47)) |
| **Date Consensus** | Propose candidate date windows and calculate optimal group availability | MVP Roadmap |
| **Pin Voting & Decisions** | Upvote/downvote proposed places directly on the map to build itineraries | MVP Roadmap |
| **Daily Itinerary Sequencing** | Group confirmed locations into daily schedules and filter map views by day | MVP Roadmap |
| **Shared Expense Splitting** | Log shared expenses and generate debt settlement summaries | MVP Roadmap |

---

## Documentation & Wiki

Detailed specifications, requirements, user stories, and architecture records are hosted on our GitHub Wiki:

- 📖 **[Project Wiki Home](https://github.com/MESW-LES-2627/les-project-group-2/wiki)**
- 🎯 **[Product Vision & Business Model](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model)** — Problem statement, solution, target audience, and assumptions.
- 📋 **[Epics and User Stories](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories)** — Comprehensive user stories across all 6 epics.
- 🚀 **[Milestone 1: Vertical Prototype](https://github.com/MESW-LES-2627/les-project-group-2/milestone/1)** — Slice deliverables and acceptance criteria.
- 📦 **[Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2)** — MVP scope and issue backlog.
- 📑 **[Iteration 0 Claim](docs/iterations/0/claim.md)** — Permalinks, delivery claim, retrospective, and AI log for Iteration 0.

---

## Getting Started & Contributing

Looking to run the project locally, set up the Docker database, run unit tests, or contribute?

**Please refer to our [Contributing Guide (CONTRIBUTING.md)](CONTRIBUTING.md)** for:
- Local prerequisites (Node.js, Docker).
- Starting the local Supabase & PostgreSQL Docker stack (`npm run db:start`).
- Running the Next.js development server (`npm run dev`).
- Executing Vitest unit tests and coverage checks (`npm test`).
- Code style, ESLint validation, and our Definition of Done.

---

## Authors

This project is being developed for **Laboratório de Engenharia de Software (LES)** at FEUP by Group 2:

- **Gonçalo Sousa** (202207320)
- **Cássia Chagas** (202600801)
- **Pedro Monteiro** (202307242)
- **Daniel Duarte** (202306000)
