import { NextRequest } from "next/server";
import { checkSharedRateLimit } from "@/lib/sharedRateLimit";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetInSeconds: number;
  resetAt: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const fallbackStore = new Map<string, RateLimitRecord>();
const MAX_STORE_SIZE = 5000;

function checkFallbackRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (fallbackStore.size > MAX_STORE_SIZE) {
    for (const [entryKey, entry] of fallbackStore.entries()) {
      if (entry.resetAt <= now) {
        fallbackStore.delete(entryKey);
      }
    }
  }

  const existing = fallbackStore.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    fallbackStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      count: 1,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
      resetAt,
    };
  }

  if (existing.count >= maxRequests) {
    const resetInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      count: existing.count,
      remaining: 0,
      resetInSeconds,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: true,
    count: existing.count,
    remaining: Math.max(0, maxRequests - existing.count),
    resetInSeconds,
    resetAt: existing.resetAt,
  };
}

/**
 * Fixed-window rate limiter for serverless routes.
 *
 * Preferred path: the shared Postgres table + `check_rate_limit()` function,
 * so limits hold across every serverless instance and cold start. If the
 * database call fails (or local env has no service key), we degrade to a
 * per-instance memory limiter rather than failing requests open.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 10 * 60 * 1000 // 10 minutes
): Promise<RateLimitResult> {
  const windowKey = `ratelimit:${key}`;
  const shared = await checkSharedRateLimit(windowKey, maxRequests, windowMs);

  if (shared) {
    return {
      ...shared,
      resetAt: Date.now() + shared.resetInSeconds * 1000,
    };
  }

  return checkFallbackRateLimit(key, maxRequests, windowMs);
}

/**
 * Extracts the real client IP address from proxy headers.
 *
 * Trust model: only headers that the hosting platform itself sets and
 * overwrites are trusted. Client-controllable headers (such as
 * cf-connecting-ip when the app is NOT behind Cloudflare, or a leading
 * X-Forwarded-For value when no proxy sanitises it) must never win, because
 * a caller can rotate the header value per request to evade rate limits.
 *
 * Deployment target is Vercel: the edge sets x-vercel-forwarded-for and
 * x-real-ip and strips client-supplied values.
 */
export function getClientIp(request: NextRequest): string {
  // Edge-set on Vercel (cannot be spoofed by the client there).
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  // Set by the Vercel edge and by most reverse proxies.
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  // Last entry = the value appended by the closest (trusted) proxy.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  // Shared bucket for unattributable callers — never a spoofable default.
  return "unknown";
}
