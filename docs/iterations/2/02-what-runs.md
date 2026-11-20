# What Runs on This Tag

Iteration 2 builds on the collaborative workspace delivered in Iteration 1 and
closes the two decision loops of the product:

- **Dates:** candidate windows and member availability now produce ranked
  suggestions, an official locked range, and one itinerary day per day.
- **Places:** proposed pins and votes now produce confirmed spots that belong to
  the official itinerary, and members can correct or withdraw their own pins.
- **People:** the organizer role can be transferred safely, with the old
  organizer demoted to member in the same database transaction.
- **Quality:** every merged story is exercised through a browser-level Playwright
  suite, in addition to the Vitest unit and component tests.

Only stories merged into the verified staging snapshot are listed here. Work
that is still in review is tracked separately in
[Stories in this increment](03-stories.md#work-in-review).

---

## 1. Lock Official Trip Dates (US-2.3)

Organizers can now turn a group decision into official trip dates.

- **Locking:** the organizer picks a start and end date and confirms the choice.
  Every day of the range must be covered by at least one candidate window; a
  range may span adjacent windows. Locking updates the trip state to
  `Dates locked` and creates one row in `trip_itinerary_days` per day.
- **Atomic database operation:** `lock_trip_dates` and `unlock_trip_dates` are
  `security definer` functions that validate the organizer role, the range and
  the lock state before changing anything.
- **Read-only while locked:** row-level security blocks members from changing
  availability and blocks the organizer from adding, editing or deleting
  candidate windows. The availability calendar and date-window controls become
  read-only in the interface.
- **Visibility:** every member sees the locked range and the number of itinerary
  days created; only the organizer sees the lock and unlock controls.
- **Unlocking:** unlocking requires confirmation, removes the generated
  itinerary days, restores the `Planning` state, and allows members to edit
  availability again.
- **Carry-over completion:** this story also completes the lock-aware guard of
  US-2.1 and the read-only part of US-2.5.

**Database:** [`20261109100000_lock_trip_dates.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/migrations/20261109100000_lock_trip_dates.sql)

---

## 2. Automatic Best-Date Suggestion (US-2.4)

The organizer no longer has to compare availability by hand.

- **Ranking:** for a chosen trip length, every range of consecutive candidate
  days is scored by how many members are available on **every** day of the
  range. Ranges are sorted by number of available members (descending), with
  ties going to the earliest start date.
- **Suggestion panel:** shown only to the organizer, only while the dates are
  not locked, and only when at least one candidate window exists.
- **Transparency:** each suggestion shows how many members can attend and which
  members cannot. Members who have not answered count as unable to attend.
- **One-click pre-fill:** "Use these dates" fills the lock dates form, so the
  organizer can review the range and confirm it through the existing US-2.3
  flow.
- **Defaults and empty states:** the trip length defaults to the length of the
  shortest candidate window; without availability answers, the panel explains
  that suggestions appear once members submit availability.
- **No schema change:** suggestions are computed on the client from data the
  trip workspace already loads.

**Implementation:** [`utils/best-dates.ts`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/utils/best-dates.ts) · [`app/trips/[id]/best-date-suggestions.tsx`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/app/trips/%5Bid%5D/best-date-suggestions.tsx)

---

## 3. Commit Winning Pin to Itinerary (US-3.3)

The group's preferred places can now become official itinerary spots.

- **Confirming:** the organizer confirms a proposed pin from the pin voting
  card. The pin changes style on the map (gold halo and star badge) and appears
  in the **Confirmed Spots** list.
- **Voting closes:** confirmed pins reject new votes in the service layer and in
  the `vote-pin` server action, so the result cannot drift after confirmation.
- **Reverting:** the organizer can revert a confirmed pin. It returns to the
  proposed style and voting reopens.
- **Authorization:** `confirmPinAction` and `revertPinAction` verify that the
  caller is authenticated and is the trip organizer before updating the pin.
- **Persistence:** pins and votes are loaded from Supabase on the dashboard and
  trip map, and pin creation, voting, confirmation and revert are persisted
  through server actions. An organizer-only update policy on `pins` backs the
  application checks.
- **Resilience:** a zero-row update is treated as an error, and persistence
  failures are surfaced in the map interface instead of silently ignored.

**Database:** [`20261107000000_add_pin_confirmation.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/migrations/20261107000000_add_pin_confirmation.sql) and [`20261119120000_allow_trip_organizers_to_update_pins.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/migrations/20261119120000_allow_trip_organizers_to_update_pins.sql)

---

## 4. Edit/Delete Own Pin Proposal (US-3.5)

Members can now correct or withdraw the places they proposed.

- **Editing:** the proposer can change a proposed pin's name, description,
  category and coordinates from the pin card. Organizers can edit any proposed
  pin, while a confirmed pin can only be edited by an organizer.
- **Deleting:** the proposer or the organizer can delete a proposed pin. Deleting
  a pin also removes its votes, so no orphan votes remain.
- **Confirmed pins are protected:** once a pin is confirmed, only the organizer
  can edit or delete it; the member-facing card hides both actions.
- **Persistence:** edits and deletions go through `updatePinAction` and
  `deletePinAction`, which re-check the caller, the trip and the pin before
  touching the database. Failures are surfaced in the map UI and the local state
  is rolled back.
- **Database policy:** creators may update and delete their own proposed pins
  under RLS, while organizers keep the broader permissions required by US-3.3.

**Database:** [`20261119130000_allow_creators_to_manage_own_pins.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/migrations/20261119130000_allow_creators_to_manage_own_pins.sql)

**Implementation:** [`services/pin-management.ts`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/services/pin-management.ts) · [`app/trips/actions/manage-pins.ts`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/app/trips/actions/manage-pins.ts) · [`components/map/EditPinModal.tsx`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/components/map/EditPinModal.tsx)

---

## 5. Member Roles and Organizer Transfer (US-1.6)

The trip owner can now hand the organizer role to another member.

- **Transfer:** the current organizer selects a member and confirms the
  transfer. The target member becomes the organizer and the current organizer
  becomes a regular member.
- **Atomic database operation:** `promote_to_organizer` is a `security definer`
  function that verifies the caller is the current organizer, verifies the target
  is a member, demotes the old organizer, promotes the new one and updates
  `trips.organizer_id` in one transaction.
- **Guarded server action:** `promoteToOrganizer` repeats the authorization
  checks in the application layer and exposes a clear error if the caller is not
  the organizer or the target is not a member.
- **Clear UI:** the organizer badge shows the current organizer's name to
  members (and `You` to the organizer), the transfer action asks for
  confirmation, and failures are shown instead of being swallowed.
- **Leaving the trip:** a member can leave; the organizer must transfer the role
  or delete the trip first, so a trip cannot be left without an organizer.

**Database:** [`20261120000000_promote_trip_organizer.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/migrations/20261120000000_promote_trip_organizer.sql)

**Implementation:** [`app/trips/actions/manage-trip-members.ts`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/app/trips/actions/manage-trip-members.ts) · [`app/trips/[id]/promote-member-button.tsx`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/app/trips/%5Bid%5D/promote-member-button.tsx)

---

## 6. Browser-Level Acceptance Suite

PR [#75](https://github.com/MESW-LES-2627/les-project-group-2/pull/75) replaced
the component-only acceptance tests with a Playwright suite that drives the real
Next.js application.

- **Coverage:** 51 Playwright tests across 16 spec files, covering every merged
  user story: US-1.1, US-1.2, US-1.3, US-1.4, US-1.5, US-1.6, US-1.7, US-2.1,
  US-2.2, US-2.3, US-2.4, US-3.1, US-3.2, US-3.3, US-3.5 and US-3.7.
- **Deterministic data:** `utils/supabase/test-session.ts` builds an in-memory
  Supabase client from a test-session cookie, so the browser tests do not need a
  seeded database. The cookie path is gated to non-production environments.
- **One command:** `npm test` runs Vitest and then Playwright; CI installs the
  Chromium browser before the suite.
- **Maintained separately:** the Vitest acceptance tests under `tests/` remain
  for component-level checks, while `acceptanceTests/*.spec.ts` is the
  browser-level suite.
