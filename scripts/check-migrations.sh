#!/usr/bin/env bash
#
# Fails a pull request that rewrites migration history.
#
# Migrations in supabase/migrations/ are append-only: once a migration has been
# merged (and possibly applied to staging or production) it must never be
# edited, deleted or renamed. Reconcile existing databases with a new
# migration instead.
#
# Usage: scripts/check-migrations.sh <base-branch>
#
set -euo pipefail

BASE_REF="${1:-}"
MIGRATIONS_DIR="supabase/migrations"

if [ -z "${BASE_REF}" ]; then
  echo "usage: $0 <base-branch>" >&2
  exit 64
fi

if ! git rev-parse --verify --quiet "origin/${BASE_REF}" >/dev/null; then
  echo "::error::Base branch origin/${BASE_REF} is not available. Fetch it before running this check."
  exit 1
fi

BASE="origin/${BASE_REF}"
FAILED=0

fail() {
  echo "::error::$1"
  FAILED=1
}

# 1. Already merged migrations are immutable.
changed="$(git diff --name-status --diff-filter=MDR "${BASE}"...HEAD -- "${MIGRATIONS_DIR}")"
if [ -n "${changed}" ]; then
  echo "${changed}"
  fail "Migrations that already exist on ${BASE_REF} must not be edited, deleted or renamed. Add a new migration instead."
fi

# 2. Filenames must follow YYYYMMDDHHMMSS_snake_case.sql.
invalid_names="$(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' \
  | grep -Ev '^[0-9]{14}_[a-z0-9_]+\.sql$' || true)"
if [ -n "${invalid_names}" ]; then
  echo "${invalid_names}"
  fail "Migration filenames must look like YYYYMMDDHHMMSS_snake_case.sql. Generate them with 'supabase migration new <name>'."
fi

# 3. Versions must be unique.
duplicates="$(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' \
  | cut -d_ -f1 | sort | uniq -d)"
if [ -n "${duplicates}" ]; then
  echo "${duplicates}"
  fail "Duplicate migration versions found. Two migrations share the same timestamp."
fi

# 4. New migrations must be newer than the newest one already on the base
#    branch, otherwise they can only be applied out of order.
latest_on_base="$(git ls-tree --name-only "${BASE}" -- "${MIGRATIONS_DIR}/" \
  | xargs -r -n1 basename | cut -d_ -f1 | sort | tail -n 1)"

if [ -n "${latest_on_base}" ]; then
  added="$(git diff --name-only --diff-filter=A "${BASE}"...HEAD -- "${MIGRATIONS_DIR}")"
  while IFS= read -r file; do
    [ -n "${file}" ] || continue
    version="$(basename "${file}" | cut -d_ -f1)"
    if [[ ! "${version}" > "${latest_on_base}" ]]; then
      fail "${file} is older than ${latest_on_base}, the newest migration on ${BASE_REF}. Rename it so it applies in order."
    fi
  done <<< "${added}"
fi

if [ "${FAILED}" -ne 0 ]; then
  exit 1
fi

echo "Migration history is append-only, ordered and uniquely versioned."
