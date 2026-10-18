import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

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

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token || url.includes("your-redis.upstash.io")) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

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
 * Redis-backed fixed-window rate limiter for serverless environments.
 * Persists across cold starts and scales horizontally via Upstash Redis,
 * with automatic local fallback when Redis credentials are not configured.
 *
 * Concurrency note: the counter is incremented atomically FIRST and the
 * returned count is the single source of truth for the allow/deny decision.
 * A GET-then-INCR sequence would let N parallel requests all read the same
 * pre-limit count and pass together.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 10 * 60 * 1000 // 10 minutes
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}`;
  const redis = getRedisClient();

  if (!redis) {
    return checkFallbackRateLimit(key, maxRequests, windowMs);
  }

  try {
    // Atomic increment first: parallel requests can never race past the limit.
    const count = await redis.incr(windowKey);

    // Attach the window TTL on the first hit; repair a missing TTL
    // defensively (e.g. a crash between INCR and PEXPIRE) without ever
    // extending a live window.
    let ttl = await redis.pttl(windowKey);
    if (ttl < 0) {
      await redis.pexpire(windowKey, windowMs);
      ttl = windowMs;
    }

    if (count > maxRequests) {
      return {
        allowed: false,
        count,
        remaining: 0,
        resetInSeconds: Math.max(1, Math.ceil(ttl / 1000)),
        resetAt: now + ttl,
      };
    }

    return {
      allowed: true,
      count,
      remaining: Math.max(0, maxRequests - count),
      resetInSeconds: Math.max(1, Math.ceil(ttl / 1000)),
      resetAt: now + ttl,
    };
  } catch (error) {
    // Fallback: log via conditional logger and fall back to local rate limiter
    logger.error("Rate limit check failed:", error);
    return checkFallbackRateLimit(key, maxRequests, windowMs);
  }
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
