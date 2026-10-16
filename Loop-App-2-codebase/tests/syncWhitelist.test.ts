import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncWhitelistToDatabase } from "@/lib/syncWhitelist";
import { createClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("syncWhitelistToDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failure when environment variables are missing", async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await syncWhitelistToDatabase();
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing SUPABASE_SERVICE_ROLE_KEY");

    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });

  it("successfully syncs whitelist entries to database via upsert", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        upsert: upsertSpy,
      })),
    } as any);

    const result = await syncWhitelistToDatabase();
    expect(result.success).toBe(true);
    expect(result.syncedEmails.length).toBeGreaterThan(0);
    expect(upsertSpy).toHaveBeenCalled();
  });

  it("handles database upsert errors gracefully", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve({ error: { message: "Database connection refused" } })),
      })),
    } as any);

    const result = await syncWhitelistToDatabase();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Database connection refused");
  });

  it("catches and reports unexpected exceptions", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

    vi.mocked(createClient).mockImplementationOnce(() => {
      throw new Error("Critical crash during client creation");
    });

    const result = await syncWhitelistToDatabase();
    expect(result.success).toBe(false);
    expect(result.error).toContain("Critical crash during client creation");
  });
});
