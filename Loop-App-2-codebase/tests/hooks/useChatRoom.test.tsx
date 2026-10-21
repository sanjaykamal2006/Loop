import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { useChatRoom } from "@/components/chat/useChatRoom";
import type { Loop, Profile } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
    rpc: mocks.rpc,
  },
}));

vi.mock("@/components/ui/NativeToast", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// Per-target canned responses; tests mutate these between awaits.
let messagesResponse: { data: unknown; error: unknown };
let insertSingleResponse: { data: unknown; error: unknown };
let updateResult: { data: unknown; error: unknown };
let deleteResult: { data: unknown; error: unknown };

const PAGE = 25;

function makeMsgRows(n: number, prefix = "db") {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    loop_id: "loop-1",
    user_id: i % 2 === 0 ? "u1" : "u2",
    content: `msg ${prefix}-${i}`,
    // Supabase replies newest-first (DESC by created_at); the hook reverses
    // into chronological order, so i=0 must be the newest row.
    created_at: new Date(Date.now() - (i + 1) * 60000).toISOString(),
    edited_at: null,
    reactions: {},
    profiles: { display_name: i % 2 === 0 ? "Sanjay" : "Alex", avatar_url: null },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  messagesResponse = { data: makeMsgRows(2, "init"), error: null };
  insertSingleResponse = { data: null, error: null };
  updateResult = { data: null, error: null };
  deleteResult = { data: null, error: null };

  mocks.rpc.mockResolvedValue({ data: [], error: null });

  const channel: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  mocks.channel.mockReturnValue(channel);

  mocks.from.mockImplementation((table: string) => {
    const q: any = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      in: vi.fn(() => q),
      lt: vi.fn(() => q),
      order: vi.fn(() => q),
      update: vi.fn(() => q),
      delete: vi.fn(() => q),
      insert: vi.fn(() => q),
      limit: vi.fn(() => {
        if (table === "messages") return Promise.resolve(messagesResponse);
        return Promise.resolve({ data: [], error: null });
      }),
      single: vi.fn(() =>
        table === "loops"
          ? Promise.resolve({ data: { id: "loop-9", status: "open" }, error: null })
          : Promise.resolve(insertSingleResponse)
      ),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: (resolve: any, reject: any) => {
        if (table === "loop_members") return Promise.resolve({ data: [{ user_id: "u1" }], error: null }).then(resolve, reject);
        if (table === "profiles") return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        if (table === "emergency_contacts") return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      },
    };
    if (table === "messages") {
      q.update = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(updateResult)),
      }));
      q.delete = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve(deleteResult)),
        })),
      }));
      q.insert = vi.fn(() => q); // terminates at select().single() below
    }
    return q;
  });
});

afterEach(() => {
  delete (navigator as any).geolocation;
  delete (navigator as any).share;
  vi.restoreAllMocks();
});

const session = { user: { id: "u1" } } as unknown as Session;

const profile: Profile = {
  display_name: "Sanjay",
  avatar_url: null,
  reg_no: "24MIC7130",
  gender: "male",
  bio: "",
  phone_number: "9123456780",
  is_student_verified: true,
  theme: "dark",
} as unknown as Profile;

const selectedLoop: Loop = {
  id: "loop-1",
  creator_id: "u2",
  start_point: "VIT-AP Main Gate",
  destination: "Vijayawada Station",
  departure_time: new Date(Date.now() + 3600000).toISOString(),
  participants_limit: 4,
  member_count: 2,
  status: "open",
} as unknown as Loop;

// Stable identities across re-renders: fresh array literals would give
// useChatRoster's useCallback a new identity per render and re-run the mount
// effect forever.
const joinedLoops = ["loop-1"];
const createdLoops: string[] = [];
const activeLoopsList = [selectedLoop];
const stableSetView = vi.fn();
const stableSetSelectedLoop = vi.fn();

function renderRoom(overrides: Record<string, unknown> = {}) {
  return renderHook(() =>
    useChatRoom({
      session,
      selectedLoop,
      setSelectedLoop: stableSetSelectedLoop,
      profile,
      userJoinedLoops: joinedLoops,
      userLoops: createdLoops,
      activeLoops: activeLoopsList,
      setView: stableSetView,
      ...overrides,
    })
  );
}

