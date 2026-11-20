# Stories in This Increment

Tracked in [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2).

Iteration 2 delivered the five stories that turn group input into committed
trip decisions and let the group manage who owns those decisions: locking the
official dates, ranking the best date ranges, confirming winning pins, editing
or withdrawing proposed pins, and transferring the organizer role. It also
replaced the component-level acceptance tests with a browser-level Playwright
suite that covers every merged story.

## Merged Stories

| Story / Task | Issue | Pull Request | Status | What was delivered |
| :--- | :--- | :--- | :--- | :--- |
| **US-1.6: Member Roles and Permissions** | [#15](https://github.com/MESW-LES-2627/les-project-group-2/issues/15) | [PR #80](https://github.com/MESW-LES-2627/les-project-group-2/pull/80) | **Merged** | Organizer transfer through the `promote_to_organizer` security-definer RPC (demote old organizer, promote the target, update `trips.organizer_id` atomically), guarded server action, confirmation prompt, visible errors, organizer name in the trip header, member/leave rules, migration, unit and acceptance tests. |
| **US-2.3: Lock Official Trip Dates** | [#20](https://github.com/MESW-LES-2627/les-project-group-2/issues/20) | [PR #72](https://github.com/MESW-LES-2627/les-project-group-2/pull/72) | **Merged** | Atomic organizer-only lock/unlock RPCs, itinerary days, `Dates locked` state, read-only availability and candidate windows while locked, trip dates UI, acceptance and unit tests. Also completes the lock guard of US-2.1 and the read-only part of US-2.5. |
| **US-2.4: Automatic Best-Date Suggestion** | [#21](https://github.com/MESW-LES-2627/les-project-group-2/issues/21) | [PR #76](https://github.com/MESW-LES-2627/les-project-group-2/pull/76) | **Merged** | Availability-aware ranking helpers, organizer-only suggestion panel with who cannot attend, configurable trip length, and one-click pre-fill of the lock dates form. No database changes. |
| **US-3.3: Commit Winning Pin to Itinerary** | [#26](https://github.com/MESW-LES-2627/les-project-group-2/issues/26) | [PR #73](https://github.com/MESW-LES-2627/les-project-group-2/pull/73) | **Merged** | Organizer confirm/revert actions, closed voting on confirmed pins, confirmed spots list, distinct map styling, Supabase pin/vote persistence, organizer-only update policy, acceptance and unit tests. |
| **US-3.5: Edit/Delete Own Pin Proposal** | [#28](https://github.com/MESW-LES-2627/les-project-group-2/issues/28) | [PR #81](https://github.com/MESW-LES-2627/les-project-group-2/pull/81) | **Merged** | Members can edit or delete their own proposed pins; deleting a pin removes its votes; confirmed pins can only be changed by the organizer. Creator RLS policy, server actions with rollback on failure, edit modal, map UI, acceptance and unit tests. Re-targets the work from PR #74, which was merged into `feature/US-3.3` after #73 had already merged that branch to `staging`; #81 is the merge that actually reached `staging`. |

## Quality Work

| Work | Pull Request | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Browser-level Playwright acceptance suite** | [PR #75](https://github.com/MESW-LES-2627/les-project-group-2/pull/75) | **Merged** | Adds 51 browser tests in 16 spec files covering every merged story, adapts the three previously unadapted map/search specs, extends the test-session mock to pins and votes, gates the test-session cookie out of production, fixes the production build, and makes `npm test` run Vitest plus Playwright. |
| **Migration guards and clean-database validation** | [PR #78](https://github.com/MESW-LES-2627/les-project-group-2/pull/78) | **Merged** | Adds a `Migration Guard` job (immutable, ordered, uniquely versioned migrations), a `Database` job (clean rebuild plus pgTAP), a `Build` job, and verify-migrations/dry-run steps in deploy. All five checks are green on the merge commit. |

## Work in Review

No Iteration 2 story or close-out item remains open at the time of writing. The
only follow-up is a repository setting: enable `Migration Guard`, `Database` and
`Build` as required checks on `staging` and `main` so the new gates block merges
as intended.
