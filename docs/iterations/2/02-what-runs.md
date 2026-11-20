# What Runs on This Tag

Iteration 2 closes the decision loops started in Iteration 1:

- **Dates:** candidate windows and availability now rank the best ranges, lock official dates, and create one itinerary day per day.
- **Places:** proposed pins and votes become confirmed spots, and authors can edit or withdraw their proposals.
- **People:** the organizer role can be transferred atomically.
- **Quality:** every merged story runs in a browser-level Playwright suite, and CI now guards migrations and the production build.

Only stories merged into the verified staging snapshot are listed. Undelivered work is tracked in [Stories in this increment](03-stories.md#ready-but-not-delivered).

## 1. Lock Official Trip Dates (US-2.3)

- The organizer confirms a start/end range covered by candidate windows; the trip becomes `Dates locked` and creates one itinerary day per date.
- Lock and unlock are atomic database functions. Unlock requires confirmation, deletes the generated days and restores `Planning`.
- While locked, availability and candidate windows are read-only through RLS and the UI. This also completes the lock guard of US-2.1 and the read-only part of US-2.5.

## 2. Automatic Best-Date Suggestion (US-2.4)

- For a chosen trip length, consecutive ranges are ranked by members available on every day, with ties going to the earliest range.
- The organizer-only panel shows who can and cannot attend; unanswered members count as unavailable.
- "Use these dates" pre-fills the lock form. Suggestions need no schema change.

## 3. Commit Winning Pin to Itinerary (US-3.3)

- The organizer confirms a proposed pin; it gets a gold halo and star, moves to Confirmed Spots, and stops accepting votes.
- The organizer can revert a confirmed pin, which restores its proposed style and reopens voting.
- Pins and votes persist in Supabase, backed by an organizer-only update policy. Zero-row updates and persistence failures surface as errors.

## 4. Edit/Delete Own Pin Proposal (US-3.5)

- Authors can edit a proposed pin's name, description, category and coordinates, or delete it; deleting also removes its votes.
- Organizers can edit any proposed pin, but confirmed pins are organizer-only.
- RLS lets creators manage their own proposed pins. Failed actions are surfaced and local state is rolled back.

## 5. Member Roles and Organizer Transfer (US-1.6)

- The organizer selects a member and confirms; the target becomes organizer and the old organizer becomes a member.
- `promote_to_organizer` performs the transfer atomically, and the server action repeats the authorization checks.
- The header shows the organizer, errors are visible, and members can leave only after the organizer transfers the role or deletes the trip.

## 6. Browser-Level Acceptance Suite

- PR #75 replaced component-only tests with 51 Playwright tests in 16 spec files covering every merged story.
- Tests use a deterministic in-memory Supabase client, with the test-session cookie gated to non-production.
- `npm test` runs Vitest then Playwright; CI installs Chromium.

## 7. Migration Safety and CI Gates

- PR #78 adds `Migration Guard` (no edited, duplicated or out-of-order migrations), `Database` (clean rebuild plus pgTAP) and `Build` (`npm run build`) jobs.
- Deploy verifies a clean database, builds, dry-runs `db push`, then applies migrations without interruption.
- The rules live in `CONTRIBUTING.md` and `scripts/check-migrations.sh`.
