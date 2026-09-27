import { NextRequest, NextResponse } from "next/server";
import { syncWhitelistToDatabase } from "@/lib/syncWhitelist";

export const dynamic = "force-dynamic";

/**
 * Admin API route to sync the code-based EXTERNAL_EMAIL_WHITELIST in authConfig.ts
 * with the public.allowed_external_emails table in Supabase.
 *
 * Can be triggered:
 * 1. Automatically after deployment
 * 2. On a cron job / deploy webhook
 * 3. Manually via GET or POST request
 */
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  // Optional security token check (if CRON_SECRET is configured)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // If not matching cronSecret, check query param secret: ?key=...
    const urlKey = request.nextUrl.searchParams.get("key");
    if (urlKey !== cronSecret) {
      // In development or if CRON_SECRET is not configured, allow founder/service sync
      if (process.env.NODE_ENV === "production" && cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  const result = await syncWhitelistToDatabase();

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Failed to sync whitelist",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "External email whitelist successfully synced to Supabase database",
    count: result.syncedEmails.length,
    syncedEmails: result.syncedEmails,
    timestamp: new Date().toISOString(),
  });
}
