import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatListView from "@/components/sections/ChatListView";

const mockUseLoop = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => mockUseLoop(),
}));

vi.mock("@/components/ui/NativeToast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const nowIso = (minutesAgo = 0) => new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

const listRows = [
  {
    loop_id: "loop-1",
    content: "Leaving from the main gate now",
    created_at: nowIso(4),
    user_id: "rider-2",
    profiles: [{ display_name: "Alex" }],
  },
  {
    loop_id: "loop-2",
    content: "Location shared: https://maps.google.com/maps?q=16.5,80.6",
    created_at: nowIso(9),
    user_id: "rider-3",
    profiles: [{ display_name: "Priya" }],
  },
];

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

let listData: any[] = listRows;

vi.mock("@/lib/supabase", () => {
  const createQueryChain = (): any => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve({ data: listData, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => chain),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  };
  return {
    supabase: {
      from: vi.fn(() => createQueryChain()),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

const makeLoop = (id: string, destination: string) => ({
  id,
  creator_id: "host-1",
  start_point: "VIT-AP Main Gate",
  destination,
  departure_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  participants_limit: 4,
  member_count: 2,
  status: "open",
});

const baseContext = {
  session: { user: { id: "user-1" } },
  profile: { display_name: "Sanjay", reg_no: "24MIC7130", gender: "male", avatar_url: null },
  theme: {
    isDark: true,
    bg: "bg-black",
    border: "border-white/10",
    cardBg: "bg-zinc-900",
    mutedText: "text-zinc-400",
    text: "text-white",
  },
  activeLoops: [makeLoop("loop-1", "Vijayawada Station"), makeLoop("loop-2", "Amaravati")],
  userJoinedLoops: ["loop-1", "loop-2"],
  unreadLoopIds: ["loop-1"],
  markLoopAsRead: vi.fn(),
  setSelectedLoop: vi.fn(),
  setChatSource: vi.fn(),
  setView: vi.fn(),
  isChatSearchOpen: false,
};

describe("ChatListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listData = listRows;
    mockUseLoop.mockReturnValue(baseContext);
  });

  it("shows the empty state when the user has no joined rides", () => {
    mockUseLoop.mockReturnValue({ ...baseContext, userJoinedLoops: [], activeLoops: [] });
    render(<ChatListView />);
    expect(screen.getByText(/no active chats/i)).toBeInTheDocument();
  });

  it("renders a card per joined ride with the latest sender preview", async () => {
    render(<ChatListView />);
    expect(await screen.findByText("Vijayawada Station")).toBeInTheDocument();
    expect(screen.getByText("Amaravati")).toBeInTheDocument();
    // Plain-text preview renders the raw content…
    expect(await screen.findByText(/leaving from the main gate now/i)).toBeInTheDocument();
    // …and a location share from another member renders the sender-name form.
    expect(await screen.findByText("Location shared by Priya")).toBeInTheDocument();
  });

  it("marks the unread ride with a pulse ring but not the read one", () => {
    const { container } = render(<ChatListView />);
    const cards = container.querySelectorAll('[role="button"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].className).toContain("ring-1"); // loop-1 unread
    expect(cards[1].className).not.toContain("ring-1"); // loop-2 read
    const pulses = container.querySelectorAll("span.animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("opens the ride chat, clears the unread blob, and sets the chat source", () => {
    const { container } = render(<ChatListView />);
    const unreadCard = container.querySelectorAll('[role="button"]')[0];
    fireEvent.click(unreadCard);

    expect(baseContext.markLoopAsRead).toHaveBeenCalledWith("loop-1");
    expect(baseContext.setSelectedLoop).toHaveBeenCalledWith(
      expect.objectContaining({ id: "loop-1", destination: "Vijayawada Station" })
    );
    expect(baseContext.setChatSource).toHaveBeenCalledWith("chat-list");
    expect(baseContext.setView).toHaveBeenCalledWith("chat");
  });

  it("opens via keyboard (Enter) without a pointer event", () => {
    const { container } = render(<ChatListView />);
    const unreadCard = container.querySelectorAll('[role="button"]')[0];
    fireEvent.keyDown(unreadCard, { key: "Enter" });

    expect(baseContext.markLoopAsRead).toHaveBeenCalledWith("loop-1");
    expect(baseContext.setView).toHaveBeenCalledWith("chat");
  });

  it("shows the no-match state when a search query filters everything out", () => {
    mockUseLoop.mockReturnValue({ ...baseContext, isChatSearchOpen: true });
    render(<ChatListView />);
    const input = screen.getByPlaceholderText("Search conversations...");
    fireEvent.change(input, { target: { value: "nonexistent-place-xyz" } });
    expect(screen.getByText("No chats found")).toBeInTheDocument();
  });

  it("returns home from the empty state via Explore Campus Rides", () => {
    mockUseLoop.mockReturnValue({ ...baseContext, userJoinedLoops: [], activeLoops: [] });
    render(<ChatListView />);
    fireEvent.click(screen.getByText("Explore Campus Rides"));
    expect(baseContext.setView).toHaveBeenCalledWith("home");
  });
});
