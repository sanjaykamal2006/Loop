import { NextRequest, NextResponse } from "next/server";
import { syncWhitelistToDatabase } from "@/lib/syncWhitelist";

export const dynamic = "force-dynamic";

/**
 * Admin API route to sync the code-based EXTERNAL_EMAIL_WHITELIST in authConfig.ts
 * with the public.allowed_external_emails table in Supabase.
 *
 * Security controls:
 * 1. POST only (GET rejected with 405 Method Not Allowed)
 * 2. Mandatory Bearer Authorization header matching CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY
 * 3. No secrets in URL query parameters
 * 4. PII protection: Returns only status and count, no raw email dumps
 */
export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use authenticated POST." },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: Authentication secret not configured." },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing authorization bearer token." },
      { status: 401 }
    );
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
    timestamp: new Date().toISOString(),
  });
}
