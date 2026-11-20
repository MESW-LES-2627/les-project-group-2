# AI Log

## Toolchain

The team used **Gemini 3.8 Flash with Antigravity CLI** throughout the project. For the Iteration 2 close-out it also used **OpenCode with DeepSeek V4.1 Flash (T3 Code)** to review open PRs, resolve merge conflicts, fix the build and test-session issues, and finish the Playwright specs. Every AI change went through a pull request, review and CI.

## Where AI Helped

AI drafted the lock/unlock SQL and UI (US-2.3), best-date ranking (US-2.4), pin confirmation and edit/delete flows (US-3.3/US-3.5), and the organizer-transfer RPC (US-1.6). It also reviewed the Playwright suite (PR #75) and the migration guards (PR #78). Verification came from the acceptance suites, Vitest, the database tests and the staging pipeline.

## Human Decisions and Caught Mistakes

- **Human call on migrations:** when an open branch edited an already-applied migration, the team chose a new migration instead; PR #78 now enforces that rule.
- **Test-session bypass:** the acceptance client accepted the `planit-test-session` cookie in production. Review added a `NODE_ENV !== 'production'` guard.
- **Orphaned merge:** PR #74 (US-3.5) landed on `feature/US-3.3` after that branch had reached staging. PR #81 re-targeted the same commit to staging.
- **Build not gated:** PR #80 passed lint and tests while `next build` failed. PR #78 added a `Build` job.
- **Zero-row updates:** pin confirm/revert could succeed silently; they now fail visibly.
