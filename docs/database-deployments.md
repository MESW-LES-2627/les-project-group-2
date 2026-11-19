# Database deployments

The application schema lives in `supabase/migrations/`. Staging and production
are only ever changed by applying those migrations — never by editing tables,
functions, triggers or policies in the Supabase dashboard.

## Rules for pull requests

1. **Migrations are append-only.** Never edit, delete or rename a migration that
   already exists on `staging` or `main`; it may already be applied. Reconcile
   existing databases with a new migration.
2. **New migrations go at the end.** The version in the filename must be newer
   than the newest migration on the target branch, otherwise it can only be
   applied out of order.
3. **One timestamp, one migration.** Versions are unique; generate the filename
   with the CLI instead of copying an old one.
4. **Database changes need SQL tests.** Add a `supabase/tests/*.test.sql`
   (pgTAP) covering the new policy, function or constraint. These run against a
   clean database in CI, not against mocked Supabase clients.

`scripts/check-migrations.sh` enforces rules 1–3 in the `Migration Guard` job
and fails the PR with a pointer to the offending file.

## What CI runs

`Checks` (`.github/workflows/checks.yaml`), on every pull request to `staging`
or `main`:

| Job | What it proves |
| :--- | :--- |
| `Migration Guard` | No applied migration was rewritten and versions are ordered and unique. |
| `Database` | A disposable Supabase stack can be built from every migration (`db reset`) and the pgTAP suite passes (`supabase test db`). |
| `Lint and Format`, `Test`, `Build` | The application still lints, tests and compiles. |

The `Database` job needs the Supabase CLI pinned to `3.0.0` and Docker; it runs
in parallel with the other jobs.

## What deployment does

`.github/workflows/deploy.yml` runs on pushes to `staging` and `main`:

1. `verify-migrations` rebuilds a clean database from the same commits and runs
   the SQL tests again, so a merge cannot apply an untested migration.
2. `build` compiles the application.
3. `migrate` runs `supabase db push --dry-run` (to show the pending versions),
   then applies them to the matching hosted database.
4. `deploy` promotes the Vercel build only after migrations succeeded.

Migrations currently run with `--include-all` because the repository still has
branches with older timestamps (for example `20261107000000_*`, which sorts
before staging's `20261109100000_*`). Once those are renamed and promoted, drop
the flag so production refuses out-of-order history.

## Local workflow

```bash
# Start the local stack (Docker required)
supabase start

# Rebuild from migrations, then run the SQL tests
supabase db reset --no-seed
supabase test db

# Create a new migration with a correctly ordered timestamp
supabase migration new add_something
```

## Not covered yet

A hosted-schema drift check (comparing staging/production metadata against the
clean migration baseline) is the next step; it catches manual dashboard edits
and migrations that were applied outside the repository. Until then, treat any
`db push` failure or unexpected schema state as a stop sign and add a reviewed
migration rather than resetting a hosted database.
