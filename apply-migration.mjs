// Applies supabase/migrations/20260425_fix_rls_recursion.sql to your Supabase
// project via direct Postgres connection.
//
// Usage:
//   1. Supabase Dashboard → Project Settings → Database → Connection string →
//      "URI" tab → "Transaction pooler" (port 6543) — copy the string and
//      paste your DB password where it shows [YOUR-PASSWORD].
//   2. Run:  DATABASE_URL='postgresql://...' node apply-migration.mjs
//
// Alternative: paste the SQL file directly in Supabase Dashboard → SQL Editor.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, 'supabase/migrations/20260425_fix_rls_recursion.sql');
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL env var is required.');
  console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string → URI (Transaction pooler).');
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
console.log(`Applying ${sqlPath} (${sql.length} bytes)…`);

const result = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('\npsql failed.');
  process.exit(result.status ?? 1);
}

console.log('\n✓ Migration applied. Restart `npm run dev` and try adding a vehicle.');
