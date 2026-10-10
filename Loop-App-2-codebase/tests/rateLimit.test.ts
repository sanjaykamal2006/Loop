import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe("getClientIp", () => {
    it("should prioritize cf-connecting-ip if present", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          "cf-connecting-ip": "192.0.2.1",
          "x-real-ip": "198.51.100.42",
          "x-forwarded-for": "203.0.113.195",
        },
      });
      expect(getClientIp(req)).toBe("192.0.2.1");
    });

    it("should fallback to x-real-ip if cf-connecting-ip is missing", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-real-ip": "198.51.100.42",
          "x-forwarded-for": "203.0.113.195",
        },
      });
      expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("should fallback to x-forwarded-for if direct proxy headers are missing", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });
      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    it("should return localhost IP if no proxy headers are provided", () => {
      const req = new NextRequest("http://localhost/api/test");
      expect(getClientIp(req)).toBe("127.0.0.1");
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
  });
});
