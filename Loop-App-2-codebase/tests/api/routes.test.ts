import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase client module
vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock @supabase/supabase-js createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn((token: string) => {
        if (token === "valid_user_token") {
          return Promise.resolve({ data: { user: { id: "user_123" } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: { message: "Invalid token" } });
      }),
      admin: {
        deleteUser: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn(() => Promise.resolve({ data: [] })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

// Mock syncWhitelist
vi.mock("@/lib/syncWhitelist", () => ({
  syncWhitelistToDatabase: vi.fn(() => Promise.resolve({ success: true, syncedEmails: ["sanjaykamal2006@gmail.com"] })),
}));

// Mock rateLimit
vi.mock("@/lib/rateLimit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, resetInSeconds: 60, resetAt: Date.now() + 60000 })),
}));

describe("API Routes Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/keep-alive", () => {
    it("returns 200 with healthy status on successful rpc ping", async () => {
      const { supabase } = await import("@/lib/supabase");
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { status: "healthy" },
        error: null,
      } as any);

      const { GET } = await import("@/app/api/keep-alive/route");
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe("healthy");
      expect(body.message).toContain("Database connection ping successful");
    });

    it("falls back to loops query if rpc fails", async () => {
      const { supabase } = await import("@/lib/supabase");
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "RPC not found" } as any,
      } as any);

      const { GET } = await import("@/app/api/keep-alive/route");
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe("healthy");
      expect(body.message).toContain("Database ping successful");
    });
  });

  describe("GET /api/admin/stats", () => {
    it("returns 401 when authorization header is missing or invalid", async () => {
      process.env.ADMIN_STATS_SECRET = "supersecret12345678";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

      const { GET } = await import("@/app/api/admin/stats/route");
      const req = new NextRequest("http://localhost/api/admin/stats", {
        headers: { authorization: "Bearer wrongtoken1234567" },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns 200 when valid admin bearer token is provided", async () => {
      const secret = "testsecrettoken12345678";
      process.env.ADMIN_STATS_SECRET = secret;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

      const { GET } = await import("@/app/api/admin/stats/route");
      const req = new NextRequest("http://localhost/api/admin/stats", {
        headers: { authorization: `Bearer ${secret}` },
      });

      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.counts).toBeDefined();
      expect(body.free_tier_status).toBeDefined();
    });
  });

  describe("POST /api/admin/sync-whitelist", () => {
    it("rejects GET request with 405 Method Not Allowed", async () => {
      const { GET } = await import("@/app/api/admin/sync-whitelist/route");
      const res = await GET();
      expect(res.status).toBe(405);
    });

    it("rejects POST with 401 on unauthorized token", async () => {
      process.env.CRON_SECRET = "valid_cron_secret_123456";
      const { POST } = await import("@/app/api/admin/sync-whitelist/route");
      const req = new NextRequest("http://localhost/api/admin/sync-whitelist", {
        method: "POST",
        headers: { authorization: "Bearer invalid_secret_1234" },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("executes sync and returns 200 on authorized POST", async () => {
      const secret = "valid_cron_secret_123456";
      process.env.CRON_SECRET = secret;
      const { POST } = await import("@/app/api/admin/sync-whitelist/route");
      const req = new NextRequest("http://localhost/api/admin/sync-whitelist", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);
    });
  });

  describe("POST /api/cleanup", () => {
    it("returns 401 on unauthorized request", async () => {
      process.env.CLEANUP_CRON_SECRET = "valid_cleanup_secret_123";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";
      const { POST } = await import("@/app/api/cleanup/route");
      const req = new NextRequest("http://localhost/api/cleanup", {
        method: "POST",
        headers: { authorization: "Bearer wrong_secret_12345" },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("triggers database cleanup functions and returns 200", async () => {
      const secret = "valid_cleanup_secret_123";
      process.env.CLEANUP_CRON_SECRET = secret;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

      const { POST } = await import("@/app/api/cleanup/route");
      const req = new NextRequest("http://localhost/api/cleanup", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });

      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain("cleaned up successfully");
    });
  });

  describe("POST /api/auth/validate-email", () => {
    it("rejects invalid or missing email format with 400", async () => {
      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "notanemail" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.allowed).toBe(false);
    });

    it("rejects plus-addressing emails with 400", async () => {
      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "student+alias@vitapstudent.ac.in" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.allowed).toBe(false);
      expect(body.reason).toContain("Plus-addressing");
    });

    it("allows valid institutional student email", async () => {
      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "sanjay.kamal2023@vitapstudent.ac.in" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.allowed).toBe(true);
    });

    it("allows existing login checks regardless of domain", async () => {
      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "existinguser@gmail.com", isLogin: true }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.allowed).toBe(true);
    });
  });

  describe("POST /api/account/delete", () => {
    it("returns 401 when Authorization Bearer token is missing", async () => {
      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("deletes user and cascades cleanups when authorized", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock_anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        headers: { authorization: "Bearer valid_user_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
