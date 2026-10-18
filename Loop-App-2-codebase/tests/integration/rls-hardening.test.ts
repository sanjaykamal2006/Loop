import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

/**
 * Live-database contract tests for the 20261020 visibility hardening:
 *
 *   1. profiles  — a stranger can no longer dump every profile row; only
 *      self, co-riders, and ride hosts are visible.
 *   2. trusted_vehicles — private driver book is owner-only.
 *   3. expected_fares — owner-only rows, with the community board served by
 *      the get_expected_fares() RPC (safe columns only, authenticated only).
 *   4. loops(departure_time) partial index exists for the home feed.
 *
 * All mutations happen inside a transaction that is always rolled back.
 * Skipped automatically when TEST_DATABASE_URL is not set (local dev).
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const hasDb = Boolean(TEST_DATABASE_URL);

describe.skipIf(!hasDb)("RLS visibility hardening (20261020)", () => {
  let sql: postgres.Sql;
  const DB_TIMEOUT_MS = 30_000;

  const strangerA = "a1111111-1111-1111-1111-111111111111";
  const hostB = "b2222222-2222-2222-2222-222222222222";
  const riderC = "c3333333-3333-3333-3333-333333333333";
  const loopId = "d4444444-4444-4444-4444-444444444444";

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

  it("seeds a stranger, a host, and a co-rider and impersonates each", async () => {
    await sql
      .begin(async (tx) => {
        // Seeds run as the connection owner (bypasses RLS), like the existing
        // db-contract suite.
        await tx`
          INSERT INTO auth.users (id, email)
          VALUES
            (${strangerA}, 'stranger_a@vitapstudent.ac.in'),
            (${hostB}, 'host_b@vitapstudent.ac.in'),
            (${riderC}, 'rider_c@vitapstudent.ac.in')
          ON CONFLICT (id) DO NOTHING
        `;
        await tx`
          INSERT INTO public.profiles (id, display_name, gender, reg_no)
          VALUES
            (${strangerA}, 'Stranger A', 'male', 'STRANGER-001'),
            (${hostB}, 'Host B', 'male', 'HOST-001'),
            (${riderC}, 'Rider C', 'female', 'RIDER-001')
          ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
        `;
        await tx`
          INSERT INTO public.loops (id, creator_id, destination, participants_limit, status, gender_preference, expires_at, departure_time)
          VALUES (${loopId}, ${hostB}, 'Vijayawada Station', 4, 'open', 'any', now() + interval '2 hours', now() + interval '1 hour')
          ON CONFLICT (id) DO NOTHING
        `;
        await tx`
          INSERT INTO public.loop_members (loop_id, user_id)
          VALUES (${loopId}, ${hostB}), (${loopId}, ${riderC})
          ON CONFLICT DO NOTHING
        `;
        await tx`
          INSERT INTO public.trusted_vehicles (user_id, driver_name, phone_number, vehicle_type)
          VALUES (${hostB}, 'Host B Private Driver', '9999900001', 'auto')
        `;
        await tx`
          INSERT INTO public.expected_fares (user_id, from_location, to_location, expected_fare, vehicle_type)
          VALUES (${hostB}, 'Campus', 'Station', 120, 'auto')
        `;

        const impersonate = async (userId: string) => {
          await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
          await tx`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`;
          await tx`SELECT set_config('request.jwt.claims', json_build_object('sub', ${userId}::text, 'role', 'authenticated')::text, true)`;
        };

        // --- Stranger A -----------------------------------------------------
        await impersonate(strangerA);
        await tx`SET LOCAL ROLE authenticated`;

        // Sees exactly two profiles: self + the public ride host. The rider
        // (a co-member the stranger shares no loop with) must stay hidden.
        // Targeted visibility checks (robust even if the test DB already
        // contains rows from other suites): the public ride host must be
        // visible, the co-rider the stranger shares no loop with must not.
        const strangerSeesHost = await tx<{ c: number }[]>`
          SELECT count(*)::int AS c FROM public.profiles WHERE id = ${hostB}
        `;
        expect(strangerSeesHost[0].c).toBe(1);

        const strangerSeesRider = await tx<{ c: number }[]>`
          SELECT count(*)::int AS c FROM public.profiles WHERE id = ${riderC}
        `;
        expect(strangerSeesRider[0].c).toBe(0);

        // Co-member sanity: Rider C is a member of the same loop, so the host
        // can still see the rider (and vice versa).
        await tx`SELECT set_config('request.jwt.claim.sub', ${riderC}, true)`;
        const riderSeesHost = await tx<{ c: number }[]>`
          SELECT count(*)::int AS c FROM public.profiles WHERE id = ${hostB}
        `;
        expect(riderSeesHost[0].c).toBe(1);

        // --- trusted_vehicles ------------------------------------------------
        await tx`SELECT set_config('request.jwt.claim.sub', ${strangerA}, true)`;
        const strangerSeesVehicles = await tx<{ c: number }[]>`
          SELECT count(*)::int AS c FROM public.trusted_vehicles WHERE user_id = ${hostB}
        `;
        expect(strangerSeesVehicles[0].c).toBe(0);

        await tx`SELECT set_config('request.jwt.claim.sub', ${hostB}, true)`;
        const hostVehicles = await tx<{ c: number }[]>`
          SELECT count(*)::int AS c FROM public.trusted_vehicles WHERE user_id = ${hostB}
        `;
        expect(hostVehicles[0].c).toBe(1);

        // --- expected_fares ---------------------------------------------------
        await tx`SELECT set_config('request.jwt.claim.sub', ${strangerA}, true)`;
        const strangerSeesFares = await tx<{ c: number }[]>`
          SELECT count(*)::int AS c FROM public.expected_fares WHERE user_id = ${hostB}
        `;
        expect(strangerSeesFares[0].c).toBe(0);

        // The community board RPC still returns the host's fare with safe
        // display fields even though the table row is owner-only.
        const board = await tx<{ display_name: string | null; expected_fare: number }[]>`
          SELECT display_name, expected_fare FROM public.get_expected_fares() WHERE user_id = ${hostB}
        `;
        expect(board.length).toBe(1);
        expect(board[0].display_name).toBe("Host B");
        expect(Number(board[0].expected_fare)).toBe(120);

        throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
      })
      .catch((err) => {
        if (err.message !== "ROLLBACK_FOR_TEST_ISOLATION") throw err;
      });
  }, DB_TIMEOUT_MS);

  it("grants and schema invariants for the new RPC, helper, and index", async () => {
    const [rpcPrivs] = await sql<
      { anon_exec: boolean; auth_exec: boolean }[]
    >`
      SELECT
        has_function_privilege('anon', 'public.get_expected_fares()', 'execute') AS anon_exec,
        has_function_privilege('authenticated', 'public.get_expected_fares()', 'execute') AS auth_exec
    `;
    expect(rpcPrivs.anon_exec).toBe(false);
    expect(rpcPrivs.auth_exec).toBe(true);

    const [helperPrivs] = await sql<
      { anon_exec: boolean; auth_exec: boolean }[]
    >`
      SELECT
        has_function_privilege('anon', 'public.can_view_profile(uuid)', 'execute') AS anon_exec,
        has_function_privilege('authenticated', 'public.can_view_profile(uuid)', 'execute') AS auth_exec
    `;
    expect(helperPrivs.anon_exec).toBe(false);
    expect(helperPrivs.auth_exec).toBe(true);

    const [fnInfo] = await sql<{ prosecdef: boolean; proconfig: string[] | null }[]>`
      SELECT prosecdef, proconfig FROM pg_proc WHERE proname = 'can_view_profile' LIMIT 1
    `;
    expect(fnInfo.prosecdef).toBe(true);
    expect((fnInfo.proconfig ?? []).join(",")).toContain("search_path");

    const indexes = await sql<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'loops' AND indexname = 'idx_loops_departure_time_active'
    `;
    expect(indexes.length).toBe(1);
  }, DB_TIMEOUT_MS);
});
