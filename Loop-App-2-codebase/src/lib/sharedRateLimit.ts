import { logger } from "@/lib/logger";

export interface SharedRateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Shared fixed-window limiter backed by the same Postgres database as the app.
 * Called only from server routes with the service-role key. Returns null when
 * the database path is unavailable so callers can fall back to memory.
 */
export async function checkSharedRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<SharedRateLimitResult | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_key: key.slice(0, 256),
        p_max_requests: maxRequests,
        p_window_ms: windowMs,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });

    if (!response.ok) {
      logger.warn("Shared rate limiter returned an error; using memory fallback", {
        status: response.status,
      });
      return null;
    }

    const payload: unknown = await response.json();
    const row = (Array.isArray(payload) ? payload[0] : payload) as
      | Record<string, unknown>
      | undefined;

    if (!row || typeof row.allowed !== "boolean") return null;

    return {
      allowed: row.allowed,
      count: Number(row.count) || 0,
      remaining: Math.max(0, Number(row.remaining) || 0),
      resetInSeconds: Math.max(1, Number(row.reset_in_seconds) || 1),
    };
  } catch (error) {
    logger.warn("Shared rate limiter unavailable; using memory fallback", error);
    return null;
  }
}
