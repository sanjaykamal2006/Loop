import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

/**
 * Live-database schema / RLS contract tests.
 *
 * These assertions encode the security and schema invariants that must hold
 * after every migration or RLS change.
 * In local dev without a test database, these are skipped unless you provide
 * TEST_DATABASE_URL. In CI, a PostgreSQL 15 service container applies all
 * migrations and runs this suite against TEST_DATABASE_URL.
 *
 * PostgreSQL 15+ compatible (pinned to postgres:15 in CI to match Supabase Postgres version).
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

const EXPECTED_COLUMNS: Record<string, { name: string; type: string; nullable: string }[]> = {
  allowed_external_emails: [
    { name: "created_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "description", type: "text", nullable: "YES" },
    { name: "email", type: "text", nullable: "NO" },
  ],
  emergency_contacts: [
    { name: "created_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "name", type: "text", nullable: "NO" },
    { name: "phone", type: "text", nullable: "NO" },
    { name: "relation", type: "text", nullable: "YES" },
    { name: "updated_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "user_id", type: "uuid", nullable: "NO" },
  ],
  expected_fares: [
    { name: "created_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "expected_fare", type: "numeric", nullable: "NO" },
    { name: "from_location", type: "text", nullable: "NO" },
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "to_location", type: "text", nullable: "NO" },
    { name: "user_id", type: "uuid", nullable: "NO" },
    { name: "vehicle_type", type: "text", nullable: "YES" },
  ],
  loop_members: [
    { name: "joined_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "loop_id", type: "uuid", nullable: "NO" },
    { name: "user_id", type: "uuid", nullable: "NO" },
  ],
  loop_participants: [
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "joined_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "loop_id", type: "uuid", nullable: "YES" },
    { name: "user_id", type: "uuid", nullable: "YES" },
  ],
  loops: [
    { name: "category", type: "text", nullable: "YES" },
    { name: "created_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "creator_id", type: "uuid", nullable: "YES" },
    { name: "departure_time", type: "timestamp with time zone", nullable: "YES" },
    { name: "destination", type: "text", nullable: "NO" },
    { name: "expires_at", type: "timestamp with time zone", nullable: "NO" },
    { name: "gender_preference", type: "text", nullable: "NO" },
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "is_driver_offering", type: "boolean", nullable: "YES" },
    { name: "is_female_only", type: "boolean", nullable: "YES" },
    { name: "participants_limit", type: "integer", nullable: "NO" },
    { name: "purpose", type: "text", nullable: "YES" },
    { name: "start_point", type: "text", nullable: "YES" },
    { name: "start_time_type", type: "text", nullable: "YES" },
    { name: "status", type: "text", nullable: "YES" },
    { name: "total_fare", type: "integer", nullable: "YES" },
    { name: "vehicle_type", type: "text", nullable: "YES" },
  ],
  messages: [
    { name: "content", type: "text", nullable: "NO" },
    { name: "created_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "edited_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "loop_id", type: "uuid", nullable: "YES" },
    { name: "reactions", type: "jsonb", nullable: "YES" },
    { name: "user_id", type: "uuid", nullable: "YES" },
  ],
  profile_contacts: [
    { name: "phone_number", type: "text", nullable: "NO" },
    { name: "updated_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "user_id", type: "uuid", nullable: "NO" },
  ],
  profiles: [
    { name: "avatar_url", type: "text", nullable: "YES" },
    { name: "bio", type: "text", nullable: "YES" },
    { name: "display_name", type: "text", nullable: "YES" },
    { name: "gender", type: "text", nullable: "YES" },
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "is_student_verified", type: "boolean", nullable: "YES" },
    { name: "phone_number", type: "text", nullable: "YES" },
    { name: "reg_no", type: "text", nullable: "YES" },
    { name: "theme", type: "text", nullable: "YES" },
    { name: "updated_at", type: "timestamp with time zone", nullable: "NO" },
  ],
  trusted_vehicles: [
    { name: "created_at", type: "timestamp with time zone", nullable: "YES" },
    { name: "driver_name", type: "text", nullable: "NO" },
    { name: "expected_fare", type: "numeric", nullable: "YES" },
    { name: "from_location", type: "text", nullable: "YES" },
    { name: "id", type: "uuid", nullable: "NO" },
    { name: "phone_number", type: "text", nullable: "NO" },
    { name: "to_location", type: "text", nullable: "YES" },
    { name: "user_id", type: "uuid", nullable: "NO" },
    { name: "vehicle_type", type: "text", nullable: "NO" },
  ],
};

const EXPECTED_FOREIGN_KEYS = [
  { table: "emergency_contacts", column: "user_id", refSchema: "auth", refTable: "users", refColumn: "id", deleteRule: "CASCADE" },
  { table: "expected_fares", column: "user_id", refSchema: "public", refTable: "profiles", refColumn: "id", deleteRule: "CASCADE" },
  { table: "loop_members", column: "loop_id", refSchema: "public", refTable: "loops", refColumn: "id", deleteRule: "CASCADE" },
  { table: "loop_members", column: "user_id", refSchema: "public", refTable: "profiles", refColumn: "id", deleteRule: "CASCADE" },
  { table: "loop_participants", column: "loop_id", refSchema: "public", refTable: "loops", refColumn: "id", deleteRule: "CASCADE" },
  { table: "loop_participants", column: "user_id", refSchema: "public", refTable: "profiles", refColumn: "id", deleteRule: "CASCADE" },
  { table: "loops", column: "creator_id", refSchema: "public", refTable: "profiles", refColumn: "id", deleteRule: "SET NULL" },
  { table: "messages", column: "loop_id", refSchema: "public", refTable: "loops", refColumn: "id", deleteRule: "CASCADE" },
  { table: "messages", column: "user_id", refSchema: "public", refTable: "profiles", refColumn: "id", deleteRule: "SET NULL" },
  { table: "profile_contacts", column: "user_id", refSchema: "auth", refTable: "users", refColumn: "id", deleteRule: "CASCADE" },
  { table: "profiles", column: "id", refSchema: "auth", refTable: "users", refColumn: "id", deleteRule: "CASCADE" },
  { table: "trusted_vehicles", column: "user_id", refSchema: "public", refTable: "profiles", refColumn: "id", deleteRule: "CASCADE" },
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

  it("matches production schema columns, data types, and nullability across all tables", async () => {
    const rows = await sql<{ table_name: string; column_name: string; data_type: string; is_nullable: string }[]>`
      select table_name, column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, column_name
    `;

    const actualMap = new Map<string, { type: string; nullable: string }>();
    for (const r of rows) {
      actualMap.set(`${r.table_name}.${r.column_name}`, { type: r.data_type, nullable: r.is_nullable });
    }

    // Verify every expected column matches exactly
    for (const [table, cols] of Object.entries(EXPECTED_COLUMNS)) {
      for (const expected of cols) {
        const actual = actualMap.get(`${table}.${expected.name}`);
        expect(actual, `Missing column ${table}.${expected.name}`).toBeDefined();
        expect(actual?.type, `Type mismatch on ${table}.${expected.name}`).toBe(expected.type);
        expect(actual?.nullable, `Nullability mismatch on ${table}.${expected.name}`).toBe(expected.nullable);
      }
    }

    // Verify total column count matches production
    const totalExpectedColumns = Object.values(EXPECTED_COLUMNS).reduce((sum, c) => sum + c.length, 0);
    expect(rows.length).toBe(totalExpectedColumns);
  }, DB_TIMEOUT_MS);

  it("matches primary key constraints across all public tables", async () => {
    const pks = await sql<{ table_name: string; column_name: string }[]>`
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'
      order by tc.table_name, kcu.column_name
    `;

    const pkTables = [...new Set(pks.map((p) => p.table_name))].sort();
    expect(pkTables).toEqual(EXPECTED_PUBLIC_TABLES);
  }, DB_TIMEOUT_MS);

  it("enforces referential constraints matching production foreign keys", async () => {
    const fks = await sql<{
      table_name: string;
      column_name: string;
      foreign_table_schema: string;
      foreign_table_name: string;
      foreign_column_name: string;
      delete_rule: string;
    }[]>`
      select
        rel.relname as table_name,
        att.attname as column_name,
        f_nsp.nspname as foreign_table_schema,
        f_rel.relname as foreign_table_name,
        f_att.attname as foreign_column_name,
        case con.confdeltype
          when 'a' then 'NO ACTION'
          when 'r' then 'RESTRICT'
          when 'c' then 'CASCADE'
          when 'n' then 'SET NULL'
          when 'd' then 'SET DEFAULT'
        end as delete_rule
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      join pg_class f_rel on f_rel.oid = con.confrelid
      join pg_namespace f_nsp on f_nsp.oid = f_rel.relnamespace
      join pg_attribute f_att on f_att.attrelid = con.confrelid and f_att.attnum = any(con.confkey)
      where con.contype = 'f' and nsp.nspname = 'public'
      order by rel.relname, att.attname, con.conname
    `;

    // 1. Assert exact total foreign key count matches production (all 12 FKs across all schemas)
    expect(fks.length, `Expected exactly ${EXPECTED_FOREIGN_KEYS.length} foreign keys, received ${fks.length}`).toBe(EXPECTED_FOREIGN_KEYS.length);

    // 2. Assert every expected foreign key matches full 6-tuple: table, column, refSchema, refTable, refColumn, deleteRule
    for (const expFk of EXPECTED_FOREIGN_KEYS) {
      const match = fks.find(
        (f) =>
          f.table_name === expFk.table &&
          f.column_name === expFk.column &&
          f.foreign_table_schema === expFk.refSchema &&
          f.foreign_table_name === expFk.refTable &&
          f.foreign_column_name === expFk.refColumn &&
          f.delete_rule === expFk.deleteRule,
      );
      expect(
        match,
        `Missing or mismatched FK: ${expFk.table}.${expFk.column} -> ${expFk.refSchema}.${expFk.refTable}.${expFk.refColumn} [${expFk.deleteRule}]`,
      ).toBeDefined();
    }
  }, DB_TIMEOUT_MS);


  it("enables row level security on every public table", async () => {
    const rows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `;
    expect(rows.length).toBe(EXPECTED_PUBLIC_TABLES.length);
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
    expect(rows.length).toBe(EXPECTED_PUBLIC_TABLES.length);
    const withoutPolicies = rows.filter((r) => r.policy_count === 0).map((r) => r.tablename);
    expect(withoutPolicies).toEqual([]);
  }, DB_TIMEOUT_MS);

  it("uses only the initplan-optimised (select auth.uid()) form in policies", async () => {
    const rows = await sql<{ tablename: string; policyname: string; qual: string | null }[]>`
      select tablename, policyname, qual from pg_policies where schemaname = 'public'
    `;
    expect(rows.length).toBeGreaterThan(0);
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
      select
        case con.confdeltype
          when 'a' then 'NO ACTION'
          when 'r' then 'RESTRICT'
          when 'c' then 'CASCADE'
          when 'n' then 'SET NULL'
          when 'd' then 'SET DEFAULT'
        end as delete_rule
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      where con.contype = 'f' and nsp.nspname = 'public'
        and rel.relname = 'messages'
        and att.attname = 'user_id'
    `;
    expect(rules.map((r) => r.delete_rule)).toEqual(["SET NULL"]);

  }, DB_TIMEOUT_MS);

  it("behaviorally enforces RLS: user A cannot read or mutate user B private emergency contacts", async () => {
    const userA = "11111111-1111-1111-1111-111111111111";
    const userB = "22222222-2222-2222-2222-222222222222";

    await sql.begin(async (tx) => {
      // Seed dummy users in auth.users
      await tx`
        INSERT INTO auth.users (id, email)
        VALUES (${userA}, 'usera@vitapstudent.ac.in'), (${userB}, 'userb@vitapstudent.ac.in')
        ON CONFLICT (id) DO NOTHING
      `;

      // Set auth context to User B
      await tx`SELECT set_config('request.jwt.claim.sub', ${userB}, true)`;
      await tx`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`;
      await tx`SET LOCAL ROLE authenticated`;

      const [inserted] = await tx<{ id: string }[]>`
        INSERT INTO public.emergency_contacts (user_id, name, phone, relation)
        VALUES (${userB}, 'User B Contact', '9999988888', 'Parent')
        RETURNING id
      `;
      expect(inserted?.id).toBeDefined();

      // Switch context to User A
      await tx`SELECT set_config('request.jwt.claim.sub', ${userA}, true)`;

      // User A cannot SELECT User B's emergency contact
      const visible = await tx`
        SELECT * FROM public.emergency_contacts WHERE id = ${inserted.id}
      `;
      expect(visible.length).toBe(0);

      // User A cannot UPDATE User B's emergency contact
      const updated = await tx`
        UPDATE public.emergency_contacts SET name = 'Attacker' WHERE id = ${inserted.id} RETURNING id
      `;
      expect(updated.length).toBe(0);

      // User A cannot DELETE User B's emergency contact
      const deleted = await tx`
        DELETE FROM public.emergency_contacts WHERE id = ${inserted.id} RETURNING id
      `;
      expect(deleted.length).toBe(0);

      // Always abort transaction so DB state remains untouched
      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);
});
