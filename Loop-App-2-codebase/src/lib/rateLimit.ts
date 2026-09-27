import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory cache for rate limit counters.
// Note: In serverless (Vercel), each container has its own memory space and resets on cold start.
const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_STORE_SIZE = 5000;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetInSeconds: number;
  resetAt: number;
}

/**
 * Extracts the real client IP address from standard proxy headers.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}

/**
 * In-memory fixed-window rate limiter designed for Vercel / serverless free-tier environments.
 * Default: 10 requests per 10 minutes (600,000 ms) per key.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 10 * 60 * 1000
): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup if store exceeds max size to prevent memory leaks in warm instances
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    for (const [entryKey, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(entryKey);
      }
    }
  }

  const existing = rateLimitStore.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
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
