import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  registerServiceWorker: vi.fn(),
  sendLocalNotification: vi.fn(),
  preloadAvatars: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));
vi.mock("@/lib/notifications", () => ({
  registerServiceWorker: mocks.registerServiceWorker,
  sendLocalNotification: mocks.sendLocalNotification,
}));
vi.mock("@/lib/imageOptimization", () => ({ preloadAvatars: mocks.preloadAvatars }));
const membership = vi.hoisted(() => {
  const state = {
    userLoops: [] as string[],
    joined: [] as string[],
    userLoopsRef: { current: [] as string[] },
    joinedRef: { current: [] as string[] },
    setUserLoops: (...args: unknown[]) => {
      void args;
    },
    setUserJoinedLoops: (...args: unknown[]) => {
      void args;
    },
    fetchUserMemberships: async () => {},
    joinLoop: async () => {},
    deleteLoop: async () => {},
    leaveLoop: async () => {},
  };
  state.setUserLoops = (updater: unknown) => {
    state.userLoops =
      typeof updater === "function"
        ? (updater as (prev: string[]) => string[])(state.userLoops)
        : (updater as string[]);
    state.userLoopsRef.current = state.userLoops;
  };
  state.setUserJoinedLoops = (updater: unknown) => {
    state.joined =
      typeof updater === "function"
        ? (updater as (prev: string[]) => string[])(state.joined)
        : (updater as string[]);
    state.joinedRef.current = state.joined;
  };
  return state;
});

vi.mock("@/lib/hooks/useLoopMemberships", () => ({
  useLoopMemberships: () => ({
    userJoinedLoops: membership.joined,
    setUserJoinedLoops: membership.setUserJoinedLoops,
    userLoops: membership.userLoops,
    setUserLoops: membership.setUserLoops,
    isJoining: false,
    isDeleting: false,
    fetchUserMemberships: membership.fetchUserMemberships,
    joinLoop: membership.joinLoop,
    deleteLoop: membership.deleteLoop,
    leaveLoop: membership.leaveLoop,
    userJoinedLoopsRef: membership.joinedRef,
    userLoopsRef: membership.userLoopsRef,
  }),
}));

import { useLoopDirectory } from "@/lib/hooks/useLoopDirectory";

const session = { user: { id: "user-1", email: "a@b.c" } } as unknown as Session;
const profile = { display_name: "Test", theme: "dark", gender: "male" } as Profile;

let loopsResponse: { data: unknown[]; error: unknown };
let profilesResponse: { data: unknown; error: unknown };
let channelHandlers: ((payload: any) => void)[];

function makeQuery() {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.in = vi.fn(() => q);
  q.gte = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.limit = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve(loopsResponse));
  q.maybeSingle = vi.fn(() => Promise.resolve(profilesResponse));
  q.then = (resolve: any, reject: any) => Promise.resolve(loopsResponse).then(resolve, reject);
  return q;
}

function makeLoop(overrides: Record<string, unknown>) {
  return {
    id: "loop",
    status: "open",
    creator_id: "other",
    departure_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    expires_at: null,
    is_female_only: false,
    loop_members: [{ count: 0 }],
    creator: { display_name: "Host", avatar_url: "https://x/avatar.png", reg_no: "23BCE1" },
    ...overrides,
  };
}

const stableProfileRef = { current: profile };
const stableFetchProfile = vi.fn(async () => {});
const stableSetView = vi.fn();
const stableSetSelectedLoop = vi.fn();
const stableSetSelectedLoopState = vi.fn();
const stableSetChatSource = vi.fn();
const stableSetUnreadLoopIds = vi.fn();
const stableReconcileUnread = vi.fn(async () => {});

function renderDirectory(overrides: Record<string, unknown> = {}) {
  return renderHook(() =>
    useLoopDirectory({
      session,
      profile,
      profileRef: stableProfileRef,
      fetchProfile: stableFetchProfile,
      view: "home",
      setView: stableSetView,
      selectedLoop: null,
      setSelectedLoop: stableSetSelectedLoop,
      setSelectedLoopState: stableSetSelectedLoopState,
      setChatSource: stableSetChatSource,
      setUnreadLoopIds: stableSetUnreadLoopIds,
      reconcileUnread: stableReconcileUnread,
      ...overrides,
    })
  );
}

