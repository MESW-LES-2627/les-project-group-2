# Delivery, Environments and Product

This document groups the three context sections of the claim: what is being
delivered, where it runs, and which product milestone it belongs to.

## Delivery

- **Verified staging snapshot:** [`2638f842`](https://github.com/MESW-LES-2627/les-project-group-2/commit/2638f842c20735bd2ae53148e4390768f795ae8d) — the merge of PR [#78](https://github.com/MESW-LES-2627/les-project-group-2/pull/78) (migration guards and clean-database validation) on 20 November 2026. It includes the Playwright acceptance suite (PR #75), the US-3.5 merge (PR #81), the US-1.6 merge (PR #80), and the earlier US-2.3, US-2.4 and US-3.3 merges.
- **Tag:** [`iter-2`](https://github.com/MESW-LES-2627/les-project-group-2/tree/iter-2), to be created from the verified snapshot above at delivery time.
- **Compare with the last tag:** [`iter-1...iter-2`](https://github.com/MESW-LES-2627/les-project-group-2/compare/iter-1...iter-2).
- **Production:** promoted from `main` as part of the iteration release. At the time of writing, `main` still holds the Iteration 1 release ([`0a0cdee5`](https://github.com/MESW-LES-2627/les-project-group-2/commit/0a0cdee536cc58f0f6b6460f8d5c4c8a64d8261a)); Iteration 2 is verified on staging first.

## Environments

- **Production:** [https://planit2.vercel.app](https://planit2.vercel.app)
- **Staging:** [https://planit2-staging.vercel.app](https://planit2-staging.vercel.app)
- **Verified deployment status:** the snapshot above passed both pipelines:
  - [Checks run 44736383635](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44736383635) — migration guard, clean database rebuild, lint, the full Vitest + Playwright suite and the production build
  - [Deploy run 44736383459](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44736383459) — verify-migrations, build, database migrations and Vercel deployment
- **Pipelines:** [GitHub Actions](https://github.com/MESW-LES-2627/les-project-group-2/actions)
  - [`checks.yaml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/checks.yaml) runs `Migration Guard`, `Database`, `Lint and Format`, `npm test` (Vitest plus Playwright) and `Build` on pushes and pull requests to `main` and `staging`.
  - [`deploy.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/deploy.yml) verifies migrations against a clean database, builds the application, runs `supabase db push --dry-run` and then applies migrations to the staging or production database before deploying to Vercel.
- **Environment isolation:** staging uses a dedicated Supabase project, so migrations and test data from the staging pipeline never touch production records.

## Product

- **Vision:** [Product Vision (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#product-vision) / [Project Vision (README)](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#project-vision)
- **MVP:** [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2)
  - Outlined in [Wiki Features and Assumptions](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#features-and-assumptions) and [Epics & User Stories](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories).
- **Iteration focus:** turning group consensus into committed decisions. The increment closes the loop from candidate dates and member availability to official trip dates, and from proposed pins and votes to confirmed spots in the itinerary. It also completes the member-role model needed to hand the organizer role over safely, and replaces the component-level acceptance tests with a browser-level Playwright suite that covers every merged story.
