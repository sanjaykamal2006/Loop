import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendWebPushNotification } from "@/lib/webPush";
import type { Database } from "@/lib/database.types";

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

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      logger.error("Push send: server configuration error");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Check if token is the service role key (for server/cron/triggers)
    const isServiceRole = token === supabaseServiceKey;
    let callerId = "service_role";

    if (!isServiceRole) {
      // 2. Validate caller session via Supabase Auth
      const userClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: userError } = await userClient.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      callerId = user.id;
    }

    // 3. Rate limit caller (max 30 push calls / minute)
    const rateLimit = await checkRateLimit(`push-send:${callerId}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many push notification requests. Please wait." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetInSeconds) } }
      );
    }

    const body = await req.json();
    const { userIds, title, body: messageBody, url, tag } = body || {};

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !messageBody) {
      return NextResponse.json(
        { error: "Invalid payload: userIds (array), title, and body are required." },
        { status: 400 }
      );
    }

    // Limit batch size to 50 recipients per request to prevent abuse
    const recipients = userIds.slice(0, 50);

    const result = await sendWebPushNotification({
      userIds: recipients,
      payload: { title, body: messageBody, url, tag },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Push dispatch error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
