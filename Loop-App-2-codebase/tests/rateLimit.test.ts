import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe("getClientIp", () => {
    it("prefers x-vercel-forwarded-for, the platform-set header", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-vercel-forwarded-for": "192.0.2.9",
          "x-real-ip": "198.51.100.42",
          "x-forwarded-for": "203.0.113.195",
          "cf-connecting-ip": "10.0.0.1",
        },
      });
      expect(getClientIp(req)).toBe("192.0.2.9");
    });

    it("ignores spoofable cf-connecting-ip (rate-limit bypass regression)", () => {
      // Previously cf-connecting-ip won whenever present, so a caller could
      // rotate it per request and never hit the limit. It must now be ignored
      // entirely when no trusted proxy header is present.
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "cf-connecting-ip": "192.0.2.1" },
      });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("falls back to x-real-ip when vercel header is missing", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-real-ip": "198.51.100.42",
          "x-forwarded-for": "203.0.113.195",
        },
      });
      expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("uses the LAST x-forwarded-for hop appended by the trusted proxy", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });
      expect(getClientIp(req)).toBe("70.41.3.18");
    });

    it("returns a shared 'unknown' bucket when no proxy headers are provided", () => {
      const req = new NextRequest("http://localhost/api/test");
      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests under the limit and track remaining quota", async () => {
      const key = `test-ip-${Date.now()}-1`;
      const max = 3;
      const windowMs = 60000;

      const r1 = await checkRateLimit(key, max, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r1.count).toBe(1);
      expect(r1.remaining).toBe(2);

      const r2 = await checkRateLimit(key, max, windowMs);
      expect(r2.allowed).toBe(true);
      expect(r2.count).toBe(2);
      expect(r2.remaining).toBe(1);

      const r3 = await checkRateLimit(key, max, windowMs);
      expect(r3.allowed).toBe(true);
      expect(r3.count).toBe(3);
      expect(r3.remaining).toBe(0);

      // Exceeded
      const r4 = await checkRateLimit(key, max, windowMs);
      expect(r4.allowed).toBe(false);
      expect(r4.count).toBe(3);
      expect(r4.remaining).toBe(0);
      expect(r4.resetInSeconds).toBeGreaterThan(0);
    });

    it("should reset window after expiration", async () => {
      vi.useFakeTimers();
      const key = `test-ip-${Date.now()}-2`;
      const max = 2;
      const windowMs = 5000;

      await checkRateLimit(key, max, windowMs);
      await checkRateLimit(key, max, windowMs);
      const blocked = await checkRateLimit(key, max, windowMs);
      expect(blocked.allowed).toBe(false);

      // Advance time past the 5-second window
      vi.advanceTimersByTime(5100);

      const afterReset = await checkRateLimit(key, max, windowMs);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.count).toBe(1);
      expect(afterReset.remaining).toBe(1);
    });

    it("uses the shared Postgres limiter when a service key is configured", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify([{ allowed: true, count: 2, remaining: 8, reset_in_seconds: 60 }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const result = await checkRateLimit(`shared-${Date.now()}`, 10, 60_000);

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://example.supabase.co/rest/v1/rpc/check_rate_limit",
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toMatchObject({ allowed: true, count: 2, remaining: 8, resetInSeconds: 60 });
      fetchSpy.mockRestore();
    });

    it("falls back to memory when the shared database call fails", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValue(new Error("network down"));

      const result = await checkRateLimit(`fallback-${Date.now()}`, 3, 60_000);

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
      fetchSpy.mockRestore();
    });
  });
});
