#!/usr/bin/env node
/**
 * Fails CI when a migration creates a public table without enabling RLS,
 * without GRANTs, or hardcodes a service-role key.
 * Run locally: node scripts/check-migrations-security.mjs
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const errors = [];

if (!existsSync(DIR)) {
  console.log("No migrations directory — nothing to check.");
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql"));
const allSql = files
  .map((f) => readFileSync(join(DIR, f), "utf8"))
  .join("\n")
  .toLowerCase();

for (const file of files) {
  const sql = readFileSync(join(DIR, file), "utf8");
  const lower = sql.toLowerCase();

  // Hardcoded secrets
  if (/service_role_key|sb_secret_|eyj[a-z0-9_-]{30,}/i.test(sql)) {
    errors.push(`${file}: possible hardcoded key/JWT in migration`);
  }

  // New public tables must have RLS + GRANT somewhere in the migration history
  const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi;
  let m;
  while ((m = tableRe.exec(sql))) {
    const table = m[1].toLowerCase();
    if (!allSql.includes(`enable row level security`) || !new RegExp(`alter\\s+table\\s+(public\\.)?"?${table}"?[\\s\\S]{0,120}enable row level security`).test(allSql)) {
      errors.push(`${file}: table "${table}" never gets ENABLE ROW LEVEL SECURITY`);
    }
    if (!new RegExp(`grant[\\s\\S]{0,120}\\b(public\\.)?${table}\\b`).test(allSql)) {
      errors.push(`${file}: table "${table}" has no GRANT statement`);
    }
  }
}

if (errors.length) {
  console.error("Security check failed:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Security check passed (${files.length} migrations).`);
