import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("getClientIp", () => {
    it("should resolve IP from x-forwarded-for header", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
      });
      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    it("should fallback to x-real-ip if x-forwarded-for is missing", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-real-ip": "198.51.100.42" },
      });
      expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("should fallback to cf-connecting-ip if others are missing", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "cf-connecting-ip": "192.0.2.1" },
      });
      expect(getClientIp(req)).toBe("192.0.2.1");
    });

    it("should return localhost IP if no proxy headers are provided", () => {
      const req = new NextRequest("http://localhost/api/test");
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests under the limit and track remaining quota", () => {
      const key = `test-ip-${Date.now()}-1`;
      const max = 3;
      const windowMs = 60000;

      const r1 = checkRateLimit(key, max, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r1.count).toBe(1);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(key, max, windowMs);
      expect(r2.allowed).toBe(true);
      expect(r2.count).toBe(2);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(key, max, windowMs);
      expect(r3.allowed).toBe(true);
      expect(r3.count).toBe(3);
      expect(r3.remaining).toBe(0);

      // Exceeded
      const r4 = checkRateLimit(key, max, windowMs);
      expect(r4.allowed).toBe(false);
      expect(r4.count).toBe(3);
      expect(r4.remaining).toBe(0);
      expect(r4.resetInSeconds).toBeGreaterThan(0);
    });

    it("should reset window after expiration", () => {
      vi.useFakeTimers();
      const key = `test-ip-${Date.now()}-2`;
      const max = 2;
      const windowMs = 5000;

      checkRateLimit(key, max, windowMs);
      checkRateLimit(key, max, windowMs);
      const blocked = checkRateLimit(key, max, windowMs);
      expect(blocked.allowed).toBe(false);

      // Advance time past the 5-second window
      vi.advanceTimersByTime(5100);

      const afterReset = checkRateLimit(key, max, windowMs);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.count).toBe(1);
      expect(afterReset.remaining).toBe(1);
    });
  });
});
