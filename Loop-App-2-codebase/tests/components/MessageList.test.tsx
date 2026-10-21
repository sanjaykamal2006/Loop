import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatRoom } from "@/components/chat/useChatRoom";
import { clearProfileNameCache } from "@/lib/profileNameCache";

const mockUseLoop = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => mockUseLoop(),
}));

const chatScrollRef = React.createRef<HTMLDivElement>();
const messagesEndRef = React.createRef<HTMLDivElement>();
const didTriggerHoldRef = { current: false };

const baseContext = {
  session: { user: { id: "user-1" } },
  profile: {
    display_name: "Sanjay",
    avatar_url: null,
    reg_no: "24MIC7130",
    gender: "male",
    bio: "",
    phone_number: "9876543210",
    is_student_verified: true,
  },
  theme: {
    isDark: true,
    bg: "bg-black",
    border: "border-white/10",
    cardBg: "bg-zinc-900",
    mutedText: "text-zinc-400",
    text: "text-white",
  },
  formatTime: vi.fn((iso: string) => "10:15 AM"),
};

interface RoomOverrides {
  [key: string]: unknown;
}

function makeRoom(overrides: RoomOverrides = {}): ChatRoom {
  return {
    messages: [],
    hasMoreMessages: false,
    isLoadingMore: false,
    loadMoreMessages: vi.fn(),
    searchQuery: "",
    matchingMsgIds: new Set<string>(),
    editingMsgId: null,
    setEditingMsgId: vi.fn(),
    editingContent: "",
    setEditingContent: vi.fn(),
    saveEditMessage: vi.fn(),
    holdingMsgId: null,
    didTriggerHoldRef: didTriggerHoldRef as ChatRoom["didTriggerHoldRef"],
    startHold: vi.fn(),
    moveHold: vi.fn(),
    endHold: vi.fn(),
    setActionMenuMsg: vi.fn(),
    startEditMessage: vi.fn(),
    handleOpenReturnLoop: vi.fn(),
    setSelectedUser: vi.fn(),
    chatScrollRef,
    messagesEndRef,
    ...overrides,
  } as unknown as ChatRoom;
}

const msg = (id: string, userId: string, content: string, opts: { createdAt?: string } = {}) => ({
  id,
  loop_id: "loop-1",
  user_id: userId,
  content,
  created_at: opts.createdAt || "2026-10-19T10:15:00Z",
  reactions: {},
  profiles: { display_name: userId === "user-1" ? "Sanjay" : "Alex", avatar_url: null },
});

