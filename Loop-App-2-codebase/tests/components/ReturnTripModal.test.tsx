import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReturnTripModal from "@/components/sections/ReturnTripModal";
import type { PrimaryLoopDetails } from "@/components/sections/ReturnTripModal";

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

const interactions = {
  fromTargets: [] as string[],
  openInsertCalls: [] as any[],
  memberInsertCalls: [] as any[],
  messageInsertCalls: [] as any[],
  failLoopInsert: false,
};

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase", () => {
  const createQueryChain = (target: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      order: vi.fn(() => chain),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => chain),
      insert: vi.fn((payload: any) => {
        if (target === "loops") interactions.openInsertCalls.push(payload);
        if (target === "loop_members") interactions.memberInsertCalls.push(payload);
        if (target === "messages") interactions.messageInsertCalls.push(payload);
        return chain;
      }),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      // loops.insert(...) selects a single created row; surfaces a failure when
      // an individual test flips `failLoopInsert`.
      single: vi.fn(() =>
        Promise.resolve(
          interactions.failLoopInsert
            ? { data: null, error: { message: "insert failed" } }
            : { data: { id: "ret-1" }, error: null }
        )
      ),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn((target: string) => {
        interactions.fromTargets.push(target);
        return createQueryChain(target);
      }),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

// Shared mutable patch flag used by individual test cases.
(interactions as any).failLoopInsert = false;

const baseContext = {
  session: { user: { id: "author-1" } },
  theme: {
    isDark: true,
    bg: "bg-black",
    border: "border-white/10",
    cardBg: "bg-zinc-900",
    mutedText: "text-zinc-400",
    text: "text-white",
  },
  setView: vi.fn(),
  fetchLoops: vi.fn(),
  fetchUserMemberships: vi.fn(),
};

// Outbound ride departs tomorrow 09 AM — always in the future, so date rot
// never breaks the suite (mirrors the ChatView fixture convention).
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const tomorrowIso = tomorrow.toISOString().slice(0, 10);

const primaryLoop: PrimaryLoopDetails = {
  id: "out-1",
  startPoint: "VIT-AP Main Gate",
  destination: "Vijayawada Station",
  travelDate: tomorrowIso,
  hour: "09",
  minute: "00",
  ampm: "AM",
  limit: 4,
  isFemaleOnly: false,
  isDriver: false,
  vehicleType: null,
};

describe("ReturnTripModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    interactions.fromTargets = [];
    interactions.openInsertCalls = [];
    interactions.memberInsertCalls = [];
    interactions.messageInsertCalls = [];
    (interactions as any).failLoopInsert = false;
    mockUseLoop.mockReturnValue(baseContext);
  });

  it("renders nothing when closed", () => {
    const { container } = render(<ReturnTripModal isOpen={false} onClose={vi.fn()} primaryLoop={primaryLoop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the reversed route strip and dialog", () => {
    render(<ReturnTripModal isOpen onClose={vi.fn()} primaryLoop={primaryLoop} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Plan return trip");
    expect(screen.getByText("Vijayawada Station")).toBeInTheDocument(); // From (outbound destination)
    expect(screen.getByText("VIT-AP Main Gate")).toBeInTheDocument(); // To (outbound start)
    expect(screen.getByRole("button", { name: /plan return/i })).toBeInTheDocument();
  });

  it("closes via Not Now without any database writes", async () => {
    const onClose = vi.fn();
    render(<ReturnTripModal isOpen onClose={onClose} primaryLoop={primaryLoop} />);
    const before = interactions.fromTargets.slice();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /not now/i }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(interactions.fromTargets.slice(before.length)).toEqual([]); // no writes on skip
  });

  it("blocks submitting a return trip that departs before the outbound ride", async () => {
    const onClose = vi.fn();
    const { toast } = await import("@/components/ui/NativeToast");
    render(<ReturnTripModal isOpen onClose={onClose} primaryLoop={primaryLoop} />);

    // Native time input: set 06:00 AM → earlier than outbound 09:00 on the same day.
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(timeInput, { target: { value: "06:00" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /plan return/i }));
    });

    expect(toast.error).toHaveBeenCalledWith("Return time cannot be earlier than departure");
    expect(onClose).not.toHaveBeenCalled();
    expect(interactions.openInsertCalls).toEqual([]); // nothing written
  });

  it("creates the return ride, registers the host, and posts the chat announcement", async () => {
    const onClose = vi.fn();
    render(<ReturnTripModal isOpen onClose={onClose} primaryLoop={primaryLoop} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /plan return/i }));
    });

    await waitFor(() => {
      expect(interactions.openInsertCalls).toHaveLength(1);
    });
    // Reversed route: starts where the outbound ended.
    expect(interactions.openInsertCalls[0]).toMatchObject({
      start_point: "Vijayawada Station",
      destination: "VIT-AP Main Gate",
      purpose: "return",
      status: "open",
      is_female_only: false,
    });
    expect(interactions.memberInsertCalls[0]).toMatchObject({ loop_id: "ret-1", user_id: "author-1" });

    // Announcement content carries the interactive return_loop marker.
    expect(interactions.messageInsertCalls).toHaveLength(1);
    expect(interactions.messageInsertCalls[0]).toMatchObject({
      loop_id: "out-1",
      user_id: "author-1",
    });
    expect(interactions.messageInsertCalls[0].content).toContain("[return_loop:ret-1]");

    await waitFor(() => {
      expect(baseContext.fetchLoops).toHaveBeenCalledWith(true);
      expect(baseContext.fetchUserMemberships).toHaveBeenCalledWith(true);
      expect(onClose).toHaveBeenCalled();
      expect(baseContext.setView).toHaveBeenCalledWith("home");
    });
  });

  it("surfaces a friendly toast when the return ride insert fails", async () => {
    const { toast } = await import("@/components/ui/NativeToast");
    const onClose = vi.fn();
    (interactions as any).failLoopInsert = true;
    render(<ReturnTripModal isOpen onClose={onClose} primaryLoop={primaryLoop} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /plan return/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create return loop. Please try again.");
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(baseContext.setView).not.toHaveBeenCalled();
    expect(interactions.messageInsertCalls).toEqual([]); // no announcement on failure
  });
});