describe("useLoopDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loopsResponse = { data: [], error: null };
    profilesResponse = { data: null, error: null };
    channelHandlers = [];
    membership.userLoops = [];
    membership.joined = [];
    mocks.from.mockImplementation(makeQuery);
    const channel: any = {
      on: vi.fn((_event: string, _filter: unknown, handler: (payload: any) => void) => {
        channelHandlers.push(handler);
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    mocks.channel.mockReturnValue(channel);
  });

  it("fetches, filters, formats, and caches active loops", async () => {
    loopsResponse = {
      data: [
        makeLoop({ id: "future", loop_members: [{ count: 3 }] }),
        makeLoop({
          id: "old",
          departure_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        }),
        makeLoop({ id: "female", is_female_only: true }),
        makeLoop({
          id: "expired",
          expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
        }),
        makeLoop({ id: "mine", creator_id: "user-1", is_female_only: true }),
      ],
      error: null,
    };

    const { result } = renderDirectory();

    await waitFor(() => {
      expect(result.current.activeLoops.map((loop) => loop.id)).toEqual(["future", "mine"]);
    });
    expect(result.current.activeLoops[0].member_count).toBe(3);
    expect(localStorage.getItem("loop_active_loops_cache")).toContain("future");
    expect(mocks.preloadAvatars).toHaveBeenCalled();
  });

  it("registers a newly created loop, persists memberships, and selects it", async () => {
    const setSelectedLoop = vi.fn();
    const { result } = renderDirectory({ setSelectedLoop });

    await waitFor(() => expect(mocks.from).toHaveBeenCalled());

    act(() => {
      result.current.registerCreatedLoop(
        makeLoop({ id: "created", creator_id: "user-1" }) as any
      );
    });

    expect(result.current.activeLoops.some((loop) => loop.id === "created")).toBe(true);
    expect(setSelectedLoop).toHaveBeenCalledWith(expect.objectContaining({ id: "created" }));
    expect(localStorage.getItem("loop_created_loops_user-1")).toContain("created");
    expect(localStorage.getItem("loop_joined_loops_user-1")).toContain("created");
  });

  it("skips redundant fetches inside the 15-second window unless forced", async () => {
    loopsResponse = { data: [makeLoop({ id: "one" })], error: null };
    const { result } = renderDirectory();
    await waitFor(() => expect(result.current.activeLoops).toHaveLength(1));

    const callsBefore = mocks.from.mock.calls.length;
    await act(async () => {
      await result.current.fetchLoops();
    });
    expect(mocks.from).toHaveBeenCalledTimes(callsBefore);

    await act(async () => {
      await result.current.fetchLoops(true);
    });
    expect(mocks.from.mock.calls.length).toBe(callsBefore + 1);
  });

  it("removes cancelled loops from the realtime UPDATE stream", async () => {
    loopsResponse = {
      data: [makeLoop({ id: "future" }), makeLoop({ id: "second" })],
      error: null,
    };
    const { result } = renderDirectory();

    await waitFor(() => expect(result.current.activeLoops).toHaveLength(2));

    const updateHandler = channelHandlers[1];
    act(() => {
      updateHandler({ new: { id: "future", status: "cancelled" } });
    });

    expect(result.current.activeLoops.map((loop) => loop.id)).toEqual(["second"]);
  });

  it("badges unread when a message lands in one of my rides while elsewhere", async () => {
    membership.joined = ["loop-x"];
    membership.joinedRef.current = ["loop-x"];
    profilesResponse = { data: { display_name: "Asha" }, error: null };

    const { result } = renderDirectory();
    await waitFor(() => expect(mocks.from).toHaveBeenCalled());

    const messagesHandler = channelHandlers[5]; // messages INSERT handler (last registered)
    await act(async () => {
      await messagesHandler({
        new: {
          id: "m-1",
          loop_id: "loop-x",
          user_id: "sender-9",
          content: "bus leaves in 5",
          created_at: new Date().toISOString(),
        },
      });
    });

    expect(stableSetUnreadLoopIds).toHaveBeenCalledTimes(1);
    const updater = stableSetUnreadLoopIds.mock.calls.at(-1)![0] as (prev: string[]) => string[];
    expect(typeof updater).toBe("function");
    expect(updater(["existing"])).toEqual(["existing", "loop-x"]);
    // Sender name resolved via the dedup path + destination falls back when loop unknown.
    expect(mocks.sendLocalNotification).toHaveBeenCalledWith(
      "Asha (to your ride)",
      expect.objectContaining({ tag: "loop-msg-loop-x" })
    );
  });

  it("does not badge the chat the user is currently viewing", async () => {
    membership.joined = ["loop-x"];
    membership.joinedRef.current = ["loop-x"];

    renderDirectory({
      view: "chat",
      selectedLoop: makeLoop({ id: "loop-x" }) as any,
    });
    await waitFor(() => expect(mocks.from).toHaveBeenCalled());

    const messagesHandler = channelHandlers[5];
    await act(async () => {
      await messagesHandler({
        new: {
          id: "m-2",
          loop_id: "loop-x",
          user_id: "sender-9",
          content: "hi",
          created_at: new Date().toISOString(),
        },
      });
    });

    expect(stableSetUnreadLoopIds).not.toHaveBeenCalled();
    expect(mocks.sendLocalNotification).not.toHaveBeenCalled();
  });

  it("ignores own messages and messages for rides the user is not in", async () => {
    membership.joined = ["loop-mine"];
    membership.joinedRef.current = ["loop-mine"];
    renderDirectory();
    await waitFor(() => expect(mocks.from).toHaveBeenCalled());

    const messagesHandler = channelHandlers[5];
    await act(async () => {
      await messagesHandler({
        new: {
          id: "m-3",
          loop_id: "loop-mine",
          user_id: "user-1",
          content: "my own message",
          created_at: new Date().toISOString(),
        },
      });
      await messagesHandler({
        new: {
          id: "m-4",
          loop_id: "not-a-member",
          user_id: "someone-else",
          content: "stray event",
          created_at: new Date().toISOString(),
        },
      });
    });

    expect(stableSetUnreadLoopIds).not.toHaveBeenCalled();
  });

  it("adopts a Ride Wanted prefill and enters CreateView once profile is complete", async () => {
    const stableSetCreatePrefill = vi.fn();
    const { result } = renderDirectory({
      profile: { ...profile, reg_no: "22BCE1" } as Profile,
      setCreatePrefill: stableSetCreatePrefill,
    });
    act(() => {
      result.current.setPendingAction({
        type: "create",
        prefill: { destination: "Vijayawada Railway Station", depart_date: "2026-11-01" },
      });
    });
    expect(stableSetView).toHaveBeenCalledWith("create");
    expect(stableSetCreatePrefill).toHaveBeenCalledWith({
      destination: "Vijayawada Railway Station",
      travelDate: "2026-11-01",
    });
  });

  it("reconciles unread with the server once memberships resolve", async () => {
    renderDirectory();
    await waitFor(() => expect(stableReconcileUnread).toHaveBeenCalled());
  });
});
