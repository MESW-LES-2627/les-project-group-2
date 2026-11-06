import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Compare metadata only; never inspect or change application records. */
export function schemaDifferences(expected, actual) {
  const normalize = (value) => {
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]))
    }
    return value
  }
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].filter(
    (key) => JSON.stringify(normalize(expected[key])) !== JSON.stringify(normalize(actual[key]))
  )
}

/** Supabase CLI envelopes include database-supplied data: only read the schema field. */
export function readSchema(output) {
  const schema = JSON.parse(output).rows?.[0]?.schema
  const sections = ['tables', 'columns', 'constraints', 'indexes', 'policies', 'functions', 'triggers']
  if (!schema || sections.some((section) => !Array.isArray(schema[section]))) {
    throw new Error('Invalid schema snapshot; refusing to pass the drift check.')
  }
  return schema
}

function main() {
  const args = process.argv.slice(2)
  if (args.length !== 4 || args[0] !== '--expected' || args[2] !== '--remote' || !args[3]) {
    throw new Error('Usage: node scripts/check-database-schema.mjs --expected snapshot.json --remote target')
  }
  const expected = readSchema(readFileSync(args[1], 'utf8'))
  let output
  try {
    output = execFileSync('supabase', [
      'db', 'query', `--remote=${args[3]}`, '--read-only',
      '--file', fileURLToPath(new URL('./database-schema.sql', import.meta.url)),
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], timeout: 120000 })
  } catch {
    // Child-process errors include command arguments, which may contain a DB URL.
    throw new Error('Database schema query failed. Check connectivity and permissions.')
  }
  const differences = schemaDifferences(expected, readSchema(output))
  if (differences.length) {
    throw new Error(`Schema drift detected in: ${differences.join(', ')}. Reconcile with a reviewed migration; do not reset production.`)
  }
  console.log('Hosted schema matches the clean migration baseline.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main()
  } catch (error) {
    // Avoid printing the child command: a remote URL may contain credentials.
    console.error(error instanceof Error ? error.message : 'Database schema verification failed.')
    process.exitCode = 1
  }
}
