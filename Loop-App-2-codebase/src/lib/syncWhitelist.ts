import { createClient } from "@supabase/supabase-js";
import { EXTERNAL_EMAIL_WHITELIST } from "./authConfig";
import { logger } from "./logger";

export interface WhitelistSyncResult {
  success: boolean;
  syncedEmails: string[];
  error?: string;
}

/**
 * Syncs the code-defined EXTERNAL_EMAIL_WHITELIST from authConfig.ts
 * into the public.allowed_external_emails table in Supabase.
 * Uses service role to bypass RLS and perform an idempotent upsert.
 */
export async function syncWhitelistToDatabase(): Promise<WhitelistSyncResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      syncedEmails: [],
      error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL environment variables.",
    };
  }

  const validEmails = EXTERNAL_EMAIL_WHITELIST
    .map((e) => e.toLowerCase().trim())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (validEmails.length === 0) {
    return {
      success: true,
      syncedEmails: [],
    };
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const rows = validEmails.map((email) => ({
      email,
      description: "Synced from authConfig.ts",
    }));

    const { error } = await adminClient
      .from("allowed_external_emails")
      .upsert(rows, { onConflict: "email" });

    if (error) {
      logger.error("syncWhitelistToDatabase error:", error.message);
      return {
        success: false,
        syncedEmails: [],
        error: error.message,
      };
    }

    return {
      success: true,
      syncedEmails: validEmails,
    };
  } catch (err: any) {
    logger.error("syncWhitelistToDatabase exception:", err?.message || err);
    return {
      success: false,
      syncedEmails: [],
      error: err?.message || "Unknown error during whitelist sync",
    };
  }
}
