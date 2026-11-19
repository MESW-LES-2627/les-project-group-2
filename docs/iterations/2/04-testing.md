# How to Run the Tests

Documented in [README and Local Development Setup](https://github.com/MESW-LES-2627/les-project-group-2/blob/main/README.md#local-development-setup)
and in [CONTRIBUTING.md](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/CONTRIBUTING.md).

## Commands

```bash
# Run all unit and acceptance tests with a coverage report
npm test

# Run only unit tests
npm run test:unit

# Run only acceptance tests
npm run test:acceptance

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

Verified on the staging snapshot [`e4a09f14`](https://github.com/MESW-LES-2627/les-project-group-2/commit/e4a09f147698eb099612efc43b6ce907e55d8a22):

| Check | Result |
| :--- | :--- |
| **Test files** | 57 passed |
| **Tests** | 428 passed |
| **Line coverage** | 93.96% |
| **Statement coverage** | 93.63% |
| **Branch coverage** | 89.47% |
| **Function coverage** | 93.52% |
| **Lint** | 0 errors, 6 pre-existing warnings (`signup.tsx`) |
| **Staging build and deploy** | Green ([run 44637057541](https://github.com/MESW-LES-2627/les-project-group-2/actions/runs/44637057541)) |

The Definition of Done requires more than 90% line coverage; the current
snapshot meets that gate.

## Tests Added in This Increment

### Acceptance tests

| Story | File | What it proves |
| :--- | :--- | :--- |
| **US-2.3** | [`US-2.3-lock-trip-dates.acceptance.test.tsx`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/acceptanceTests/US-2.3-lock-trip-dates.acceptance.test.tsx) | Organizer locks a range and every member sees it; availability and windows become read-only; itinerary days are created; unlocking restores editing. |
| **US-2.4** | [`US-2.4-best-date-suggestion.acceptance.test.tsx`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/acceptanceTests/US-2.4-best-date-suggestion.acceptance.test.tsx) | Suggestions are ranked by available members with earliest-start tie-breaking; non-attending members are shown; choosing a suggestion pre-fills the lock form. |
| **US-3.3** | [`US-3.3-commit-winning-pin.acceptance.test.tsx`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/acceptanceTests/US-3.3-commit-winning-pin.acceptance.test.tsx) | A confirmed pin changes style and enters the confirmed list; voting is closed; reverting reopens voting. |

### Unit and component tests

| Area | Files |
| :--- | :--- |
| **Trip date lock** | `tests/trip-lock-utils.test.ts`, `tests/lock-dates-actions.test.ts`, `tests/lock-dates-component.test.tsx` |
| **Best-date suggestions** | `tests/best-dates-utils.test.ts`, `tests/best-date-suggestions-component.test.tsx` |
| **Pin confirmation** | `tests/pin-confirmation.test.ts`, `tests/pin-confirmation-action.test.ts`, `tests/confirmed-spots-card.test.tsx`, `tests/pin-vote-card.test.tsx` |
| **Pin persistence** | `tests/create-pin-action.test.ts`, `tests/get-trip-pins.test.ts`, `tests/pin-mappers.test.ts`, `tests/trip-map-persistence.test.tsx` |

## Database Tests

- [`supabase/tests/date_windows.test.sql`](https://github.com/MESW-LES-2627/les-project-group-2/blob/staging/supabase/tests/date_windows.test.sql)
  covers the candidate-window constraints introduced in US-2.1 and is run with
  `npx supabase test db` against the local Docker stack.
- The US-2.3 lock and unlock functions are exercised by the acceptance tests
  through a Supabase stand-in, and were additionally validated against an
  in-memory Postgres during review. A manual pass against the local Supabase
  stack is recommended before the tag is created.