describe("useChatRoom", () => {
  it("fetches messages and members on mount and exposes them", async () => {
    const { result } = renderRoom();

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    expect(mocks.from).toHaveBeenCalledWith("messages");
    expect(mocks.from).toHaveBeenCalledWith("loop_members");
    // Per-user localStorage cache is populated (scoped key, never the raw id).
    expect(localStorage.getItem("loop_messages_u1_loop-1")).toContain("init-1");
  });

  it("starts empty and skips fetches when no loop is selected", () => {
    const { result } = renderRoom({ selectedLoop: null });

    expect(result.current.messages).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalledWith("messages");
  });

  it("skips the insert entirely for empty input", async () => {
    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      result.current.handleInputChange({ target: { value: "   " } } as React.ChangeEvent<HTMLInputElement>);
      await result.current.sendMessage();
    });

    // Guard path: the draft is never cleared and no write leaves the client.
    expect(result.current.newMessage).toBe("   ");
    expect(result.current.messages.map((m) => m.id)).toEqual(["init-1", "init-0"]);
  });

  it("tolerates loadMoreMessages clicks without history (appends via the look-back query)", async () => {
    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.loadMoreMessages();
    });

    // The look-back page (same canned fixture) is appended; the busy flag resets.
    expect(result.current.messages.length).toBeGreaterThan(2);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("sends a text message: optimistic row is swapped for the DB row", async () => {
    insertSingleResponse = {
      data: { id: "db-real", loop_id: "loop-1", user_id: "u1", content: "hello", created_at: "2026-10-20T09:00:00Z", reactions: {} },
      error: null,
    };
    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      result.current.handleInputChange({ target: { value: "hello" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["init-1", "init-0", "db-real"]);
    expect(result.current.messages.at(-1)?.content).toBe("hello");
    expect(result.current.newMessage).toBe(""); // input cleared
    expect(localStorage.getItem("loop_messages_u1_loop-1")).toContain("db-real");
  });

  it("restores the draft and toasts the server error when the insert fails", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    insertSingleResponse = { data: null, error: { message: "Too many messages" } };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      result.current.handleInputChange({ target: { value: "draft text" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(toast.error).toHaveBeenCalledWith("Too many messages");
    expect(result.current.newMessage).toBe("draft text"); // draft restored
    expect(result.current.messages.map((m) => m.id)).toEqual(["init-1", "init-0"]); // optimistic removed
  });

  it("shares a location via the shared writer and settles the DB row", async () => {
    insertSingleResponse = {
      data: { id: "db-loc", loop_id: "loop-1", user_id: "u1", content: "Location shared: https://maps.google.com/maps?q=16.5,80.6", created_at: "2026-10-20T09:05:00Z", reactions: {} },
      error: null,
    };
    (navigator as any).geolocation = {
      getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
        ok({ coords: { latitude: 16.5, longitude: 80.6 } }),
    };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.handleShareLocation();
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["init-1", "init-0", "db-loc"]);
    expect(result.current.messages.at(-1)?.content).toContain("maps.google.com");
    expect(result.current.isSharingLocation).toBe(false);
  });

  it("surfaces a geolocation failure as a toast", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    (navigator as any).geolocation = {
      getCurrentPosition: (_ok: unknown, fail: (e: { message: string }) => void) => fail({ message: "location denied" }),
    };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.handleShareLocation();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to get location: location denied");
    expect(result.current.messages).toHaveLength(2);
  });

  it("toasts an explanation when geolocation is unsupported", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    (navigator as any).geolocation = undefined;

    const { result } = renderRoom();
    await act(async () => {
      await result.current.handleShareLocation();
    });

    expect(toast.error).toHaveBeenCalledWith("Geolocation is not supported by your browser");
  });

  it("skips the save when no message is being edited", async () => {
    updateResult = { data: null, error: null };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.saveEditMessage(); // editingMsgId is null → guard
    });

    expect(result.current.messages.find((m) => m.id === "init-0")?.content).toBe("msg init-0");
  });

  it("saves an edit and clears the editing state", async () => {
    updateResult = { data: null, error: null };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      result.current.setEditingMsgId("init-0");
      result.current.setEditingContent("edited text");
    });
    await act(async () => {
      await result.current.saveEditMessage();
    });

    const edited = result.current.messages.find((m) => m.id === "init-0");
    expect(edited?.content).toBe("edited text");
    expect(edited?.edited_at).toBeTruthy();
    expect(result.current.editingMsgId).toBeNull();
  });

  it("deletes a message after the DB confirms a deleted row", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    deleteResult = { data: [{ id: "init-0" }], error: null };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.deleteMessage("init-0");
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["init-1"]);
    expect(toast.success).toHaveBeenCalledWith("Message deleted");
  });

  it("keeps the message visible with an error toast when nothing was deleted", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    deleteResult = { data: [], error: null };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.deleteMessage("init-1");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(toast.error).toHaveBeenCalledWith("Failed to delete message");
  });

  it("loads an older page when more history exists", async () => {
    messagesResponse = { data: makeMsgRows(PAGE, "page"), error: null };

    const { result } = renderRoom();
    await waitFor(() => expect(result.current.messages).toHaveLength(PAGE));
    expect(result.current.hasMoreMessages).toBe(true);

    messagesResponse = { data: makeMsgRows(3, "older").map((m) => ({ ...m, created_at: "2026-09-01T00:00:00Z" })), error: null };
    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(result.current.messages).toHaveLength(PAGE + 3);
    expect(result.current.messages[0].id).toMatch(/^older-/); // older page prepended
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("shares the ride via the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = share;

    const { result } = renderRoom();
    await act(async () => {
      result.current.handleShare();
    });

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].text).toContain("VIT-AP Main Gate -> Vijayawada Station");
  });

  it("falls back to the clipboard with a confirmation toast", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    const writeText = vi.fn();
    delete (navigator as any).share;
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const { result } = renderRoom();
    await act(async () => {
      result.current.handleShare();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("Join my ride on LOOP");
    expect(toast.success).toHaveBeenCalledWith("Ride details copied to clipboard!");
    delete (navigator as any).clipboard;
  });
});
