# Team Artefacts

| Artefact | Link | Notes |
| :--- | :--- | :--- |
| **Definition of Done** | [Wiki: Definition of Done](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#definition-of-done) | Explicit quality gates (>90% line coverage, zero compile/lint errors, PR approval, Doxygen comments, acceptance tests) |
| **Product Vision & Business Model** | [Wiki: Business Model](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model) | Problem, solution, features and core project assumptions |
| **Epics and User Stories** | [Wiki: Epics and User Stories](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories) | Breakdown of all 6 project epics and associated stories |
| **Contributing Guide** | [`CONTRIBUTING.md`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/CONTRIBUTING.md) | Branching, local setup, testing, review and Definition of Done |
| **Database Migrations** | [`supabase/migrations/`](https://github.com/MESW-LES-2627/les-project-group-2/tree/staging/supabase/migrations) | Versioned SQL for trips, memberships, profiles/storage, pins/votes, trip dates/state, candidate windows, availability, pin confirmation and the trip date lock with itinerary days |
| **Database Tests** | [`supabase/tests/`](https://github.com/MESW-LES-2627/les-project-group-2/tree/staging/supabase/tests) | pgTAP tests for the candidate-window constraints |
| **Acceptance Tests** | [`acceptanceTests/`](https://github.com/MESW-LES-2627/les-project-group-2/tree/staging/acceptanceTests) | One acceptance suite per user story, including the three stories delivered in this increment |
| **CI/CD Quality & Deployment Workflows** | [`.github/workflows/checks.yaml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/checks.yaml) · [`.github/workflows/deploy.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/deploy.yml) | Pull-request validation, automated Supabase migrations and Vercel deployments |
| **Local Development Stack** | [`docker-compose.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/docker-compose.yml) · [`supabase/config.toml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/config.toml) | Containerized Postgres, GoTrue authentication, Studio and Mailpit |
| **Iteration 1 Claim** | [`docs/iterations/1/claim.md`](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/docs/iterations/1/claim.md) | Previous increment, kept for comparison |
