# CLAIM: Iteration 0

> **Group 2 — PlanIt!**  
> **Vertical Prototype:** Authenticated user lands on a full-screen interactive Portugal map with geosearch and pin dropping.  
> Every permalink below points to a verified repository resource, documentation page, or live deployment.

---

## Permalinks We Follow

| Item | Link | Notes |
| :--- | :--- | :--- |
| **This tag** | [`iter-0`](https://github.com/MESW-LES-2627/les-project-group-2/tree/iter-0) | Tag for Iteration 0 delivery |
| **Compare with the last tag** | Not applicable | Not applicable |
| **Production** | [https://planit2.vercel.app](https://planit2.vercel.app) | Live production deployment on Vercel (auto-deployed from `main`) |
| **Staging** | *None* | *None* |
| **Pipeline** | [GitHub Actions Pipelines](https://github.com/MESW-LES-2627/les-project-group-2/actions) | [Checks workflow](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/.github/workflows/checks.yaml) & [Deploy workflow](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/.github/workflows/deploy.yml) |
| **MVP** | [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2) | [Business Model & Features (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#features-and-assumptions) · [Epics & User Stories (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories) |
| **Vision** | [Product Vision (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#product-vision) | Also documented in [README and Project Vision](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#project-vision) |
| **Stories in this increment** | [Milestone 1: Vertical Prototype](https://github.com/MESW-LES-2627/les-project-group-2/milestone/1) | [Stories in this increment breakdown](#stories-in-this-increment) |
| **How to run the tests** | [Test & Setup instructions](#how-to-run-the-tests) | Also documented in [README and Local Development Setup](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#local-development-setup) |
| **Retrospective** | [Retrospective](#retrospective) | What went well, what hurt, and proposed improvements |
| **AI log** | [AI log](#ai-log) | Log of AI toolchain interventions and caught discrepancies |
| **Team artefacts** | [Team artefacts](#team-artefacts-someone-will-be-asked-to-open) | Definition of Done, architecture configs, and workflows |

---

## Delivery

- **Tag:** [`iter-0`](https://github.com/MESW-LES-2627/les-project-group-2/tree/iter-0)
- **Compare with the last tag:** First iteration (no previous tag)

## Environments

- **Production:** [https://planit2.vercel.app](https://planit2.vercel.app)
- **Staging:** None for now
- **Pipelines:** [GitHub Actions](https://github.com/MESW-LES-2627/les-project-group-2/actions)
  - Lint, test, and build validation: [`checks.yaml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/.github/workflows/checks.yaml)
  - Vercel production deployment: [`deploy.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/.github/workflows/deploy.yml)

## Product

- **Vision:** [Product Vision (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#product-vision) / [Project Vision (README)](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#project-vision)
- **MVP:** [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2)
  - Outlined in [Wiki Features and Assumptions](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#features-and-assumptions) and [Epics & User Stories](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories).

---

## What Runs on This Tag

The thin end-to-end slice through every layer for the **Vertical Prototype**:
A user creates an account or logs in with email/password via Supabase Auth, lands directly on an interactive full-screen map centered on Portugal, searches for places with instant autocomplete via OpenStreetMap Nominatim, and drops persistent category-styled pins anywhere on the map.

---

## Stories in This Increment

Tracked in [Milestone 1: Vertical Prototype](https://github.com/MESW-LES-2627/les-project-group-2/milestone/1):

| Story / Task | Issue | Pull Request | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **US-1.1: User Registration and Authentication** | [#10](https://github.com/MESW-LES-2627/les-project-group-2/issues/10) | [PR #48](https://github.com/MESW-LES-2627/les-project-group-2/pull/48) | **Merged** | Supabase SSR authentication, `/entry` login/signup, session protection |
| **US-3.1: Interactive Map & Pin Dropping** | [#24](https://github.com/MESW-LES-2627/les-project-group-2/issues/24) | [PR #50](https://github.com/MESW-LES-2627/les-project-group-2/pull/50) | **Merged** | Carto Leaflet full-screen map, pin markers, category styling, local storage |
| **US-3.7: Search Place by Name** | [#30](https://github.com/MESW-LES-2627/les-project-group-2/issues/30) | [PR #50](https://github.com/MESW-LES-2627/les-project-group-2/pull/50) | **Merged** | Debounced search bar, Next.js Nominatim proxy API route, camera navigation |
| **Infrastructure: Local Docker Database Stack** | — | [PR #49](https://github.com/MESW-LES-2627/les-project-group-2/pull/49) | **Merged** | Local Supabase Docker stack, Postgres 17, GoTrue, Studio, Makefile |
| **Infrastructure: CI Checks & Lint Quality** | — | [PR #51](https://github.com/MESW-LES-2627/les-project-group-2/pull/51) | **Merged** | Automated GitHub Actions CI workflow (lint, test, build), ESLint fixes |

---

## How to Run the Tests

Documented in [README and Local Development Setup](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#local-development-setup).

---

## Team Artefacts

| Artefact | Link | Notes |
| :--- | :--- | :--- |
| **Definition of Done** | [README and Definition of Done](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#definition-of-done) | Explicit quality gates (>90% line coverage, zero compile/lint errors, PR approval, Doxygen comments) |
| **Product Vision & Business Model** | [Wiki: Business Model](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model) | Problem, solution, features and core project assumptions |
| **Epics and User Stories** | [Wiki: Epics and User Stories](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories) | Breakdown of all 6 project epics and associated stories |
| **Architecture: Local Docker & Supabase** | [`docker-compose.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/docker-compose.yml) · [`supabase/config.toml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/supabase/config.toml) | Containerized local Postgres 17, GoTrue auth, Studio, and Mailpit email service |
| **CI/CD Quality Workflows** | [`.github/workflows/checks.yaml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/.github/workflows/checks.yaml) · [`.github/workflows/deploy.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/.github/workflows/deploy.yml) | Automated pull request validation and Vercel continuous deployment |

---

## Retrospective

### What went well

- Made various user stories related to the MVP and assigned them milestones on GitHub.
- Successfully built and deployed a complete prototype with authentication and an interactive map using Vercel and Supabase.
- Exceeded the team's 90% test coverage requirement with comprehensive Vitest mocks for places API, storage, and domain types.
- Done a seamless local Docker development environment (`make db`, `make dev`) enabling rapid offline feature testing without external cloud dependencies.
- Added GitHub Actions CI checks (`checks.yaml`) ensuring no code merges without passing linting, testing, and production build checks.

### What could be done better

- Actually define everything before starting to make issues, implementing the tech stack.
- Better team communication between iterations.


---

## AI Log

### Code generation

Used Gemini 3.8 Flash using Antigravity CLI.

- Successfully implemented most features of the vertical prototype.
- While implenting the map we had to correct it by specifying that an API key is needed for it to work.

### Creation of Issues

Given the user stories we formed, we asked Gemini to automatically create issues for us.