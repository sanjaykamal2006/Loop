import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

/**
 * Live-database schema / RLS contract tests.
 *
 * These are READ-ONLY assertions that encode the security and schema
 * invariants which must hold after every migration or RLS change. They are
 * skipped unless you explicitly provide a database URL, so CI (which has no
 * DATABASE_URL) does not need one.
 *
 * Run against a test/branch database, or read-only against production:
 *   PowerShell:  $env:TEST_DATABASE_URL="postgresql://..."; npm run test:db
 *   bash:        TEST_DATABASE_URL="postgresql://..." npm run test:db
 *
 * Deliberately NOT named DATABASE_URL so a stray production connection string
 * in the shell can never cause this suite to touch the wrong database.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const hasDb = Boolean(TEST_DATABASE_URL);

const EXPECTED_PUBLIC_TABLES = [
  "allowed_external_emails",
  "emergency_contacts",
  "expected_fares",
  "loop_members",
  "loop_participants",
  "loops",
  "messages",
  "profile_contacts",
  "profiles",
  "trusted_vehicles",
];

describe.skipIf(!hasDb)("database schema contract", () => {
  let sql: ReturnType<typeof postgres>;

  // Remote databases (Supabase pooler) can be slow on the first connection,
  // so allow generous time per query set.
  const DB_TIMEOUT_MS = 30_000;

  beforeAll(() => {
    const isLocal = /localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL as string);
    sql = postgres(TEST_DATABASE_URL as string, {
      max: 1,
      // Supabase's transaction-mode pooler does not support prepared statements.
      prepare: false,
      ssl: isLocal ? false : "require",
      connect_timeout: 20,
    });
  });

  afterAll(async () => {
    await sql?.end({ timeout: 5 });
  });

  it("exposes exactly the expected public tables", async () => {
    const rows = await sql<{ tablename: string }[]>`
      select tablename from pg_tables where schemaname = 'public' order by tablename
    `;
    expect(rows.map((r) => r.tablename)).toEqual(EXPECTED_PUBLIC_TABLES);
  }, DB_TIMEOUT_MS);

  it("enables row level security on every public table", async () => {
    const rows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `;
    const withoutRls = rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
    expect(withoutRls).toEqual([]);
  }, DB_TIMEOUT_MS);

  it("defines at least one RLS policy for every public table", async () => {
    const rows = await sql<{ tablename: string; policy_count: number }[]>`
      select c.relname as tablename, count(p.polname)::int as policy_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_policy p on p.polrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r'
      group by c.relname
    `;
    const withoutPolicies = rows.filter((r) => r.policy_count === 0).map((r) => r.tablename);
    expect(withoutPolicies).toEqual([]);
  }, DB_TIMEOUT_MS);

  it("uses only the initplan-optimised (select auth.uid()) form in policies", async () => {
    const rows = await sql<{ tablename: string; policyname: string; qual: string | null }[]>`
      select tablename, policyname, qual from pg_policies where schemaname = 'public'
    `;
    const bare = rows
      .filter((r) => r.qual && /auth\.uid\(\)/i.test(r.qual))
      .filter((r) => !/select\s+auth\.uid\(\)/i.test(r.qual as string))
      .map((r) => `${r.tablename}.${r.policyname}`);
    expect(bare).toEqual([]);
  }, DB_TIMEOUT_MS);

  it("keeps messages.user_id nullable with ON DELETE SET NULL", async () => {
    const [nullable] = await sql<{ is_nullable: string }[]>`
      select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'messages' and column_name = 'user_id'
    `;
    expect(nullable?.is_nullable).toBe("YES");

    const rules = await sql<{ delete_rule: string }[]>`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = rc.constraint_name
       and kcu.constraint_schema = rc.constraint_schema
      where kcu.table_schema = 'public'
        and kcu.table_name = 'messages'
        and kcu.column_name = 'user_id'
    `;
    expect(rules.map((r) => r.delete_rule)).toContain("SET NULL");
  }, DB_TIMEOUT_MS);
});
