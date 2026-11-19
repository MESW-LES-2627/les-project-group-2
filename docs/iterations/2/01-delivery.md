# Delivery, Environments and Product

This document groups the three context sections of the claim: what is being
delivered, where it runs, and which product milestone it belongs to.

## Delivery

- **Verified staging snapshot:** [`e4a09f14`](https://github.com/MESW-LES-2627/les-project-group-2/commit/e4a09f147698eb099612efc43b6ce907e55d8a22) — the merge of PR [#73](https://github.com/MESW-LES-2627/les-project-group-2/pull/73) (US-3.3), on 19 November 2026.
- **Tag:** [`iter-2`](https://github.com/MESW-LES-2627/les-project-group-2/tree/iter-2), to be created from the verified snapshot above at delivery time.
- **Compare with the last tag:** [`iter-1...iter-2`](https://github.com/MESW-LES-2627/les-project-group-2/compare/iter-1...iter-2).
- **Production:** promoted from `main` as part of the iteration release. At the time of writing, `main` still holds the Iteration 1 release ([`0a0cdee5`](https://github.com/MESW-LES-2627/les-project-group-2/commit/0a0cdee536cc58f0f6b6460f8d5c4c8a64d8261a)); Iteration 2 is verified on staging first.

## Environments

- **Production:** [https://planit2.vercel.app](https://planit2.vercel.app)
- **Staging:** [https://planit2-staging.vercel.app](https://planit2-staging.vercel.app)
- **Verified deployment status:** the snapshot above passed both pipelines:
  - [Checks run 44637057318](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44637057318) — lint and tests
  - [Deploy run 44637057541](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44637057541) — build, database migrations and Vercel deployment
- **Pipelines:** [GitHub Actions](https://github.com/MESW-LES-2627/les-project-group-2/actions)
  - [`checks.yaml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/checks.yaml) runs lint and the full test suite on pushes and pull requests to `main` and `staging`.
  - [`deploy.yml`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/.github/workflows/deploy.yml) builds the application, runs `supabase db push --yes --include-all` against the staging or production database, and deploys to Vercel.
- **Environment isolation:** staging uses a dedicated Supabase project, so migrations and test data from the staging pipeline never touch production records.

## Product

- **Vision:** [Product Vision (Wiki)](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#product-vision) / [Project Vision (README)](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#project-vision)
- **MVP:** [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2)
  - Outlined in [Wiki Features and Assumptions](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Business-Model#features-and-assumptions) and [Epics & User Stories](https://github.com/MESW-LES-2627/les-project-group-2/wiki/Epics-and-User-Stories).
- **Iteration focus:** turning group consensus into committed decisions. The increment closes the loop from candidate dates and member availability to official trip dates, and from proposed pins and votes to confirmed spots in the itinerary.