describe("MessageList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProfileNameCache();
    mockUseLoop.mockReturnValue(baseContext);
  });

  it("shows the empty chat state", () => {
    render(<MessageList room={makeRoom()} />);
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveAttribute("aria-label", "Chat messages");
  });

  it("renders messages with my bubbles and other members' bubbles", () => {
    render(
      <MessageList
        room={makeRoom({ messages: [msg("m-1", "user-1", "hi from me"), msg("m-2", "user-2", "hello back")] })}
      />
    );
    expect(screen.getByText("hi from me")).toBeInTheDocument();
    expect(screen.getByText("hello back")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument(); // sender label for my message
    expect(screen.getByText("Alex")).toBeInTheDocument(); // sender label for theirs
    expect(screen.getAllByText("10:15 AM").length).toBe(2);
  });

  it("hides the sender header when consecutive messages share a sender", () => {
    render(
      <MessageList
        room={makeRoom({
          messages: [msg("m-1", "user-2", "first"), msg("m-2", "user-2", "second")],
        })}
      />
    );
    expect(screen.getAllByText("Alex")).toHaveLength(1);
  });

  it("shows and wires the load-older-messages control", () => {
    const loadMoreMessages = vi.fn();
    const { rerender } = render(
      <MessageList
        room={makeRoom({ hasMoreMessages: true, loadMoreMessages, messages: [msg("m-1", "user-1", "x")] })}
      />
    );
    const btn = screen.getByText("↑ Load older messages");
    fireEvent.click(btn);
    expect(loadMoreMessages).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        room={makeRoom({ hasMoreMessages: true, isLoadingMore: true, messages: [msg("m-1", "user-1", "x")] })}
      />
    );
    expect(screen.getByText("Loading older messages...")).toBeInTheDocument();
  });

  it("dims optimistic rows and never offers them the options menu", () => {
    const { container } = render(
      <MessageList
        room={{
          ...makeRoom({ messages: [msg("temp-123", "user-1", "sending...")] }),
        }}
      />
    );
    const bubble = container.querySelector("div.opacity-60");
    expect(bubble).toBeInTheDocument();
    expect(screen.queryByLabelText("Message options")).not.toBeInTheDocument();
  });

  it("offers message options only for persisted rows", () => {
    const setActionMenuMsg = vi.fn();
    const { container } = render(
      <MessageList room={makeRoom({ messages: [msg("m-1", "user-1", "settled")], setActionMenuMsg })} />
    );
    expect(screen.getByLabelText("Message options")).toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("settled").closest(".relative") as HTMLElement);
    expect(setActionMenuMsg).toHaveBeenCalledTimes(1);
    expect(setActionMenuMsg).toHaveBeenCalledWith(expect.objectContaining({ id: "m-1" }));
  });

  it("renders the return-trip card interactive action", () => {
    const handleOpenReturnLoop = vi.fn();
    render(
      <MessageList
        room={makeRoom({
          messages: [msg("m-1", "user-2", "Return trip available! Check it out [return_loop:loop-9]")],
          handleOpenReturnLoop,
        })}
      />)
    ;
    fireEvent.click(screen.getByRole("button", { name: /view return ride/i }));
    expect(handleOpenReturnLoop).toHaveBeenCalledWith("loop-9");
  });

  it("renders location shares with a maps link", () => {
    render(
      <MessageList
        room={makeRoom({
          messages: [msg("m-1", "user-2", "Location shared: https://maps.google.com/maps?q=16.5,80.6")],
        })}
      />
    );
    const link = screen.getByText(/open in maps/i).closest("a") as HTMLAnchorElement;
    expect(link.href).toContain("maps.google.com");
    expect(screen.getByText(/shared by alex/i)).toBeInTheDocument();
  });

  it("drives the inline edit box: save on Enter, cancel on Escape", () => {
    const saveEditMessage = vi.fn();
    const setEditingMsgId = vi.fn();
    const setEditingContent = vi.fn();
    render(
      <MessageList
        room={makeRoom({
          messages: [msg("m-1", "user-1", "drafted text")],
          editingMsgId: "m-1",
          editingContent: "drafted text",
          setEditingMsgId,
          setEditingContent,
          saveEditMessage,
        })}
      />
    );
    const input = screen.getByDisplayValue("drafted text");
    fireEvent.change(input, { target: { value: "final text" } });
    expect(setEditingContent).toHaveBeenCalledWith("final text");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(saveEditMessage).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: "Escape" });
    expect(setEditingMsgId).toHaveBeenCalledWith(null);
  });

  it("starts editing on double-click for my text messages", () => {
    const startEditMessage = vi.fn();
    const { container } = render(
      <MessageList room={makeRoom({ messages: [msg("m-1", "user-1", "tap tap")], startEditMessage })} />
    );
    const bubble = screen.getByText("tap tap").closest(".relative") as HTMLElement;
    fireEvent.doubleClick(bubble);
    expect(startEditMessage).toHaveBeenCalledWith(expect.objectContaining({ id: "m-1" }));
  });

  it("does not enable editing through double-click on other members' bubbles", () => {
    const startEditMessage = vi.fn();
    const { container } = render(
      <MessageList room={makeRoom({ messages: [msg("m-1", "user-2", "theirs")], startEditMessage })} />
    );
    const bubble = screen.getByText("theirs").closest(".relative") as HTMLElement;
    fireEvent.doubleClick(bubble);
    expect(startEditMessage).not.toHaveBeenCalled();
  });

  it("opens the member profile modal when the sender label is clicked", () => {
    const setSelectedUser = vi.fn();
    render(
      <MessageList room={makeRoom({ messages: [msg("m-1", "user-2", "hey")], setSelectedUser })} />
    );
    fireEvent.click(screen.getByText("Alex"));
    expect(setSelectedUser).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-2", display_name: "Alex" })
    );
  });

  it("highlights search matches and dims non-matching bubbles", () => {
    const { container } = render(
      <MessageList
        room={makeRoom({
          messages: [msg("m-1", "user-1", "matched phrase"), msg("m-2", "user-2", "other text")],
          searchQuery: "matched",
          matchingMsgIds: new Set(["m-1"]),
        })}
      />
    );
    const matched = screen.getByText("matched phrase").closest(".relative") as HTMLElement;
    const other = screen.getByText("other text").closest(".relative") as HTMLElement;
    expect(matched.className).toContain("ring-2");
    expect(other.className).toContain("opacity-35");
  });

  it("shows the no-search-hit state", () => {
    render(<MessageList room={makeRoom({ searchQuery: "zzz", matchingMsgIds: new Set() })} />);
    expect(screen.getByText("No messages found")).toBeInTheDocument();
    expect(screen.getByText("No message matches “zzz”")).toBeInTheDocument();
  });
});
