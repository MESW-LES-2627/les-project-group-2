# AI Log

## Toolchain

The team continued to use **Gemini 3.8 Flash with the Antigravity CLI**, the
same toolchain reported in Iterations 0 and 1. Generated changes were reviewed
by the team, merged through pull requests, and validated by lint, the Vitest
suite, the acceptance suites, the database tests and the staging pipeline.

## Where AI Assistance Was Used

| Area | Intervention | Verification |
| :--- | :--- | :--- |
| **US-2.3 — Trip date lock** | Drafted the lock/unlock SQL functions, the itinerary-day table and RLS guards, the server actions and the trip dates UI. | Acceptance suite `US-2.3-lock-trip-dates`, unit and component tests, staging migration deploy |
| **US-2.4 — Best-date suggestions** | Drafted the ranking helpers, the organizer suggestion panel and the pre-fill interaction with the lock form. | Acceptance suite `US-2.4-best-date-suggestion`, `best-dates-utils` and component tests |
| **US-3.3 — Confirmed pins** | Drafted the confirmation/revert actions, closed-voting guards, confirmed spots list, map styling and pin persistence helpers. | Acceptance suite `US-3.3-commit-winning-pin`, action, service, mapper and map persistence tests |
| **CI/CD review** | Helped analyse the deploy workflow and identify that out-of-order migrations were only masked by `--include-all`. | PR #78 proposes a migration guard and a clean-database rebuild job |
| **Documentation** | Helped structure and draft this iteration claim. | Reviewed against the repository, pull requests and pipeline runs |

## Discrepancies Caught in Review

- **Out-of-order migration:** `20261107000000_add_pin_confirmation.sql` reached
  `staging` after `20261109100000_lock_trip_dates.sql`. The deploy succeeded only
  because `db push` runs with `--include-all`; the guard in PR #78 would reject
  this before merge.
- **Edited applied migration:** an open branch modifies a migration that is
  already applied on staging. The review outcome was to add a new migration
  instead and to make the guard enforce it.
- **Mocked database boundary:** the generated acceptance tests replace the
  Supabase client with a stand-in. Review flagged that this proves the
  application flow but not the real RLS policies, so a manual local Supabase
  pass remains on the release checklist.
- **Zero-row updates:** pin confirmation/revert originally could succeed
  silently when no row matched. The actions now treat an empty update result as
  an error and surface it in the UI.

## Final Board

The final board snapshot will be added here before the `iter-2` tag is created,
following the same layout as the previous claims. The live board is the
[GitHub Project board of the organisation](https://github.com/orgs/MESW-LES-2627/projects).
