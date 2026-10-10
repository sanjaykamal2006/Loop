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
    // Get current count
    const current = await redis.get<number>(windowKey);

    if (current === null) {
      // First request in window
      await redis.set(windowKey, 1, { px: windowMs });
      return {
        allowed: true,
        count: 1,
        remaining: maxRequests - 1,
        resetInSeconds: Math.ceil(windowMs / 1000),
        resetAt: now + windowMs,
      };
    }

    if (current >= maxRequests) {
      // Rate limit exceeded
      const ttl = await redis.ttl(windowKey);
      const resetInSeconds = Math.max(1, ttl);
      return {
        allowed: false,
        count: current,
        remaining: 0,
        resetInSeconds,
        resetAt: now + resetInSeconds * 1000,
      };
    }

    // Increment counter
    const newCount = await redis.incr(windowKey);
    const ttl = await redis.ttl(windowKey);
    const resetInSeconds = Math.max(1, ttl);

    return {
      allowed: true,
      count: newCount,
      remaining: Math.max(0, maxRequests - newCount),
      resetInSeconds,
      resetAt: now + resetInSeconds * 1000,
    };
  } catch (error) {
    // Fallback: log via conditional logger and fall back to local rate limiter
    logger.error("Rate limit check failed:", error);
    return checkFallbackRateLimit(key, maxRequests, windowMs);
  }
}

/**
 * Extracts the real client IP address from standard proxy headers.
 * Prioritizes authoritative edge-set headers (Cloudflare, Vercel/Nginx)
 * before falling back to X-Forwarded-For.
 */
export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "127.0.0.1";
}
