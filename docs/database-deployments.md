# Database deployment safeguards

- Application schema changes must be reviewed SQL migrations in `supabase/migrations/`.
- Do not manually edit hosted application tables, functions, triggers, or policies in the Supabase dashboard. If an emergency SQL change is unavoidable, record the equivalent migration immediately.
- Never edit a migration that has already run. Add a new migration to reconcile existing databases without losing data.
- Pull-request CI rebuilds a disposable local Supabase database from all migrations and runs the committed SQL tests.
- Deployment repeats that clean rebuild, records its schema metadata, applies hosted migrations, then compares the hosted schema against the clean baseline. Differences in tables, columns, constraints, indexes, policies, functions, or triggers block the Vercel deployment.
- The snapshot contains schema metadata only, not user records. Extension-owned objects are excluded because Supabase platform versions may differ.
- CLI version `3.0.0` is pinned in workflows; review upgrades rather than changing production tooling implicitly.
- A drift failure requires inspection and a reviewed migration. **Do not automatically reset production.** A reset requires explicit approval and must not be a normal deployment step.

## Production recovery on 6 November 2026

The first Iteration 1 production migration run encountered legacy, unversioned schema: `profiles` used `shell_id` as its primary key instead of a unique user `id`. Other legacy trip columns also differed from the migration schema.

With explicit approval to discard production application data, the public application schema and its migration history were rebuilt atomically from the eight committed migrations. Application storage policies were recreated from those migrations. Supabase-managed auth/storage schemas and existing auth users/files were not reset; the profile migration recreated three profiles for the retained auth users. No production reset command is committed or added to CI.

The deployment rerun succeeded, and the production schema matched the migration-built local baseline. Unauthenticated production page/redirect checks, 14 JavaScript/CSS assets, and place search passed. Authenticated hosted UI flows still require a test login; local authenticated smoke tests are not a substitute for that check.

The reset also exposed an unversioned dependency: the profile UI calls `delete_own_account`. Migration `20261106140000_add_account_deletion_rpc.sql` now defines that caller-only RPC, with database tests for anonymous rejection and isolation between users. Its SQL was restored in production as part of recovery; its migration-history entry will be recorded by normal deployment when this PR is promoted. A rolled-back production test verified that it deletes only the caller's test account.

To check a hosted database against a clean local snapshot (Supabase CLI 3.0.0):

```bash
# Only use db reset on a disposable local stack; this removes its local data.
supabase start
supabase db reset --no-seed
supabase test db
supabase db query --read-only --file scripts/database-schema.sql > /path/to/schema.json
node scripts/check-database-schema.mjs --expected /path/to/schema.json --remote YOUR_PROJECT_REF
```
