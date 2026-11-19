# Retrospective

## What went well

- **The date decision loop is complete.** Candidate windows (US-2.1) and
  availability (US-2.2) from Iteration 1 now feed ranked suggestions (US-2.4),
  an official locked range (US-2.3) and one itinerary day per day. Members no
  longer need to reconcile availability outside the application.
- **Decisions are enforced, not just displayed.** Locking is an atomic
  `security definer` database function, and row-level security freezes
  availability and candidate windows while the dates are locked. Pin
  confirmation and reverting are guarded by organizer checks in the server
  actions, with an organizer-only update policy on `pins` as a second layer.
- **Confirmed pins are reversible.** Treating confirmation as explicit state
  with a revert action avoided a one-way decision and kept voting reopenable
  when the group changes its mind.
- **Regression safety grew with the increment.** The suite now has 428 passing
  tests in 57 files with 93.96% line coverage, including one acceptance suite
  per new story and unit coverage for the ranking, locking, confirmation and
  persistence paths.
- **Delivery stayed automated.** The staging pipeline built the application,
  applied migrations and deployed every merge in this increment; the final
  snapshot passed both Checks and Deploy.

## What could be done better

- **Migration ordering needs a guard.** `20261107000000_add_pin_confirmation.sql`
  was merged after `20261109100000_lock_trip_dates.sql`, so the deploy had to
  rely on `supabase db push --include-all` to apply it out of order. A migration
  guard would reject this at review time instead of depending on an escape
  hatch; PR #78 proposes exactly that.
- **Already-applied migrations must not be edited.** At least one open branch
  changes a migration that is already on staging. Schema changes should always
  arrive as a new migration, even when the original is only a few days old.
- **Manual database verification was postponed.** The PR test plans for US-2.3
  and US-2.4 left the local Supabase manual check unchecked. The automated
  tests mock the RPC boundary, so one end-to-end pass against the Docker stack
  should be part of the release checklist.
- **Late merges compressed review time.** US-2.3 merged on 18 November and
  US-2.4 and US-3.3 on 19 November, leaving little time to review the three
  stories together as one increment before the tag.
- **Some map paths still have the lowest coverage.** `TripMapContainer` and
  `LeafletMap` remain the weakest files in the report, especially around marker
  interactions and persistence error paths. They deserve focused tests next
  iteration.

## Proposed Improvements

1. Merge the migration guard (PR #78) and enable the required checks on
   `staging` and `main` before starting Iteration 3.
2. Add a release checklist item for a manual pass on the local Supabase stack,
   covering lock/unlock and pin confirmation against real RLS policies.
3. Keep user stories in review for at most one iteration; either merge them
   before the tag or move them explicitly to the next increment.
4. Schedule the last story merge at least two days before the iteration tag so
   the increment can be reviewed as a whole.
