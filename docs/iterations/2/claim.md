# CLAIM: Iteration 2

> **Group 2 — PlanIt!**
>
> **Increment / Milestone:** Iteration 2 — Official Trip Dates, Best-Date Suggestions, Committing Winning Pins, Member Roles, and Browser-Level Acceptance Tests.
>
> This claim is split into focused documents so that each part can be read on its own.
> The main structure of the Iteration 0 and Iteration 1 claims is unchanged; the
> [claim structure](#claim-structure) table shows where every section now lives.

---

## Permalinks We Follow

| Item | Link | Notes |
| :--- | :--- | :--- |
| **This tag** | [`iter-2`](https://github.com/MESW-LES-2627/les-project-group-2/tree/iter-2) | Tag for Iteration 2 delivery; to be created |
| **Compare with the last tag** | [`iter-1...iter-2`](https://github.com/MESW-LES-2627/les-project-group-2/compare/iter-1...iter-2) | Comparison diff against Iteration 1; available once `iter-2` is created |
| **Production** | [https://planit2.vercel.app](https://planit2.vercel.app) | Live production deployment on Vercel (auto-deployed from `main`) |
| **Staging** | [https://planit2-staging.vercel.app](https://planit2-staging.vercel.app) | Live staging preview deployment on Vercel (auto-deployed from `staging`) with a dedicated staging Supabase database |
| **Pipeline** | [GitHub Actions Pipelines](https://github.com/MESW-LES-2627/les-project-group-2/actions) | [Checks workflow](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/checks.yaml) & [Deploy workflow](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/deploy.yml) |
| **MVP** | [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2) | [Business Model & Features (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#features-and-assumptions) · [Epics & User Stories (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories) |
| **Vision** | [Product Vision (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#product-vision) | Also documented in [README and Project Vision](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#project-vision) |
| **Stories in this increment** | [Stories in this increment](03-stories.md) | Milestone 2 stories delivered in Iteration 2, with issues, pull requests and evidence |
| **How to run the tests** | [How to run the tests](04-testing.md) | Commands, current results and the tests added in this increment |
| **Retrospective** | [Retrospective](06-retrospective.md) | What went well, what hurt, and proposed improvements |
| **AI log** | [AI log](07-ai-log.md) | AI toolchain interventions and discrepancies caught in review |
| **Team artefacts** | [Team artefacts](05-team-artefacts.md) | Definition of Done, architecture configs, migrations and workflows |

---

## Claim Structure

| # | Document | Main structure section(s) it contains |
| :--- | :--- | :--- |
| — | [This page](claim.md) | Header, permalinks and reading guide |
| 01 | [Delivery, environments and product](01-delivery.md) | Delivery · Environments · Product |
| 02 | [What runs on this tag](02-what-runs.md) | What Runs on This Tag |
| 03 | [Stories in this increment](03-stories.md) | Stories in This Increment |
| 04 | [How to run the tests](04-testing.md) | How to Run the Tests |
| 05 | [Team artefacts](05-team-artefacts.md) | Team Artefacts |
| 06 | [Retrospective](06-retrospective.md) | Retrospective |
| 07 | [AI log](07-ai-log.md) | AI Log |

---

## At a Glance

| Item | Value |
| :--- | :--- |
| **Verified staging snapshot** | [`f8933872`](https://github.com/MESW-LES-2627/les-project-group-2/commit/f8933872c4cd4a8a143ce7628bdaa6db99d10f58) |
| **User stories delivered** | US-1.6 · US-2.3 · US-2.4 · US-3.3 · US-3.5 |
| **Quality work delivered** | Browser-level Playwright acceptance suite (PR [#75](https://github.com/MESW-LES-2627/les-project-group-2/pull/75)) |
| **Ready for review** | Migration guards and clean-database validation (PR [#78](https://github.com/MESW-LES-2627/les-project-group-2/pull/78)) |
| **Application tests** | 563 passing tests across 84 files (512 Vitest + 51 Playwright) |
| **Line coverage** | 90.49% (Vitest) |
| **Lint** | 0 errors, 0 warnings |
| **Staging pipeline** | [Checks](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44734211579) and [deploy](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44734211485) green for `f8933872` |
