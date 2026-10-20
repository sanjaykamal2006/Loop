import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Unable to delete the account right now. Please try again later.";

type DbResult = { error: { message: string } | null };

/**
 * Fail-closed guard for every admin query in this route.
 *
 * A silent failure mid-deletion (for example failing to load the user's rides)
 * previously fell through and continued deleting rows, which could orphan
 * rides or leave a half-deleted account. Any error aborts the whole operation;
 * the internal message is logged, never returned to the caller.
 */
function assertOk(result: DbResult, step: string): void {
  if (result.error) {
    logger.error(`Account delete failed at step "${step}":`, result.error.message);
    throw new Error(`account-delete:${step}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey || !supabaseUrl || !supabaseAnonKey) {
      logger.error("Account delete: server configuration is incomplete");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Verify user identity using the caller's own access token
    const userClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 2. Destructive endpoint: throttle per account (5 attempts / hour)
    const rateLimit = await checkRateLimit(`account-delete:${userId}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many deletion attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetInSeconds) } }
      );
    }

    // 3. Service-role admin client to perform account decommissioning
    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4. Inspect all rides hosted by this user. If this fails we abort before
    //    touching anything: deleting the profile while rides still reference
    //    the creator would orphan them.
    const hostedLoopsRes = await adminClient
      .from("loops")
      .select("id, status")
      .eq("creator_id", userId);
    assertOk(hostedLoopsRes, "load hosted loops");
    const hostedLoops = hostedLoopsRes.data ?? [];

    for (const loop of hostedLoops) {
      const otherMembersRes = await adminClient
        .from("loop_members")
        .select("user_id")
        .eq("loop_id", loop.id)
        .neq("user_id", userId);
      assertOk(otherMembersRes, "load loop members");
      const hasOtherPassengers = (otherMembersRes.data?.length ?? 0) > 0;

      const isActive = Boolean(
        loop.status && ["open", "started", "active", "in_progress"].includes(loop.status)
      );

      if (hasOtherPassengers && isActive) {
        // Never hard-delete a ride that still has passengers: cancel and
        // detach the creator so co-riders keep their history and no messages
        // are cascade-deleted, then leave a notice in the ride chat.
        assertOk(
          await adminClient
            .from("loops")
            .update({ status: "cancelled", creator_id: null })
            .eq("id", loop.id),
          "cancel shared loop"
        );
        assertOk(
          await adminClient.from("messages").insert({
            loop_id: loop.id,
            user_id: null,
            content: "[Notice] The ride host's account was closed. This ride has been cancelled.",
          }),
          "insert cancellation notice"
        );
      } else {
        // Shared-but-finished rides, and solo/empty rides: detach the creator
        // and mark an active ride cancelled. Rows are never hard-deleted here;
        // scheduled maintenance (purge_old_data) removes old rides later.
        assertOk(
          await adminClient
            .from("loops")
            .update({ status: isActive ? "cancelled" : loop.status, creator_id: null })
            .eq("id", loop.id),
          "detach loop"
        );
      }
    }

    // 5. Remove the user from rides joined as a passenger, then all personal data
    assertOk(await adminClient.from("loop_members").delete().eq("user_id", userId), "remove memberships");
    assertOk(await adminClient.from("loop_participants").delete().eq("user_id", userId), "remove participations");
    assertOk(await adminClient.from("emergency_contacts").delete().eq("user_id", userId), "remove emergency contacts");
    assertOk(await adminClient.from("profile_contacts").delete().eq("user_id", userId), "remove profile contacts");
    assertOk(await adminClient.from("trusted_vehicles").delete().eq("user_id", userId), "remove trusted vehicles");
    assertOk(await adminClient.from("expected_fares").delete().eq("user_id", userId), "remove expected fares");

    // 5b. True erasure: scrub storage avatars and chat message content so the
    //     privacy page's "erase profile, memberships, chat messages" holds.
    assertOk(await adminClient.rpc("tools_delete_user_assets", { p_user_id: userId }), "scrub user assets");

    // 6. Delete the profile, then the auth record last so a failed run can
    //    always be retried by the user.
    assertOk(await adminClient.from("profiles").delete().eq("id", userId), "delete profile");

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    const authErrorStatus = (deleteAuthError as { status?: number } | null)?.status;
    if (deleteAuthError && authErrorStatus !== 404) {
      logger.error('Account delete failed at step "delete auth user":', deleteAuthError.message);
      throw new Error("account-delete:delete-auth-user");
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (err: unknown) {
    logger.error("Account delete error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
