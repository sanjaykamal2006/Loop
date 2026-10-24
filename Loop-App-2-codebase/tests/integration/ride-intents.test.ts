import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

/**
 * Live-database contract tests for 20261026 "Ride Wanted" demand aggregation board:
 *
 *   1. ride_intents table: owner-only RLS. A user can only read and mutate their
 *      own rows. Anonymous callers have zero table privileges.
 *   2. get_ride_intent_board() RPC:
 *      - Privacy invariant: never selects or exposes user_id.
 *      - Visibility invariant: groups with intent_count < 2 are visible only to
 *        their own member — the caller's solo row shows (intent_count = 1,
 *        has_mine = true) while strangers see nothing until a 2nd joins.
 *      - Aggregation: groups with >= 2 rows return correct intent_count and has_mine.
 *      - Expiry invariant: rows where expires_at < now() are excluded.
 *   3. post_ride_intent() RPC:
 *      - Derives user_id securely from auth context (never supplied by client).
 *      - Deduplicates via UNIQUE constraint (on conflict do nothing).
 *      - Normalizes destination_key (lowercase trimmed).
 *      - Rejects unauthenticated callers and handles empty input cleanly.
 *   4. Least privilege: anon denied table and both RPCs; authenticated granted.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const hasDb = Boolean(TEST_DATABASE_URL);

describe.skipIf(!hasDb)("ride intents demand board (20261026)", () => {
  let sql: postgres.Sql;

  const userA = "a2111111-2111-2111-2111-211111111111";
  const userB = "b2222222-2222-2222-2222-222222222222";
  const userC = "c3333333-3333-3333-3333-333333333333";
  const strangerD = "d4444444-4444-4444-4444-444444444444";

  beforeAll(() => {
    const isLocal = /localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL as string);
    sql = postgres(TEST_DATABASE_URL as string, {
      max: 1,
      prepare: false,
      ssl: isLocal ? false : "require",
      connect_timeout: 20,
    });
  });

  afterAll(async () => {
    await sql?.end({ timeout: 5 });
  });

  it("seeds, impersonates callers, and verifies complete ride intents invariants", async () => {
    try {
      await sql.begin(async (tx) => {
        // 1. Seed auth users and profiles
        await tx`
          INSERT INTO auth.users (id, email)
          VALUES
            (${userA}, 'usera_wants@vitapstudent.ac.in'),
            (${userB}, 'userb_wants@vitapstudent.ac.in'),
            (${userC}, 'userc_wants@vitapstudent.ac.in'),
            (${strangerD}, 'strangerd_wants@vitapstudent.ac.in')
          ON CONFLICT (id) DO NOTHING
        `;
        await tx`
          INSERT INTO public.profiles (id, display_name, gender, reg_no)
          VALUES
            (${userA}, 'User A', 'male', 'WANT-A'),
            (${userB}, 'User B', 'female', 'WANT-B'),
            (${userC}, 'User C', 'female', 'WANT-C'),
            (${strangerD}, 'Stranger D', 'male', 'STRANGER-D')
          ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
        `;

        const impersonate = async (userId: string) => {
          await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
          await tx`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`;
          await tx`SELECT set_config('request.jwt.claims', json_build_object('sub', ${userId}::text, 'role', 'authenticated')::text, true)`;
          await tx`SET LOCAL ROLE authenticated`;
        };

        const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];

        // --- Invariant 1: Table RLS owner-isolation ---
        await impersonate(userA);
        await tx`
          INSERT INTO public.ride_intents (user_id, destination_key, depart_date, note, expires_at)
          VALUES (${userA}, 'vijayawada', ${futureDate}::date, 'Need to catch train', now() + interval '5 days')
        `;
        const userARows = await tx`SELECT user_id, destination_key FROM public.ride_intents`;
        expect(userARows).toHaveLength(1);
        expect(userARows[0].user_id).toBe(userA);

        // Stranger cannot see User A's row
        await impersonate(strangerD);
        const strangerRows = await tx`SELECT * FROM public.ride_intents`;
        expect(strangerRows).toHaveLength(0);

        // Stranger cannot write with User A's id (WITH CHECK rejects)
        await tx`SAVEPOINT foreign_intent_insert`;
        try {
          await tx`
            INSERT INTO public.ride_intents (user_id, destination_key, depart_date, note, expires_at)
            VALUES (${userA}, 'guntur', ${futureDate}::date, 'fake', now() + interval '5 days')
          `;
          throw new Error("__with_check_allowed__");
        } catch (err) {
          await tx`ROLLBACK TO SAVEPOINT foreign_intent_insert`;
          if (err instanceof Error && err.message === "__with_check_allowed__") {
            throw new Error("RLS check failed: stranger inserted row under userA user_id");
          }
        }

        // --- Invariant 2: Solo groups are visible only to their own member ---
        // Only User A posted for 'vijayawada' on futureDate -> count = 1.
        // A stranger's board shows nothing, but User A's own board shows the
        // live solo row ("just you so far": intent_count = 1, has_mine = true).
        const boardForStrangerSolo = await tx`SELECT * FROM public.get_ride_intent_board()`;
        expect(boardForStrangerSolo).toHaveLength(0);

        await impersonate(userA);
        const boardForOwnSolo = await tx`SELECT * FROM public.get_ride_intent_board()`;
        expect(boardForOwnSolo).toHaveLength(1);
        expect(boardForOwnSolo[0].destination_key).toBe("vijayawada");
        expect(boardForOwnSolo[0].intent_count).toBe(1);
        expect(boardForOwnSolo[0].has_mine).toBe(true);

        // --- Invariant 3: Destination normalization + On-conflict deduplication ---
        await impersonate(userB);
        // Post with mixed casing and spaces (with a rough departure time)
        const countB = await tx`
          SELECT public.post_ride_intent('  Vijayawada  ', ${futureDate}::date, 'Me too', '18:30') AS c
        `;
        expect(Number(countB[0].c)).toBe(2);

        // Posting duplicate intent for same user+dest+date is deduplicated
        const countBDup = await tx`
          SELECT public.post_ride_intent('vijayawada', ${futureDate}::date, 'Duplicate ping', '19:00') AS c
        `;
        expect(Number(countBDup[0].c)).toBe(2);

        // --- Invariant 4: Board aggregation >= 2 & Privacy invariant ---
        // User B calls board: should see 1 row with intent_count = 2, has_mine = true
        const boardForB = await tx`SELECT * FROM public.get_ride_intent_board()`;
        expect(boardForB).toHaveLength(1);
        expect(boardForB[0].destination_key).toBe("vijayawada");
        expect(boardForB[0].intent_count).toBe(2);
        expect(boardForB[0].has_mine).toBe(true);
        // Verify user_id is NOT a key on the returned row
        expect(boardForB[0]).not.toHaveProperty("user_id");
        // Stranger calls board: should see the same row, but has_mine = false
        await impersonate(strangerD);
        const boardForStranger = await tx`SELECT * FROM public.get_ride_intent_board()`;
        expect(boardForStranger).toHaveLength(1);
        expect(boardForStranger[0].has_mine).toBe(false);

        // User C joins -> count reaches 3 (earlier time so first_depart_time = min)
        await impersonate(userC);
        const countC = await tx`
          SELECT public.post_ride_intent('vijayawada', ${futureDate}::date, NULL, '18:05') AS c
        `;
        expect(Number(countC[0].c)).toBe(3);

        // --- Invariant 5: Empty destination reject ---
        const emptyResult = await tx`
          SELECT public.post_ride_intent('   ', ${futureDate}::date, NULL) AS c
        `;
        expect(Number(emptyResult[0].c)).toBe(0);

        // --- Invariant 5b: Invalid time format is rejected loudly ---
        await tx`SAVEPOINT invalid_time_intent`;
        let invalidTimeRejected = false;
        try {
          await tx`
            SELECT public.post_ride_intent('vijayawada', ${futureDate}::date, NULL, 'tomorrow evening') AS c
          `;
        } catch (err) {
          invalidTimeRejected = /Invalid time format/i.test(String((err as Error)?.message));
        } finally {
          await tx`ROLLBACK TO SAVEPOINT invalid_time_intent`;
        }
        expect(invalidTimeRejected).toBe(true);
        // The board still reflects the pre-probe state (3 intents) after rollback
        const boardAfterProbe = await tx`SELECT * FROM public.get_ride_intent_board()`;
        expect(boardAfterProbe).toHaveLength(1);
        expect(boardAfterProbe[0].intent_count).toBe(3);
        // first_depart_time = earliest time mentioned in the group (18:05 vs 18:30)
        expect(boardAfterProbe[0].first_depart_time).toBe("18:05:00");

        // --- Invariant 6: Expiry filter ---
        // Insert expired intent rows manually (depart_date in the past).
        // RLS WITH CHECK only allows direct inserts where user_id = caller,
        // so each seeded row must be written under that user's session.
        await impersonate(userA);
        await tx`
          INSERT INTO public.ride_intents (user_id, destination_key, depart_date, expires_at)
          VALUES (${userA}, 'chennai', '2020-01-01'::date, now() - interval '1 day')
          ON CONFLICT DO NOTHING
        `;
        await impersonate(userB);
        await tx`
          INSERT INTO public.ride_intents (user_id, destination_key, depart_date, expires_at)
          VALUES (${userB}, 'chennai', '2020-01-01'::date, now() - interval '1 day')
          ON CONFLICT DO NOTHING
        `;
        // Board must NOT include 'chennai' because expires_at < now()
        const boardWithoutExpired = await tx`
          SELECT * FROM public.get_ride_intent_board() WHERE destination_key = 'chennai'
        `;
        expect(boardWithoutExpired).toHaveLength(0);

        throw new Error("__always_rollback__");
      });
    } catch (err) {
      if (!(err instanceof Error && /__always_rollback__/.test(err.message))) throw err;
    }
  });

  it("denies the table and both RPCs to anonymous callers", async () => {
    const granted = await sql<{ anon_table: boolean; anon_board: boolean; anon_post: boolean }[]>`
      SELECT
        has_table_privilege('anon', 'public.ride_intents', 'SELECT') AS anon_table,
        has_function_privilege('anon', 'public.get_ride_intent_board()', 'EXECUTE') AS anon_board,
        has_function_privilege('anon', 'public.post_ride_intent(text, date, text, text)', 'EXECUTE') AS anon_post
    `;
    expect(granted[0].anon_table).toBe(false);
    expect(granted[0].anon_board).toBe(false);
    expect(granted[0].anon_post).toBe(false);
  });

  it("grants table CRUD and both RPCs to authenticated callers", async () => {
    const granted = await sql<{
      authed_sel: boolean;
      authed_ins: boolean;
      authed_board: boolean;
      authed_post: boolean;
    }[]>`
      SELECT
        has_table_privilege('authenticated', 'public.ride_intents', 'SELECT') AS authed_sel,
        has_table_privilege('authenticated', 'public.ride_intents', 'INSERT') AS authed_ins,
        has_function_privilege('authenticated', 'public.get_ride_intent_board()', 'EXECUTE') AS authed_board,
        has_function_privilege('authenticated', 'public.post_ride_intent(text, date, text, text)', 'EXECUTE') AS authed_post
    `;
    expect(granted[0].authed_sel).toBe(true);
    expect(granted[0].authed_ins).toBe(true);
    expect(granted[0].authed_board).toBe(true);
    expect(granted[0].authed_post).toBe(true);
  });
});
