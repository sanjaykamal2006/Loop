import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/push/send/route";
import webpush from "web-push";

// Mock web-push
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// Mock rateLimit
vi.mock("@/lib/rateLimit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, resetInSeconds: 60, resetAt: Date.now() + 60000 })),
}));

const mockDelete = vi.fn(() => ({
  in: vi.fn(() => Promise.resolve({ error: null })),
}));

const mockSelect = vi.fn(() => ({
  in: vi.fn(() =>
    Promise.resolve({
      data: [
        {
          id: "sub-1",
          user_id: "user-123",
          endpoint: "https://fcm.googleapis.com/fcm/send/sub-1",
          p256dh: "mock-p256dh-key",
          auth: "mock-auth-secret",
        },
      ],
      error: null,
    })
  ),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn((token: string) => {
        if (token === "valid_user_token") {
          return Promise.resolve({ data: { user: { id: "user_123" } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: { message: "Invalid token" } });
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "push_subscriptions") {
        return {
          select: mockSelect,
          delete: mockDelete,
        };
      }
      return {
        select: vi.fn(),
        delete: vi.fn(),
      };
    }),
  })),
}));

describe("POST /api/push/send", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-public-key",
      VAPID_PRIVATE_KEY: "test-vapid-private-key",
      VAPID_SUBJECT: "mailto:admin@test.edu",
    };
  });

  it("returns 401 when Authorization header is missing", async () => {
    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: ["user-123"], title: "Test", body: "Hello" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_token",
      },
      body: JSON.stringify({ userIds: ["user-123"], title: "Test", body: "Hello" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required payload fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid_user_token",
      },
      body: JSON.stringify({ userIds: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("successfully dispatches push notification to user subscriptions", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValueOnce({
      statusCode: 201,
      body: "",
      headers: {},
    });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid_user_token",
      },
      body: JSON.stringify({
        userIds: ["user-123"],
        title: "Passenger Joined 🚗",
        body: "A student joined your ride to Vijayawada Station",
        url: "/ride/123",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBe(1);
    expect(data.failed).toBe(0);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it("prunes expired subscriptions when web-push returns 410 Gone", async () => {
    const error410 = Object.assign(new Error("Subscription expired"), { statusCode: 410 });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(error410);

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-service-role-key",
      },
      body: JSON.stringify({
        userIds: ["user-123"],
        title: "Ride Starting Soon",
        body: "Departure in 20 minutes",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBe(0);
    expect(data.failed).toBe(1);
    expect(data.pruned).toBe(1);
    expect(mockDelete).toHaveBeenCalled();
  });
});
