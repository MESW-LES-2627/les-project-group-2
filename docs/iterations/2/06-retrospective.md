# Retrospective

## What went well

- **The decision loops closed.** Candidate dates and availability now produce ranked suggestions, locked official dates and itinerary days; proposed pins become confirmed spots and authors can edit or withdraw them.
- **State changes are enforced in the database.** Locking, pin confirmation/editing and organizer transfer have database-level guards in addition to server-action checks.
- **Tests and delivery improved.** 563 tests pass (512 Vitest + 51 Playwright), coverage is 90.49%, lint and build are clean, and the staging Checks and Deploy pipelines passed on the final snapshot.
- **Review caught high-risk issues before merge:** a test-session cookie that worked in production, and a build failure CI did not catch.

## What could be done better

- **Merge order:** PR #74 reached a feature branch after it had already been merged to staging, so US-3.5 looked merged but was missing; PR #81 fixed it.
- **CI gaps:** the production build was not gated until PR #78, and some acceptance specs were unadapted.
- **Ready is not progress:** US-3.4 and US-3.6 were assigned but never implemented or opened as PRs; they carry into Iteration 3.

## Proposed Improvements

1. Freeze story merges two days before the tag, and reassign US-3.4/US-3.6 with a mid-iteration PR check.
2. Do user stories with more time.
