# What Runs on This Tag

Iteration 2 builds on the collaborative workspace delivered in Iteration 1 and
closes the two decision loops of the product:

- **Dates:** candidate windows and member availability now produce ranked
  suggestions, an official locked range, and one itinerary day per day.
- **Places:** proposed pins and votes now produce confirmed spots that belong to
  the official itinerary.

Only stories merged into the verified staging snapshot are listed here. Work
that was still in review is tracked separately in
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
