import { describe, it, expect, beforeEach, vi } from "vitest";

const insertResult = { data: null as any, error: null as any, profile: null as any };
const callLog: any[] = [];

vi.mock("@/lib/supabase", () => {
  const buildChain = (target: string) => {
    const chain: any = {
      insert: vi.fn((payload: any) => {
        callLog.push({ kind: "insert", target, payload });
        return chain;
      }),
      select: vi.fn(() => chain),
      upsert: vi.fn((payload: any) => {
        callLog.push({ kind: "upsert", target, payload });
        return chain;
      }),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: (insertResult as any).profile ?? null, error: null })
      ),
      single: vi.fn(() =>
        Promise.resolve({ data: (insertResult as any).data, error: (insertResult as any).error })
      ),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  };
  return {
    supabase: {
      from: vi.fn((target: string) => {
        callLog.push({ kind: "from", target });
        return buildChain(target);
      }),
    },
  };
});

import { insertChatMessage, postChatAnnouncement, MESSAGE_SELECT_COLUMNS } from "@/lib/chatMessages";
import { logger } from "@/lib/logger";

beforeEach(() => {
  insertResult.data = null;
  insertResult.error = null;
  insertResult.profile = null;
  callLog.length = 0;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
describe("insertChatMessage", () => {
  it("inserts through the single shared writer path", async () => {
    insertResult.data = { id: "m-1", loop_id: "loop-1", user_id: "u-1", content: "hi", created_at: "2026-10-19T09:00:00Z", reactions: {} };

    const { data, error } = await insertChatMessage({ loopId: "loop-1", userId: "u-1", content: "hi" });

    expect(error).toBeNull();
    expect(data).toEqual(insertResult.data);
    const fromCall = callLog.find((c) => c.kind === "from");
    expect(fromCall.target).toBe("messages");
  });

  it("normalizes failure into the shared error shape", async () => {
    insertResult.error = { message: "Too many messages. Please slow down." };

    const { data, error } = await insertChatMessage({ loopId: "loop-1", userId: "u-1", content: "hi" });

    expect(data).toBeNull();
    expect(error?.message).toBe("Too many messages. Please slow down.");
  });

  it("exposes the canonical fetch select list", () => {
    expect(MESSAGE_SELECT_COLUMNS).toContain("profiles!fk_messages_profiles");
    expect(MESSAGE_SELECT_COLUMNS).toContain("edited_at");
    expect(MESSAGE_SELECT_COLUMNS).toContain("reactions");
  });
});

describe("postChatAnnouncement", () => {
  it("posts the system message and never throws (fire-and-forget)", async () => {
    insertResult.data = { id: "m-9", loop_id: "loop-1", user_id: "host-1", content: "[Update] Ride updated by host", created_at: "2026-10-19T09:00:00Z", reactions: {} };
    await expect(
      postChatAnnouncement("loop-1", "host-1", "[Update] Ride updated by host")
    ).resolves.toBeUndefined();
    const upserts = callLog.filter((c) => c.kind === "upsert");
    expect(upserts).toHaveLength(0);
  });

  it("swallows failures instead of failing the surrounding ride action", async () => {
    insertResult.error = { message: "PostgREST down" };
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await expect(postChatAnnouncement("loop-2", "author-1", "Return trip available!")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});
