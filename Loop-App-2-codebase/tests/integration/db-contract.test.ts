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

  it("behaviorally enforces account deletion and message anonymisation (user_id -> NULL)", async () => {
    const testUserId = "33333333-3333-3333-3333-333333333333";
    const testLoopId = "44444444-4444-4444-4444-444444444444";
    const testMsgId = "55555555-5555-5555-5555-555555555555";
    const attackerId = "66666666-6666-6666-6666-666666666666";

    await sql.begin(async (tx) => {
      // 1. Seed user in auth.users and public.profiles
      await tx`
        INSERT INTO auth.users (id, email)
        VALUES (${testUserId}, 'del_test@vitapstudent.ac.in')
        ON CONFLICT (id) DO NOTHING
      `;
      await tx`
        INSERT INTO public.profiles (id, display_name, phone_number, gender)
        VALUES (${testUserId}, 'Delete Test User', '+919999900000', 'other')
        ON CONFLICT (id) DO NOTHING
      `;

      // 2. Create loop created by this user
      await tx`
        INSERT INTO public.loops (id, creator_id, destination, participants_limit, status, gender_preference, expires_at)
        VALUES (${testLoopId}, ${testUserId}, 'Vijayawada Station', 4, 'open', 'any', now() + interval '2 hours')
        ON CONFLICT (id) DO NOTHING
      `;


      // 3. Create message sent by this user in that loop
      await tx`
        INSERT INTO public.messages (id, loop_id, user_id, content)
        VALUES (${testMsgId}, ${testLoopId}, ${testUserId}, 'Hello from delete test!')
        ON CONFLICT (id) DO NOTHING
      `;

      // 4. Delete the profile - simulates account deletion trigger / ON DELETE SET NULL
      await tx`DELETE FROM public.profiles WHERE id = ${testUserId}`;

      // 5. Assert loop survived with creator_id = NULL
      const [loop] = await tx<{ creator_id: string | null }[]>`
        SELECT creator_id FROM public.loops WHERE id = ${testLoopId}
      `;
      expect(loop).toBeDefined();
      expect(loop.creator_id).toBeNull();

      // 6. Assert message survived with user_id = NULL (anonymised, NOT wiped, NOT blocked by trigger)
      const [msg] = await tx<{ user_id: string | null; content: string }[]>`
        SELECT user_id, content FROM public.messages WHERE id = ${testMsgId}
      `;
      expect(msg).toBeDefined();
      expect(msg.content).toBe('Hello from delete test!');
      expect(msg.user_id).toBeNull();

      // 7. Verify the trigger STILL prevents transferring to another active user
      await tx`
        INSERT INTO auth.users (id, email)
        VALUES (${attackerId}, 'attacker@vitapstudent.ac.in')
        ON CONFLICT (id) DO NOTHING
      `;
      await tx`
        INSERT INTO public.profiles (id, display_name, phone_number, gender)
        VALUES (${attackerId}, 'Attacker', '+919999911111', 'other')
        ON CONFLICT (id) DO NOTHING
      `;

      let updateThrew = false;
      try {
        await tx`UPDATE public.messages SET user_id = ${attackerId} WHERE id = ${testMsgId}`;
      } catch (err: unknown) {
        updateThrew = true;
        expect((err as Error).message).toMatch(/Cannot alter message sender/i);
      }
      expect(updateThrew, "Expected spoofing message user_id to raise exception").toBe(true);

      // Always abort transaction so DB state remains untouched
      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);

  it("matches production CHECK constraints across public tables", async () => {
    const checks = await sql<{ conname: string; table_name: string }[]>`
      select con.conname, rel.relname as table_name
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where con.contype = 'c' and nsp.nspname = 'public'
      order by rel.relname, con.conname
    `;

    const expectedChecks = [
      { conname: "check_email_clean", table_name: "allowed_external_emails" },
      { conname: "check_emergency_contact_name_len", table_name: "emergency_contacts" },
      { conname: "check_emergency_contact_phone_len", table_name: "emergency_contacts" },
      { conname: "messages_content_length", table_name: "messages" },
      { conname: "check_profiles_bio_len", table_name: "profiles" },
      { conname: "check_profiles_display_name_len", table_name: "profiles" },
      { conname: "check_profiles_gender_valid", table_name: "profiles" },
      { conname: "check_driver_name_len", table_name: "trusted_vehicles" },
      { conname: "check_phone_number_len", table_name: "trusted_vehicles" },
      { conname: "trusted_vehicles_vehicle_type_check", table_name: "trusted_vehicles" },
    ];

    expect(checks.length).toBe(expectedChecks.length);
    for (const exp of expectedChecks) {
      const match = checks.find((c) => c.conname === exp.conname && c.table_name === exp.table_name);
      expect(match, `Missing check constraint ${exp.table_name}.${exp.conname}`).toBeDefined();
    }
  }, DB_TIMEOUT_MS);

  it("matches production UNIQUE constraints across public tables", async () => {
    const uniques = await sql<{ conname: string; table_name: string }[]>`
      select con.conname, rel.relname as table_name
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where con.contype = 'u' and nsp.nspname = 'public'
      order by rel.relname, con.conname
    `;

    const expectedUniques = [
      { conname: "loop_participants_loop_id_user_id_key", table_name: "loop_participants" },
    ];

    expect(uniques.length).toBe(expectedUniques.length);
    for (const exp of expectedUniques) {
      const match = uniques.find((u) => u.conname === exp.conname && u.table_name === exp.table_name);
      expect(match, `Missing unique constraint ${exp.table_name}.${exp.conname}`).toBeDefined();
    }
  }, DB_TIMEOUT_MS);

  it("matches production triggers across public tables", async () => {
    const triggers = await sql<{ trigger_name: string; table_name: string; function_name: string }[]>`
      select
        tg.tgname as trigger_name,
        rel.relname as table_name,
        proc.proname as function_name
      from pg_trigger tg
      join pg_class rel on rel.oid = tg.tgrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      join pg_proc proc on proc.oid = tg.tgfoid
      where not tg.tgisinternal and nsp.nspname = 'public'
      order by rel.relname, tg.tgname
    `;

    const expectedTriggers = [
      { trigger_name: "trg_check_emergency_contacts_limit", table_name: "emergency_contacts", function_name: "check_emergency_contacts_limit" },
      { trigger_name: "trg_check_loop_capacity", table_name: "loop_members", function_name: "check_loop_capacity" },
      { trigger_name: "trg_auto_add_creator_to_loop_members", table_name: "loops", function_name: "auto_add_creator_to_loop_members" },
      { trigger_name: "trg_check_active_loops_quota", table_name: "loops", function_name: "check_active_loops_quota" },
      { trigger_name: "trg_protect_message_updates", table_name: "messages", function_name: "protect_message_updates" },
      { trigger_name: "trg_protect_profile_updates", table_name: "profiles", function_name: "protect_profile_updates" },
    ];

    expect(triggers.length).toBe(expectedTriggers.length);
    for (const exp of expectedTriggers) {
      const match = triggers.find((t) => t.trigger_name === exp.trigger_name && t.table_name === exp.table_name);
      expect(match, `Missing trigger ${exp.table_name}.${exp.trigger_name}`).toBeDefined();
    }
  }, DB_TIMEOUT_MS);

  it("matches production indexes and composite definitions across public tables", async () => {
    const indexes = await sql<{ tablename: string; indexname: string; indexdef: string }[]>`
      select tablename, indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname
    `;

    const expectedIndexes = [
      { tablename: "allowed_external_emails", indexname: "allowed_external_emails_pkey", isUnique: true, columns: ["email"] },
      { tablename: "emergency_contacts", indexname: "emergency_contacts_pkey", isUnique: true, columns: ["id"] },
      { tablename: "emergency_contacts", indexname: "idx_emergency_contacts_user_id", isUnique: false, columns: ["user_id"] },
      { tablename: "expected_fares", indexname: "expected_fares_pkey", isUnique: true, columns: ["id"] },
      { tablename: "expected_fares", indexname: "idx_expected_fares_user_id", isUnique: false, columns: ["user_id"] },
      { tablename: "loop_members", indexname: "idx_loop_members_loop_id", isUnique: false, columns: ["loop_id"] },
      { tablename: "loop_members", indexname: "idx_loop_members_user_id", isUnique: false, columns: ["user_id"] },
      { tablename: "loop_members", indexname: "loop_members_pkey", isUnique: true, columns: ["loop_id", "user_id"] },
      { tablename: "loop_participants", indexname: "idx_loop_participants_user_id", isUnique: false, columns: ["user_id"] },
      { tablename: "loop_participants", indexname: "loop_participants_loop_id_user_id_key", isUnique: true, columns: ["loop_id", "user_id"] },
      { tablename: "loop_participants", indexname: "loop_participants_pkey", isUnique: true, columns: ["id"] },
      { tablename: "loops", indexname: "idx_loops_creator_id", isUnique: false, columns: ["creator_id"] },
      { tablename: "loops", indexname: "idx_loops_expires_at", isUnique: false, columns: ["expires_at"] },
      { tablename: "loops", indexname: "idx_loops_status_created", isUnique: false, columns: ["status", "created_at DESC"] },
      { tablename: "loops", indexname: "loops_pkey", isUnique: true, columns: ["id"] },
      { tablename: "messages", indexname: "idx_messages_loop_created", isUnique: false, columns: ["loop_id", "created_at"] },
      { tablename: "messages", indexname: "idx_messages_loop_id", isUnique: false, columns: ["loop_id"] },
      { tablename: "messages", indexname: "idx_messages_user_id", isUnique: false, columns: ["user_id"] },
      { tablename: "messages", indexname: "messages_pkey", isUnique: true, columns: ["id"] },
      { tablename: "profile_contacts", indexname: "profile_contacts_pkey", isUnique: true, columns: ["user_id"] },
      { tablename: "profiles", indexname: "profiles_pkey", isUnique: true, columns: ["id"] },
      { tablename: "trusted_vehicles", indexname: "idx_trusted_vehicles_user_id", isUnique: false, columns: ["user_id"] },
      { tablename: "trusted_vehicles", indexname: "trusted_vehicles_pkey", isUnique: true, columns: ["id"] },
    ];

    expect(indexes.length).toBe(expectedIndexes.length);
    for (const exp of expectedIndexes) {
      const match = indexes.find((i) => i.tablename === exp.tablename && i.indexname === exp.indexname);
      expect(match, `Missing index ${exp.tablename}.${exp.indexname}`).toBeDefined();
      if (exp.isUnique) {
        expect(match!.indexdef).toMatch(/CREATE UNIQUE INDEX/i);
      }
      for (const col of exp.columns) {
        expect(match!.indexdef).toContain(col);
      }
    }
  }, DB_TIMEOUT_MS);

  it("matches production column defaults across public tables", async () => {
    const defaults = await sql<{ table_name: string; column_name: string; column_default: string }[]>`
      select table_name, column_name, column_default
      from information_schema.columns
      where table_schema = 'public' and column_default is not null
      order by table_name, column_name
    `;

    const expectedDefaults = [
      { table_name: "allowed_external_emails", column_name: "created_at", column_default: "now()" },
      { table_name: "emergency_contacts", column_name: "created_at", column_default: "now()" },
      { table_name: "emergency_contacts", column_name: "id", column_default: "gen_random_uuid()" },
      { table_name: "emergency_contacts", column_name: "relation", column_default: "'Parent'::text" },
      { table_name: "emergency_contacts", column_name: "updated_at", column_default: "now()" },
      { table_name: "expected_fares", column_name: "created_at", column_default: "now()" },
      { table_name: "expected_fares", column_name: "id", column_default: "gen_random_uuid()" },
      { table_name: "expected_fares", column_name: "vehicle_type", column_default: "'auto'::text" },
      { table_name: "loop_members", column_name: "joined_at", column_default: "now()" },
      { table_name: "loop_participants", column_name: "id", column_default: "gen_random_uuid()" },
      { table_name: "loop_participants", column_name: "joined_at", column_default: "now()" },
      { table_name: "loops", column_name: "category", column_default: "'Other'::text" },
      { table_name: "loops", column_name: "created_at", column_default: "now()" },
      { table_name: "loops", column_name: "gender_preference", column_default: "'any'::text" },
      { table_name: "loops", column_name: "id", column_default: "gen_random_uuid()" },
      { table_name: "loops", column_name: "is_driver_offering", column_default: "false" },
      { table_name: "loops", column_name: "is_female_only", column_default: "false" },
      { table_name: "loops", column_name: "participants_limit", column_default: "4" },
      { table_name: "loops", column_name: "status", column_default: "'active'::text" },
      { table_name: "messages", column_name: "created_at", column_default: "now()" },
      { table_name: "messages", column_name: "id", column_default: "gen_random_uuid()" },
      { table_name: "messages", column_name: "reactions", column_default: "'{}'::jsonb" },
      { table_name: "profile_contacts", column_name: "updated_at", column_default: "now()" },
      { table_name: "profiles", column_name: "bio", column_default: "''::text" },
      { table_name: "profiles", column_name: "is_student_verified", column_default: "false" },
      { table_name: "profiles", column_name: "theme", column_default: "'dark'::text" },
      { table_name: "profiles", column_name: "updated_at", column_default: "now()" },
      { table_name: "trusted_vehicles", column_name: "created_at", column_default: "now()" },
      { table_name: "trusted_vehicles", column_name: "id", column_default: "gen_random_uuid()" },
    ];

    expect(defaults.length).toBe(expectedDefaults.length);
    for (const exp of expectedDefaults) {
      const match = defaults.find((d) => d.table_name === exp.table_name && d.column_name === exp.column_name);
      expect(match, `Missing default on ${exp.table_name}.${exp.column_name}`).toBeDefined();
      expect(match!.column_default).toBe(exp.column_default);
    }

    // Explicitly verify profiles.gender has NO default
    const genderCol = await sql<{ column_default: string | null }[]>`
      select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'gender'
    `;
    expect(genderCol[0]?.column_default).toBeNull();
  }, DB_TIMEOUT_MS);

  it("behaviorally enforces auto_add_creator_to_loop_members trigger", async () => {
    const userId = "77777777-7777-7777-7777-777777777777";
    const loopId = "88888888-8888-8888-8888-888888888888";

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO auth.users (id, email)
        VALUES (${userId}, 'creator_auto@vitapstudent.ac.in')
        ON CONFLICT (id) DO NOTHING
      `;
      await tx`
        INSERT INTO public.profiles (id, display_name)
        VALUES (${userId}, 'Creator Auto')
        ON CONFLICT (id) DO NOTHING
      `;

      await tx`
        INSERT INTO public.loops (id, creator_id, destination, participants_limit, status, expires_at)
        VALUES (${loopId}, ${userId}, 'Airport Drop', 4, 'open', now() + interval '2 hours')
      `;

      const members = await tx<{ user_id: string; loop_id: string }[]>`
        SELECT user_id, loop_id FROM public.loop_members WHERE loop_id = ${loopId}
      `;
      expect(members.length).toBe(1);
      expect(members[0].user_id).toBe(userId);

      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);

  it("behaviorally enforces check_loop_capacity trigger (full loop, non-existent loop, ended ride)", async () => {
    const creatorId = "12121212-1212-1212-1212-121212121212";
    const memberId = "23232323-2323-2323-2323-232323232323";
    const loopId = "34343434-3434-3434-3434-343434343434";
    const closedLoopId = "35353535-3535-3535-3535-353535353535";
    const nonExistentLoopId = "99999999-9999-9999-9999-999999999999";

    await sql.begin(async (tx) => {
      await tx`INSERT INTO auth.users (id, email) VALUES (${creatorId}, 'cap_creator@vitapstudent.ac.in') ON CONFLICT (id) DO NOTHING`;
      await tx`INSERT INTO public.profiles (id, display_name) VALUES (${creatorId}, 'Cap Creator') ON CONFLICT (id) DO NOTHING`;
      await tx`INSERT INTO auth.users (id, email) VALUES (${memberId}, 'cap_member@vitapstudent.ac.in') ON CONFLICT (id) DO NOTHING`;
      await tx`INSERT INTO public.profiles (id, display_name) VALUES (${memberId}, 'Cap Member') ON CONFLICT (id) DO NOTHING`;

      // 1. Non-existent loop
      let notFoundErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`INSERT INTO public.loop_members (loop_id, user_id) VALUES (${nonExistentLoopId}, ${memberId})`;
        } catch (err: unknown) {
          notFoundErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(notFoundErrMsg).toMatch(/Ride loop not found/i);

      // 2. Ended / closed loop
      await tx`
        INSERT INTO public.loops (id, creator_id, destination, participants_limit, status, expires_at)
        VALUES (${closedLoopId}, ${creatorId}, 'Closed Campus', 4, 'open', now() + interval '2 hours')
      `;
      await tx`UPDATE public.loops SET status = 'completed' WHERE id = ${closedLoopId}`;
      let closedErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`INSERT INTO public.loop_members (loop_id, user_id) VALUES (${closedLoopId}, ${memberId})`;
        } catch (err: unknown) {
          closedErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(closedErrMsg).toMatch(/Cannot join a ride that has ended or is closed/i);

      // 3. Loop at full capacity
      await tx`
        INSERT INTO public.loops (id, creator_id, destination, participants_limit, status, expires_at)
        VALUES (${loopId}, ${creatorId}, 'Campus', 1, 'open', now() + interval '2 hours')
      `;
      let fullErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`INSERT INTO public.loop_members (loop_id, user_id) VALUES (${loopId}, ${memberId})`;
        } catch (err: unknown) {
          fullErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(fullErrMsg).toMatch(/This loop is already full/i);

      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);

  it("behaviorally enforces check_active_loops_quota trigger (capacity bounds, fare bounds, empty destination, max 5 active loops)", async () => {
    const creatorId = "45454545-4545-4545-4545-454545454545";

    await sql.begin(async (tx) => {
      await tx`INSERT INTO auth.users (id, email) VALUES (${creatorId}, 'quota_host@vitapstudent.ac.in') ON CONFLICT (id) DO NOTHING`;
      await tx`INSERT INTO public.profiles (id, display_name) VALUES (${creatorId}, 'Quota Host') ON CONFLICT (id) DO NOTHING`;

      // 1. Invalid capacity (< 1 or > 10)
      let capErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`
            INSERT INTO public.loops (creator_id, destination, participants_limit, status, expires_at)
            VALUES (${creatorId}, 'Station', 0, 'open', now() + interval '2 hours')
          `;
        } catch (err: unknown) {
          capErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(capErrMsg).toMatch(/Passenger capacity must be between 1 and 10/i);

      // 2. Empty destination
      let destErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`
            INSERT INTO public.loops (creator_id, destination, participants_limit, status, expires_at)
            VALUES (${creatorId}, '   ', 4, 'open', now() + interval '2 hours')
          `;
        } catch (err: unknown) {
          destErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(destErrMsg).toMatch(/Destination cannot be empty/i);

      // 3. Total fare bounds (< 0 or > 20000)
      let fareErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`
            INSERT INTO public.loops (creator_id, destination, participants_limit, total_fare, status, expires_at)
            VALUES (${creatorId}, 'Station', 4, 25000, 'open', now() + interval '2 hours')
          `;
        } catch (err: unknown) {
          fareErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(fareErrMsg).toMatch(/Total fare must be between 0 and 20000/i);

      // 4. Max 5 active rides per host quota
      // Insert 5 active loops (1 to 5)
      for (let i = 1; i <= 5; i++) {
        await tx`
          INSERT INTO public.loops (creator_id, destination, participants_limit, status, expires_at)
          VALUES (${creatorId}, ${'Destination ' + i}, 4, 'open', now() + interval '2 hours')
        `;
      }

      // Attempt to insert 6th active loop
      let quotaErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`
            INSERT INTO public.loops (creator_id, destination, participants_limit, status, expires_at)
            VALUES (${creatorId}, 'Destination 6', 4, 'open', now() + interval '2 hours')
          `;
        } catch (err: unknown) {
          quotaErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(quotaErrMsg).toMatch(/You cannot have more than 5 active rides at the same time/i);

      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);

  it("behaviorally enforces check_emergency_contacts_limit trigger", async () => {
    const userId = "56565656-5656-5656-5656-565656565656";

    await sql.begin(async (tx) => {
      await tx`INSERT INTO auth.users (id, email) VALUES (${userId}, 'emg_user@vitapstudent.ac.in') ON CONFLICT (id) DO NOTHING`;
      await tx`INSERT INTO public.profiles (id, display_name) VALUES (${userId}, 'Emergency Test User') ON CONFLICT (id) DO NOTHING`;

      // Insert 3 emergency contacts (the allowed limit)
      await tx`INSERT INTO public.emergency_contacts (user_id, name, phone, relation) VALUES (${userId}, 'Contact 1', '+919999900001', 'Parent')`;
      await tx`INSERT INTO public.emergency_contacts (user_id, name, phone, relation) VALUES (${userId}, 'Contact 2', '+919999900002', 'Parent')`;
      await tx`INSERT INTO public.emergency_contacts (user_id, name, phone, relation) VALUES (${userId}, 'Contact 3', '+919999900003', 'Parent')`;

      // Attempt to insert 4th contact
      let limitErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`INSERT INTO public.emergency_contacts (user_id, name, phone, relation) VALUES (${userId}, 'Contact 4', '+919999900004', 'Parent')`;
        } catch (err: unknown) {
          limitErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(limitErrMsg).toMatch(/A user cannot have more than 3 emergency contacts/i);

      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);

  it("behaviorally enforces protect_profile_updates trigger (locked student reg_no, locked female gender in female ride)", async () => {
    const userId = "67676767-6767-6767-6767-676767676767";
    const femaleUserId = "78787878-7878-7878-7878-787878787878";
    const femaleLoopId = "89898989-8989-8989-8989-898989898989";

    await sql.begin(async (tx) => {
      // 1. Locked verified student reg_no
      await tx`INSERT INTO auth.users (id, email) VALUES (${userId}, 'student_verified@vitapstudent.ac.in') ON CONFLICT (id) DO NOTHING`;
      await tx`
        INSERT INTO public.profiles (id, display_name, reg_no, is_student_verified)
        VALUES (${userId}, 'Verified Student', '21BCE1001', true)
        ON CONFLICT (id) DO NOTHING
      `;

      let regErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`UPDATE public.profiles SET reg_no = '21BCE9999' WHERE id = ${userId}`;
        } catch (err: unknown) {
          regErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(regErrMsg).toMatch(/Verified student registration numbers cannot be modified/i);

      // 2. Cannot change gender away from female while participating/hosting female-only ride
      await tx`INSERT INTO auth.users (id, email) VALUES (${femaleUserId}, 'female_host@vitapstudent.ac.in') ON CONFLICT (id) DO NOTHING`;
      await tx`
        INSERT INTO public.profiles (id, display_name, gender)
        VALUES (${femaleUserId}, 'Female Host', 'female')
        ON CONFLICT (id) DO NOTHING
      `;

      await tx`
        INSERT INTO public.loops (id, creator_id, destination, participants_limit, is_female_only, status, expires_at)
        VALUES (${femaleLoopId}, ${femaleUserId}, 'Mall', 3, true, 'open', now() + interval '2 hours')
      `;

      let genderErrMsg = "";
      await tx.savepoint(async (sp) => {
        try {
          await sp`UPDATE public.profiles SET gender = 'male' WHERE id = ${femaleUserId}`;
        } catch (err: unknown) {
          genderErrMsg = (err as Error).message;
          throw err;
        }
      }).catch(() => {});
      expect(genderErrMsg).toMatch(/Cannot change gender while actively hosting or participating in a female-only ride/i);

      throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
    }).catch((err) => {
      if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
    });
  }, DB_TIMEOUT_MS);
});


