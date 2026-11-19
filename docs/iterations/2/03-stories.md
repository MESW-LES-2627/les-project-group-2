# Stories in This Increment

Tracked in [Milestone 2: Minimum Viable Product (MVP)](https://github.com/MESW-LES-2627/les-project-group-2/milestone/2).

Iteration 2 delivered the three stories that turn group input into committed
trip decisions: locking the official dates, ranking the best date ranges, and
confirming winning pins.

## Merged Stories

| Story / Task | Issue | Pull Request | Status | What was delivered |
| :--- | :--- | :--- | :--- | :--- |
| **US-2.3: Lock Official Trip Dates** | [#20](https://github.com/MESW-LES-2627/les-project-group-2/issues/20) | [PR #72](https://github.com/MESW-LES-2627/les-project-group-2/pull/72) | **Merged** | Atomic organizer-only lock/unlock RPCs, itinerary days, `Dates locked` state, read-only availability and candidate windows while locked, trip dates UI, acceptance and unit tests. Also completes the lock guard of US-2.1 and the read-only part of US-2.5. |
| **US-2.4: Automatic Best-Date Suggestion** | [#21](https://github.com/MESW-LES-2627/les-project-group-2/issues/21) | [PR #76](https://github.com/MESW-LES-2627/les-project-group-2/pull/76) | **Merged** | Availability-aware ranking helpers, organizer-only suggestion panel with who cannot attend, configurable trip length, and one-click pre-fill of the lock dates form. No database changes. |
| **US-3.3: Commit Winning Pin to Itinerary** | [#26](https://github.com/MESW-LES-2627/les-project-group-2/issues/26) | [PR #73](https://github.com/MESW-LES-2627/les-project-group-2/pull/73) | **Merged** | Organizer confirm/revert actions, closed voting on confirmed pins, confirmed spots list, distinct map styling, Supabase pin/vote persistence, organizer-only update policy, acceptance and unit tests. |

## Work in Review

These items were open when this claim was drafted. They are **not** part of the
verified staging snapshot and should be either merged into the snapshot or moved
to the next iteration before the `iter-2` tag is created.

| Story / Task | Issue | Pull Request | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **US-3.5: Edit/Delete Own Pin Proposal** | [#28](https://github.com/MESW-LES-2627/les-project-group-2/issues/28) | [PR #74](https://github.com/MESW-LES-2627/les-project-group-2/pull/74) | **In review** | Members can edit or delete their own pins; confirmed pins can only be changed by the organizer. The PR is stacked on the US-3.3 feature branch and has not reached `staging` yet. |
| **Infrastructure: Migration Guards & Clean Database Validation** | — | [PR #78](https://github.com/MESW-LES-2627/les-project-group-2/pull/78) | **In review** | Rejects edited, deleted, renamed, duplicated or out-of-order migrations on pull requests; rebuilds the schema from all migrations and runs the pgTAP suite in CI; adds a build job and verifies migrations before deploy. |
