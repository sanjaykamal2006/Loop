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

const createDefaultMockClient = () => ({
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
});

// Mock @supabase/supabase-js createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createDefaultMockClient()),
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
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import("@supabase/supabase-js");
    vi.mocked(createClient).mockImplementation(createDefaultMockClient as any);
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

    it("returns 503 when both rpc and fallback loops query fail", async () => {
      const { supabase } = await import("@/lib/supabase");
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "RPC failed" } as any,
      } as any);
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ error: { message: "DB unreachable" } })),
        })),
      } as any);

      const { GET } = await import("@/app/api/keep-alive/route");
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.status).toBe("unhealthy");
      expect(body.message).toBe("Database health check failed");
    });

    it("returns 500 when keep-alive throws an unhandled exception", async () => {
      const { supabase } = await import("@/lib/supabase");
      vi.mocked(supabase.rpc).mockImplementationOnce(() => {
        throw new Error("Fatal socket crash");
      });

      const { GET } = await import("@/app/api/keep-alive/route");
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.status).toBe("error");
      expect(body.message).toBe("Keep-alive service error");
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

    it("returns 500 when admin secret is missing on server", async () => {
      const origAdmin = process.env.ADMIN_STATS_SECRET;
      const origCron = process.env.CLEANUP_CRON_SECRET;
      delete process.env.ADMIN_STATS_SECRET;
      delete process.env.CLEANUP_CRON_SECRET;

      const { GET } = await import("@/app/api/admin/stats/route");
      const req = new NextRequest("http://localhost/api/admin/stats", {
        headers: { authorization: "Bearer some_token" },
      });

      const res = await GET(req);
      expect(res.status).toBe(500);

      process.env.ADMIN_STATS_SECRET = origAdmin;
      process.env.CLEANUP_CRON_SECRET = origCron;
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
    it("rejects GET request with 405 Method Not Allowed", async () => {
      const { GET } = await import("@/app/api/cleanup/route");
      const res = await GET();
      expect(res.status).toBe(405);
    });

    it("returns 500 when CLEANUP_CRON_SECRET is not configured", async () => {
      const origCron = process.env.CLEANUP_CRON_SECRET;
      delete process.env.CLEANUP_CRON_SECRET;

      const { POST } = await import("@/app/api/cleanup/route");
      const req = new NextRequest("http://localhost/api/cleanup", {
        method: "POST",
        headers: { authorization: "Bearer any_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);

      process.env.CLEANUP_CRON_SECRET = origCron;
    });

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

    it("returns 500 when cleanup RPC encounters an error", async () => {
      const secret = "valid_cleanup_secret_123";
      process.env.CLEANUP_CRON_SECRET = secret;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockReturnValueOnce({
        rpc: vi.fn((fnName: string) => {
          if (fnName === "cleanup_old_rides") {
            return Promise.resolve({ error: { message: "RPC timeout" } });
          }
          return Promise.resolve({ error: null });
        }),
      } as any);

      const { POST } = await import("@/app/api/cleanup/route");
      const req = new NextRequest("http://localhost/api/cleanup", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("RPC timeout");
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

    it("returns 429 when rate limit is exceeded", async () => {
      const { checkRateLimit } = await import("@/lib/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        resetInSeconds: 300,
        resetAt: Date.now() + 300000,
      });

      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "student@vitapstudent.ac.in" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.allowed).toBe(false);
      expect(body.retryAfter).toBe(300);
    });

    it("rejects non-institutional emails not in whitelist with 403", async () => {
      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "stranger@gmail.com", isLogin: false }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.allowed).toBe(false);
      expect(body.reason).toContain("institutional email");
    });

    it("allows external email whitelisted in database table", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: { email: "guest@external.org" }, error: null })),
            })),
          })),
        })),
      } as any);

      const { POST } = await import("@/app/api/auth/validate-email/route");
      const req = new NextRequest("http://localhost/api/auth/validate-email", {
        method: "POST",
        body: JSON.stringify({ email: "guest@external.org", isLogin: false }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.allowed).toBe(true);
      expect(body.type).toBe("whitelisted_db");
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

    it("returns 500 when required environment variables are missing", async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        headers: { authorization: "Bearer some_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("Server configuration error");

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    });

    it("returns 401 when token verification fails with invalid token", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock_anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        headers: { authorization: "Bearer invalid_unauthorized_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("handles hosted active loops by cancelling and notifying passengers", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock_anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

      const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
      const insertSpy = vi.fn(() => Promise.resolve({ error: null }));
      const deleteSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));

      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockImplementation(((url: string, key: string) => {
        if (key === "mock_anon_key") {
          return {
            auth: {
              getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "host_user_1" } }, error: null })),
            },
          };
        }
        return {
          auth: {
            admin: {
              deleteUser: vi.fn(() => Promise.resolve({ error: null })),
            },
          },
          from: vi.fn((table: string) => {
            if (table === "loops") {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [{ id: "loop_active_1", status: "active" }],
                  })),
                })),
                update: updateSpy,
                delete: deleteSpy,
              };
            }
            if (table === "loop_members") {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    neq: vi.fn(() => Promise.resolve({ data: [{ user_id: "passenger_2" }] })),
                  })),
                })),
                delete: deleteSpy,
              };
            }
            if (table === "messages") {
              return {
                insert: insertSpy,
              };
            }
            return {
              delete: deleteSpy,
            };
          }),
        };
      }) as any);

      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        headers: { authorization: "Bearer valid_user_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({ status: "cancelled", creator_id: null });
      expect(insertSpy).toHaveBeenCalled();
    });

    it("returns 500 when admin profiles delete fails", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock_anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockImplementation(((url: string, key: string) => {
        if (key === "mock_anon_key") {
          return {
            auth: {
              getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "profile_fail_user" } }, error: null })),
            },
          };
        }
        return {
          auth: {
            admin: {
              deleteUser: vi.fn(() => Promise.resolve({ error: null })),
            },
          },
          from: vi.fn((table: string) => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [] })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => {
                if (table === "profiles") {
                  return Promise.resolve({ error: { message: "Profile deletion cascade failed" } });
                }
                return Promise.resolve({ error: null });
              }),
            })),
          })),
        };
      }) as any);

      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        headers: { authorization: "Bearer valid_user_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Profile deletion cascade failed");
    });

    it("returns 500 when admin deleteUser fails", async () => {

      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock_anon_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockImplementation(((url: string, key: string) => {
        if (key === "mock_anon_key") {
          return {
            auth: {
              getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user_to_fail" } }, error: null })),
            },
          };
        }
        return {
          auth: {
            admin: {
              deleteUser: vi.fn(() => Promise.resolve({ error: { message: "Auth service error" } })),
            },
          },
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [] })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }) as any);

      const { POST } = await import("@/app/api/account/delete/route");
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        headers: { authorization: "Bearer valid_user_token" },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Auth service error");
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
