import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MessageActionModal } from "@/components/chat/MessageActionModal";
import GenderModal from "@/components/sections/GenderModal";
import type { Message } from "@/lib/types";

vi.mock("@/components/ui/NativeToast", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const formatTime = vi.fn(() => "3:40 PM");

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: "m-1",
    loop_id: "loop-1",
    user_id: "u1",
    content: "plain text message",
    created_at: new Date().toISOString(),
    reactions: {},
    profiles: { display_name: "Alex", avatar_url: null },
    ...overrides,
  } as Message;
}

const theme = {
  isDark: true,
  cardBg: "bg-zinc-900",
  border: "border-white/10",
  text: "text-white",
  mutedText: "text-zinc-400",
};

describe("MessageActionModal", () => {
  const onClose = vi.fn();
  const onStartEdit = vi.fn();
  const onDeleteMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });

  it("renders nothing without an open action menu", () => {
    const { container } = render(
      <MessageActionModal
        actionMenuMsg={null}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the quoted message and only copy/cancel for other members' messages", () => {
    const onSubmit = render(
      <MessageActionModal
        actionMenuMsg={makeMsg({ user_id: "u2", content: "hey there" })}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    ).unmount;

    expect(screen.getByRole("dialog", { name: "Message actions" })).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("hey there")).toBeInTheDocument();
    expect(screen.queryByText("Edit Message")).not.toBeInTheDocument(); // not mine
    expect(screen.queryByText("Delete Message")).not.toBeInTheDocument(); // not mine, not host
    expect(screen.getByText("Copy Text")).toBeInTheDocument();
    onSubmit();
  });

  it("offers edit for the owner's plain message, hiding it for location shares", () => {
    const { rerender } = render(
      <MessageActionModal
        actionMenuMsg={makeMsg({ content: "my plain message" })}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );
    expect(screen.getByText("Edit Message")).toBeInTheDocument();

    rerender(
      <MessageActionModal
        actionMenuMsg={makeMsg({ content: "Location shared: https://maps.google.com/?q=16.5" })}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );
    expect(screen.queryByText("Edit Message")).not.toBeInTheDocument();
    expect(screen.getByText("Delete Message")).toBeInTheDocument(); // own message
    expect(screen.getByText("Permanently remove this message")).toBeInTheDocument();
  });

  it("copies the message text and closes", async () => {
    const { toast } = await import("@/components/ui/NativeToast");

    render(
      <MessageActionModal
        actionMenuMsg={makeMsg({ user_id: "u2", content: "share this!" })}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );

    fireEvent.click(screen.getByText("Copy Text"));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Message copied!");
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("share this!");
    expect(onClose).toHaveBeenCalled();
  });

  it("copies the location link, not the wrapper text, for location messages", async () => {
    const { toast } = await import("@/components/ui/NativeToast");

    render(
      <MessageActionModal
        actionMenuMsg={makeMsg({ user_id: "u2", content: "Location shared: https://maps.google.com/?q=16.5,80.6" })}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );

    fireEvent.click(screen.getByText("Copy Text"));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Location link copied!");
    });
    // Coordinates are normalized into a canonical maps URL instead of the raw text.
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://maps.google.com/maps?q=16.5,80.6");
  });

  it("starts editing for the owner and deletes for the host", () => {
    render(
      <MessageActionModal
        actionMenuMsg={makeMsg({ user_id: "u2" })}
        sessionUserId="u1"
        isHost
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );

    // Host can moderate someone else's message; edit stays owner-only.
    expect(screen.getByText("Remove message as ride host")).toBeInTheDocument();
    expect(screen.queryByText("Edit Message")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete Message"));
    expect(onDeleteMessage).toHaveBeenCalledWith("m-1");
    expect(onClose).toHaveBeenCalled();
  });

  it("dismisses on backdrop click and on the cancel button", () => {
    render(
      <MessageActionModal
        actionMenuMsg={makeMsg()}
        sessionUserId="u1"
        isHost={false}
        {...theme}
        formatTime={formatTime}
        onClose={onClose}
        onStartEdit={onStartEdit}
        onDeleteMessage={onDeleteMessage}
      />
    );

    fireEvent.click(screen.getByRole("dialog", { name: "Message actions" }));
    expect(onClose).not.toHaveBeenCalled(); // inner click stops propagation

    fireEvent.click(screen.getByText("Cancel").closest("button") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

const loopCtx = {
  showGenderSelect: false,
  setShowGenderSelect: vi.fn(),
  profile: { display_name: "", reg_no: "", gender: null },
  updateProfile: vi.fn(),
  theme: {
    isDark: true,
    cardBg: "bg-zinc-900",
    border: "border-white/10",
    mutedText: "text-zinc-400",
  },
  pendingAction: null,
  setPendingAction: vi.fn(),
  joinLoop: vi.fn(),
  setView: vi.fn(),
};

const mockUseLoop = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => mockUseLoop(),
}));

describe("GenderModal (required onboarding)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The dialog is visible unless a test explicitly hides it.
    mockUseLoop.mockReturnValue({ ...loopCtx, showGenderSelect: true });
  });

  it("stays hidden until the onboarding gate requests it", () => {
    mockUseLoop.mockReturnValue({ ...loopCtx, showGenderSelect: false });
    const { container } = render(<GenderModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("validates name, role, and gender before saving", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    render(<GenderModal />);

    fireEvent.click(screen.getByText("Save & Continue"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Name is required"));

    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Sanjay" } });
    fireEvent.click(screen.getByText("Save & Continue"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("College, Workplace, or Tag is required"));

    fireEvent.change(screen.getByPlaceholderText("e.g. Google, VIT-AP, Designer"), {
      target: { value: "VIT-AP" },
    });
    fireEvent.click(screen.getByText("Save & Continue"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Gender is required"));
    expect(loopCtx.updateProfile).not.toHaveBeenCalled();
  });

  it("persists the profile and resumes the join flow", async () => {
    loopCtx.updateProfile.mockResolvedValue(true);
    mockUseLoop.mockReturnValue({
      ...loopCtx,
      showGenderSelect: true,
      pendingAction: { type: "join", data: { id: "loop-9", destination: "Station" } },
    });

    render(<GenderModal />);

    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Sanjay" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Google, VIT-AP, Designer"), {
      target: { value: "24MIC7130" },
    });
    fireEvent.click(screen.getByRole("button", { name: "male" }));
    fireEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() => {
      expect(loopCtx.updateProfile).toHaveBeenCalledWith({
        display_name: "Sanjay",
        reg_no: "24MIC7130",
        gender: "male",
      });
    });
    await waitFor(() => {
      expect(loopCtx.setPendingAction).toHaveBeenCalledWith(null);
      expect(loopCtx.joinLoop).toHaveBeenCalledWith({ id: "loop-9", destination: "Station" }, {
        display_name: "Sanjay",
        reg_no: "24MIC7130",
        gender: "male",
      });
    });
  });

  it("routes finished creators to the create view instead of re-joining", async () => {
    loopCtx.updateProfile.mockResolvedValue(true);
    mockUseLoop.mockReturnValue({
      ...loopCtx,
      showGenderSelect: true,
      pendingAction: { type: "create", data: null },
    });

    render(<GenderModal />);
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "A" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Google, VIT-AP, Designer"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "female" }));
    fireEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() => {
      expect(loopCtx.setView).toHaveBeenCalledWith("create");
      expect(loopCtx.joinLoop).not.toHaveBeenCalled();
    });
  });
});
