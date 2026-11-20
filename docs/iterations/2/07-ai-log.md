# AI Log

## Toolchain

The team continued to use **Gemini 3.8 Flash with the Antigravity CLI**, the
same toolchain reported in Iterations 0 and 1. Generated changes were reviewed
by the team, merged through pull requests, and validated by lint, the Vitest
suite, the acceptance suites, the database tests and the staging pipeline.

For the Iteration 2 close-out, the team also used **OpenCode with DeepSeek V4.1
Flash (T3 Code)** to review the open pull requests, resolve the staging merge
conflicts, fix the build and test-session issues, and add the remaining
Playwright acceptance specs. Those changes were still reviewed through the same
pull-request and CI gates.

## Where AI Assistance Was Used

| Area | Intervention | Verification |
| :--- | :--- | :--- |
| **US-2.3 — Trip date lock** | Drafted the lock/unlock SQL functions, the itinerary-day table and RLS guards, the server actions and the trip dates UI. | Acceptance suite `US-2.3`, unit and component tests, staging migration deploy |
| **US-2.4 — Best-date suggestions** | Drafted the ranking helpers, the organizer suggestion panel and the pre-fill interaction with the lock form. | Acceptance suite `US-2.4`, `best-dates-utils` and component tests |
| **US-3.3 — Confirmed pins** | Drafted the confirmation/revert actions, closed-voting guards, confirmed spots list, map styling and pin persistence helpers. | Acceptance suite `US-3.3`, action, service, mapper and map persistence tests |
| **US-3.5 — Edit/delete own pins** | Drafted the creator/organizer permission checks, update/delete actions, edit modal and map wiring; later re-targeted the orphaned merge from PR #74 to `staging` in PR #81. | Acceptance suite `US-3.5`, `pin-management`, `manage-pins-action`, `edit-pin-modal` and map persistence tests |
| **US-1.6 — Organizer transfer** | Drafted the `promote_to_organizer` RPC, server action and transfer button. Review fixed the organizer lookup (an assignment used as a condition plus an untyped parameter that broke `next build`), added the confirmation dialog and visible error state, corrected the “organizator” typo, and added regression tests. | Acceptance suite `US-1.6`, `promote-member-button`, `trip-members-actions` and `trip-workspace-page` tests; production build |
| **Playwright acceptance suite** | Reviewed PR #75, gated the test-session cookie out of production, fixed the build on unadapted specs, added browser specs for US-1.2, US-1.6, US-2.4, US-3.3 and US-3.5, adapted US-3.1/3.2/3.7, and extended the test-session mock to pins and votes. | 51 Playwright tests passing; 512 Vitest tests; lint and build passing |
| **Migration guards** | Reviewed PR #78, merged `staging` into it, resolved the `checks.yaml` conflict with the Playwright/artifact steps, removed the standalone docs page from the PR and verified all five checks; the PR was then merged as `2638f842`. | `Migration Guard`, `Database`, `Build`, `Lint and Format` and `Test` all green on `32013050`; merged as `2638f842` |
| **CI/CD review** | Helped analyse the deploy workflow and identify that out-of-order migrations were only masked by `--include-all`. | PR #78 delivered the migration guard, clean-database rebuild and build job |
| **Documentation** | Helped structure and draft this iteration claim, then updated it with the close-out merges, test counts and known gaps. | Reviewed against the repository, pull requests and pipeline runs |

## Discrepancies Caught in Review

- **Orphaned merge:** PR #74 (US-3.5) was merged into `feature/US-3.3` after
  #73 had already merged that branch to `staging`, so GitHub showed the story as
  merged while staging did not contain it. PR #81 re-targeted the same commit to
  `staging` and corrected the history.
- **Test-session authentication bypass:** the acceptance-test client initially
  honoured the `planit-test-session` cookie in every environment, including
  production. Review added a `NODE_ENV !== 'production'` guard so the bypass is
  only reachable from `next dev`.
- **Build not covered by CI:** PR #80 passed lint and tests while `next build`
  failed on an implicit-`any`/assignment bug, and PR #75 initially failed the
  build on unadapted specs and an invalid Playwright locator. Both were fixed,
  and PR #78 added a `Build` job so this cannot happen silently again.
- **Out-of-order migration:** `20261107000000_add_pin_confirmation.sql` reached
  `staging` after `20261109100000_lock_trip_dates.sql`. The deploy succeeded only
  because `db push` ran with `--include-all`; the merged guard in PR #78 now
  rejects this before merge.
- **Edited applied migration:** an open branch modified a migration that is
  already applied on staging. The review outcome was to add a new migration
  instead; the merged guard now enforces it.
- **Stale checks and scope drift:** PR #78 sat behind `staging`, needed a merge
  conflict resolved against the new Playwright test step, and carried a
  standalone docs page that was moved out of the PR. The branch was updated, the
  checks re-ran on the new head, and it was merged as `2638f842`.
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
