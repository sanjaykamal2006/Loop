import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Verify user identity using user token
    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 2. Service role admin client to perform safe account decommissioning
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Inspect all rides hosted by this user
    const { data: hostedLoops } = await adminClient
      .from("loops")
      .select("id, status")
      .eq("creator_id", userId);

    if (hostedLoops && hostedLoops.length > 0) {
      for (const loop of hostedLoops) {
        // Check if there are other passengers in this ride
        const { data: otherMembers } = await adminClient
          .from("loop_members")
          .select("user_id")
          .eq("loop_id", loop.id)
          .neq("user_id", userId);

        const hasOtherPassengers = Boolean(otherMembers && otherMembers.length > 0);

        if (hasOtherPassengers) {
          // If the ride is active, mark it cancelled so co-riders are not left in limbo
          const isActive = ["open", "started", "active", "in_progress"].includes(loop.status);
          if (isActive) {
            await adminClient
              .from("loops")
              .update({ status: "cancelled", creator_id: null })
              .eq("id", loop.id);

            // Inform passengers via chat
            await adminClient.from("messages").insert({
              loop_id: loop.id,
              user_id: userId,
              content: "[Notice] The ride host's account was closed. This ride has been cancelled.",
            });
          } else {
            // Already ended or cancelled: detach creator to avoid cascade deletion
            await adminClient
              .from("loops")
              .update({ creator_id: null })
              .eq("id", loop.id);
          }
        } else {
          // Empty or solo ride: safe to delete
          await adminClient.from("loops").delete().eq("id", loop.id);
        }
      }
    }

    // 4. Remove user from rides they joined as passenger
    await adminClient.from("loop_members").delete().eq("user_id", userId);

    // 5. Clean up personal user data
    await adminClient.from("emergency_contacts").delete().eq("user_id", userId);
    await adminClient.from("profile_contacts").delete().eq("user_id", userId);
    await adminClient.from("trusted_vehicles").delete().eq("user_id", userId);
    await adminClient.from("expected_fares").delete().eq("user_id", userId);

    // 6. Delete user profile and Auth record
    await adminClient.from("profiles").delete().eq("id", userId);
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to delete auth user:", deleteAuthError);
      }
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Account delete error:", err?.message || "Unknown error");
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
