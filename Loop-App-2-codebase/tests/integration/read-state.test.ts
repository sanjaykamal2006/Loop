import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

/**
 * Live-database contract tests for the 20261025 server-side chat read state:
 *
 *   1. chat_read_state — owner-only RLS: read your own rows, upsert your own
 *      user_id only; nobody else's rows are visible; anon has no grants.
 *   2. get_unread_loop_ids() mirrors the client badge rules exactly:
 *        - participant loops only (member or creator),
 *        - still reachable: status open/started/active/in_progress, departure
 *          no older than 2h, not expired,
 *        - unread ⇐ ≥1 message by someone else (or a NULL-user system notice)
 *          newer than last_read_at; own messages never count,
 *        - NO creator bypass: a fully-read ride drops out of the badge set.
 *   3. Least privilege — the RPC executes only for authenticated callers.
 *
 * Seeds run as the connection owner; probes impersonate users inside a
 * transaction that is always rolled back (same harness as rls-hardening).
 * Requires TEST_DATABASE_URL (the local PG17 pipeline / CI sets it).
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const hasDb = Boolean(TEST_DATABASE_URL);

describe.skipIf(!hasDb)("server read state (20261025)", () => {
  let sql: postgres.Sql;

  const hostB = "b5222222-2222-2222-2222-222222222222"; // creator of the live loop
  const riderC = "c3333333-3333-3333-3333-333333333335"; // co-rider, writes messages
  const strangerA = "a5111111-1111-1111-1111-111111111111"; // in no loops at all
  const liveLoop = "d5444444-4444-4444-4444-444444444444";
  const otherLoop = "e5555555-5555-5555-5555-555555555556"; // riderC's loop; host not a member

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

  it("seeds, impersonates each participant, and locks down the whole contract", async () => {
    try {
      await sql.begin(async (tx) => {
        await tx`
          INSERT INTO auth.users (id, email)
          VALUES
            (${hostB}, 'host_b@vitapstudent.ac.in'),
            (${riderC}, 'rider_c@vitapstudent.ac.in'),
            (${strangerA}, 'stranger_a@vitapstudent.ac.in')
          ON CONFLICT (id) DO NOTHING
        `;
        await tx`
          INSERT INTO public.profiles (id, display_name, gender, reg_no)
          VALUES
            (${hostB}, 'Host B', 'male', 'HOST-001'),
            (${riderC}, 'Rider C', 'female', 'RIDER-001'),
            (${strangerA}, 'Stranger A', 'male', 'STRANGER-001')
          ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
        `;
        // live loop: host = creator, riderC = member. other loop: riderC's own
        // ride (created by trigger membership), the host is not a member.
        await tx`
          INSERT INTO public.loops (id, creator_id, destination, participants_limit, status, gender_preference, expires_at, departure_time)
          VALUES
            (${liveLoop},  ${hostB},  'Vijayawada Station', 4, 'open', 'any', now() + interval '2 hours', now() + interval '1 hour'),
            (${otherLoop}, ${riderC}, 'Benz Circle',        4, 'open', 'any', now() + interval '2 hours', now() + interval '1 hour')
          ON CONFLICT (id) DO NOTHING
        `;
        await tx`
          INSERT INTO public.loop_members (loop_id, user_id)
          VALUES (${liveLoop}, ${hostB}), (${liveLoop}, ${riderC})
          ON CONFLICT DO NOTHING
        `;
        // Message fixtures: the host's badge should react only to other-people
        // activity inside the loops they belong to.
        await tx`
          INSERT INTO public.messages (loop_id, user_id, content, created_at)
          VALUES
            (${liveLoop},  ${riderC}, 'old message',   now() - interval '90 minutes'),
            (${liveLoop},  ${riderC}, 'fresh message', now() - interval '5 minutes'),
            (${liveLoop},  NULL,      'system: Rider C joined', now() - interval '4 minutes'),
            (${otherLoop}, NULL,      'system chatter elsewhere', now() - interval '1 minute')
          ON CONFLICT DO NOTHING
        `;

        const impersonate = async (userId: string) => {
          await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
          await tx`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`;
          await tx`SELECT set_config('request.jwt.claims', json_build_object('sub', ${userId}::text, 'role', 'authenticated')::text, true)`;
          await tx`SET LOCAL ROLE authenticated`;
        };

        // --- chat_read_state RLS -------------------------------------------
        await impersonate(hostB);
        await tx`
          INSERT INTO public.chat_read_state (user_id, loop_id, last_read_at)
          VALUES (${hostB}, ${liveLoop}, now() - interval '6 minutes')
          ON CONFLICT (user_id, loop_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at
        `;
        const hostRows = await tx`SELECT user_id, loop_id FROM public.chat_read_state`;
        expect(hostRows).toHaveLength(1); // sees exactly its own mark
        expect(hostRows[0].user_id).toBe(hostB);
        expect(hostRows[0].loop_id).toBe(liveLoop);

        // A stranger cannot read anyone else's read marks.
        await impersonate(strangerA);
        const strangerRows = await tx`SELECT * FROM public.chat_read_state`;
        expect(strangerRows).toHaveLength(0);

        // ...nor write under another user_id (WITH CHECK rejects it).
        await tx`SAVEPOINT foreign_insert_attempt`;
        try {
          await tx`
            INSERT INTO public.chat_read_state (user_id, loop_id, last_read_at)
            VALUES (${hostB}, ${liveLoop}, now())
          `;
          throw new Error("__with_check_allowed__");
        } catch (err) {
          await tx`ROLLBACK TO SAVEPOINT foreign_insert_attempt`;
          if (err instanceof Error && err.message === "__with_check_allowed__") {
            throw new Error("RLS with check failed: stranger inserted a host-owned read row");
          }
        }
        expect(true).toBe(true); // rejection surfaced, tx reusable afterwards

        // --- get_unread_loop_ids(): the host's badge set --------------------
        await impersonate(hostB);
        const hostUnread: { loop_id: string }[] = await tx`
          SELECT loop_id FROM get_unread_loop_ids()
        `;
        // liveLoop has riderC's 5-minute message + a 4-minute system notice,
        // both after the 6-minute read mark. otherLoop chatter is invisible:
        // the host is not a member or creator there.
        expect(hostUnread.map((r) => r.loop_id)).toEqual([liveLoop]);

        // Own messages never count: write one very fresh host message —
        // does not add unread state beyond what riderC already caused.
        await tx`
          INSERT INTO public.messages (loop_id, user_id, content, created_at)
          VALUES (${liveLoop}, ${hostB}, 'my own note', now())
        `;
        const hostUnreadStill: { loop_id: string }[] = await tx`
          SELECT loop_id FROM get_unread_loop_ids()
        `;
        expect(hostUnreadStill.map((r) => r.loop_id)).toEqual([liveLoop]);

        // Reading the loop clears the badge — even for the ride creator
        // (regression lock: no creator bypass in the RPC).
        await tx`
          INSERT INTO public.chat_read_state (user_id, loop_id, last_read_at)
          VALUES (${hostB}, ${liveLoop}, now())
          ON CONFLICT (user_id, loop_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at
        `;
        const hostReadUp: { loop_id: string }[] = await tx`
          SELECT loop_id FROM get_unread_loop_ids()
        `;
        expect(hostReadUp).toHaveLength(0);

        // An older mark re-raises the badge once newer activity lands.
        // riderC posts again "now" (after the just-written read mark).
        await impersonate(riderC);
        await tx`
          INSERT INTO public.messages (loop_id, user_id, content, created_at)
          VALUES (${liveLoop}, ${riderC}, 'another ping', now())
        `;
        await impersonate(hostB);
        await tx`
          UPDATE public.chat_read_state SET last_read_at = now() - interval '1 minute'
          WHERE user_id = ${hostB} AND loop_id = ${liveLoop}
        `;
        const hostUnreadAgain: { loop_id: string }[] = await tx`
          SELECT loop_id FROM get_unread_loop_ids()
        `;
        expect(hostUnreadAgain.map((r) => r.loop_id)).toEqual([liveLoop]);

        // riderC's own badge: liveLoop (host's 'my own note' is newer than
        // riderC's absent read mark) — creator_id-based membership works even
        // without a member row for otherLoop's system notice... riderC IS the
        // creator there.
        await impersonate(riderC);
        const riderUnread: { loop_id: string }[] = await tx`
          SELECT loop_id FROM get_unread_loop_ids()
        `;
        // host's 'my own note' + 'another ping' (own — excluded) → liveLoop
        // unread via the host's note. otherLoop: NULL-user system notice is
        // authored by nobody ≠ riderC and is newer than -infinity → unread.
        expect(riderUnread.map((r) => r.loop_id).sort()).toEqual([liveLoop, otherLoop].sort());

        // A stranger's badge set is empty regardless of other people's chats.
        await impersonate(strangerA);
        const strangerUnread: { loop_id: string }[] = await tx`
          SELECT loop_id FROM get_unread_loop_ids()
        `;
        expect(strangerUnread).toHaveLength(0);

        throw new Error("__always_rollback__");
      });
    } catch (err) {
      if (!(err instanceof Error && /__always_rollback__/.test(err.message))) throw err;
    }
  });

  it("denies the table and RPC grants to anonymous callers", async () => {
    const granted = await sql<{ anon_table: boolean; anon_rpc: boolean }[]>`
      SELECT
        has_table_privilege('anon', 'public.chat_read_state', 'SELECT') AS anon_table,
        has_function_privilege('anon', 'public.get_unread_loop_ids()', 'EXECUTE') AS anon_rpc
    `;
    expect(granted[0].anon_table).toBe(false);
    expect(granted[0].anon_rpc).toBe(false);
  });

  it("grants the table and RPC to authenticated callers", async () => {
    const granted = await sql<{ authed_table: boolean; authed_rpc: boolean }[]>`
      SELECT
        has_table_privilege('authenticated', 'public.chat_read_state', 'INSERT') AS authed_table,
        has_function_privilege('authenticated', 'public.get_unread_loop_ids()', 'EXECUTE') AS authed_rpc
    `;
    expect(granted[0].authed_table).toBe(true);
    expect(granted[0].authed_rpc).toBe(true);
  });
});
