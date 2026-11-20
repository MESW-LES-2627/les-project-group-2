# How to Run the Tests

Documented in [README and Local Development Setup](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#local-development-setup)
and in [CONTRIBUTING.md](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/CONTRIBUTING.md).

## Commands

```bash
# Run all tests: Vitest (unit + component + acceptance) and Playwright (browser)
npm test

# Run only the Vitest suite
npm run test:unit

# Run only the Playwright browser suite
npm run test:acceptance

# Install the Playwright Chromium browser once per machine
npx playwright install chromium

# Run linting
npm run lint

# Run the production build
npm run build

# With Docker running: start local Supabase and apply pending migrations
npm run db:start
npx supabase migration up --local

# Run the committed PostgreSQL tests (pgTAP)
npx supabase test db
```

## Current Results

Verified on the staging snapshot [`2638f842`](https://github.com/MESW-LES-2627/les-project-group-2/commit/2638f842c20735bd2ae53148e4390768f795ae8d):

| Check | Result |
| :--- | :--- |
| **Vitest files** | 68 passed |
| **Vitest tests** | 512 passed |
| **Playwright files** | 16 passed |
| **Playwright tests** | 51 passed |
| **Total application tests** | 563 passed across 84 files |
| **Line coverage** | 90.49% |
| **Statement coverage** | 89.38% |
| **Branch coverage** | 83.47% |
| **Function coverage** | 86.77% |
| **Lint** | 0 errors, 0 warnings |
| **Migration Guard** | Pass |
| **Database** | Pass (clean rebuild + pgTAP) |
| **Build** | Pass (`npm run build`) |
| **Staging Checks** | Green ([run 44736383635](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44736383635)) |
| **Staging deploy** | Green ([run 44736383459](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44736383459)) |

The Definition of Done requires more than 90% line coverage; the snapshot meets
that gate at 90.49%. The margin is thin because this increment added substantial
map and role-management UI, so the next increment should keep map interaction
and persistence-error paths in the coverage target.

## Tests Added in This Increment

### Playwright browser acceptance tests

The browser suite lives in `acceptanceTests/` and drives the real application
through Chromium. It runs on every PR and on every push to `staging`/`main`.

| Story | File | What it proves |
| :--- | :--- | :--- |
| **US-1.1** | `US-1.1-User-Registration-and-Authentication-Acceptance-test.spec.ts` | Signup, login, wrong credentials and logout redirects. |
| **US-1.2** | `US-1.2-Trip-Creation-Acceptance-test.spec.ts` | Creating a trip from the form and opening its workspace. |
| **US-1.3** | `US-1.3-Group-Onboarding-via-Link-Code-Acceptance-test.spec.ts` | Invite link/code, joining, invalid codes and regeneration. |
| **US-1.4** | `US-1.4-Manage-Trip-Members-Acceptance-test.spec.ts` | Member list and roles, removing a member, leaving, organizer-only rules. |
| **US-1.5** | `US-1.5-My-Trips-Dashboard-Acceptance-test.spec.ts` | Dashboard list, dates/status display and empty state. |
| **US-1.6** | `US-1.6-Member-Roles-Acceptance-test.spec.ts` | Organizer transfer, confirmation/cancel, member permissions and organizer label. |
| **US-1.7** | `US-1.7-Edit-Profile-Acceptance-test.spec.ts` | Display name update, avatar upload and empty-name validation. |
| **US-2.1** | `US-2.1-Propose-Candidate-Date-Windows-Acceptance-test.spec.ts` | Adding, editing and deleting candidate windows with validation. |
| **US-2.2** | `US-2.2-Submit-Availability-View-Overlaps-Acceptance-test.spec.ts` | Saving availability and showing overlaps/missing members. |
| **US-2.3** | `US-2.3-Lock-Official-Trip-Dates-Acceptance-test.spec.ts` | Locking/unlocking dates, read-only state and itinerary days. |
| **US-2.4** | `US-2.4-Best-Date-Suggestion-Acceptance-test.spec.ts` | Ranked suggestions, non-attending members and pre-filling the lock form. |
| **US-3.1** | `US-3.1-Interactive-Map-Acceptance-test.spec.ts` | Map load, dropping a pin and opening its details. |
| **US-3.2** | `US-3.2-Pin-Voting-Acceptance-test.spec.ts` | Voting, removing a vote, counts/voters and date-scoped pins. |
| **US-3.3** | `US-3.3-Commit-Winning-Pin-Acceptance-test.spec.ts` | Confirming/reverting a pin, closed voting and the confirmed-spots list. |
| **US-3.5** | `US-3.5-Edit-Delete-Pin-Acceptance-test.spec.ts` | Editing and deleting own pins; confirmed-pin organizer-only rules. |
| **US-3.7** | `US-3.7-Search-Place-Acceptance-test.spec.ts` | Place search results and creating a pin from a search result. |

The deterministic data comes from `utils/supabase/test-session.ts`, which builds
an in-memory Supabase client from a test-session cookie. The cookie path is
gated to non-production environments.

### Vitest acceptance and unit tests

The Vitest acceptance tests remain under `tests/*.acceptance.test.tsx` for
component-level flows, alongside the unit and component tests.

| Area | Files |
| :--- | :--- |
| **Trip date lock** | `tests/trip-lock-utils.test.ts`, `tests/lock-dates-actions.test.ts`, `tests/lock-dates-component.test.tsx` |
| **Best-date suggestions** | `tests/best-dates-utils.test.ts`, `tests/best-date-suggestions-component.test.tsx` |
| **Pin confirmation** | `tests/pin-confirmation.test.ts`, `tests/pin-confirmation-action.test.ts`, `tests/confirmed-spots-card.test.tsx`, `tests/pin-vote-card.test.tsx` |
| **Pin edit/delete** | `tests/pin-management.test.ts`, `tests/manage-pins-action.test.ts`, `tests/edit-pin-modal.test.tsx`, `tests/trip-map-persistence.test.tsx` |
| **Member roles** | `tests/promote-member-button.test.tsx`, `tests/trip-members-actions.test.ts`, `tests/trip-workspace-page.test.tsx` |
| **Pin persistence** | `tests/create-pin-action.test.ts`, `tests/get-trip-pins.test.ts`, `tests/pin-mappers.test.ts`, `tests/trip-map-persistence.test.tsx` |
| **Test session** | `tests/test-session.test.ts` |

## Database Tests

- [`supabase/tests/date_windows.test.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/tests/date_windows.test.sql)
  covers the candidate-window constraints introduced in US-2.1 and is run with
  `npx supabase test db` against the local Docker stack.
- The US-2.3 lock/unlock functions are exercised by the acceptance tests
  through the Supabase test session, and the US-1.6 organizer transfer was
  additionally validated against the local Supabase stack during review.
- The `Database` CI job rebuilds a clean database from every migration and runs
  the pgTAP suite on every PR, and the deploy workflow repeats that verification
  before applying migrations.
- The `Migration Guard` job rejects edited, deleted, renamed, duplicated or
  out-of-order migrations before merge.
- A manual pass against the local Supabase stack is still recommended before the
  `iter-2` tag, especially for RLS policies that the test session does not
  reproduce.
