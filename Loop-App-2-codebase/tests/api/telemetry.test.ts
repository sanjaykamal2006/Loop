import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rateLimit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    count: 1,
    remaining: 19,
    resetInSeconds: 60,
    resetAt: Date.now() + 60_000,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { POST, GET } from "@/app/api/telemetry/route";
import { checkRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("POST /api/telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs a sanitized client error and returns 204", async () => {
    const res = await POST(
      makeRequest(
        JSON.stringify({
          message: "Render failed",
          name: "Error",
          stack: "at Component",
          digest: "abc123",
          path: "/app",
          context: { secret: "must be dropped" },
        })
      )
    );

    expect(res.status).toBe(204);
    expect(logger.error).toHaveBeenCalledWith(
      "[client] Render failed",
      expect.objectContaining({ source: "client", path: "/app", stack: "at Component" })
    );
    const logged = vi.mocked(logger.error).mock.calls[0][1] as Record<string, unknown>;
    expect(logged.context).toBeUndefined();
  });

  it("accepts sendBeacon text/plain payloads", async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ message: "Beacon error" }), {
        "Content-Type": "text/plain",
      })
    );
    expect(res.status).toBe(204);
  });

  it("rejects invalid JSON", async () => {
    const res = await POST(makeRequest("{not json"));
    expect(res.status).toBe(400);
  });

  it("rejects oversized payloads", async () => {
    const res = await POST(makeRequest(JSON.stringify({ message: "x".repeat(9_000) })));
    expect(res.status).toBe(413);
  });

  it("rejects cross-origin reports", async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ message: "spam" }), { Origin: "https://evil.example" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 429 when the rate limit is exhausted", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      count: 21,
      remaining: 0,
      resetInSeconds: 42,
      resetAt: Date.now() + 42_000,
    });
    const res = await POST(makeRequest(JSON.stringify({ message: "loop" })));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("returns 405 for GET", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
