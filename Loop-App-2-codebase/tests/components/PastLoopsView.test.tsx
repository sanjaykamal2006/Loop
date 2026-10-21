import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PastLoopsView from "@/components/sections/PastLoopsView";

const mockUseLoop = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => mockUseLoop(),
}));

vi.mock("@/lib/haptics", () => ({ triggerHaptic: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

const interactions = {
  setView: vi.fn(),
  setSelectedLoop: vi.fn(),
  formatTime: vi.fn(() => "10:15 AM"),
};

const baseContext = {
  session: { user: { id: "u1" } },
  theme: {
    isDark: true,
    bg: "bg-black",
    border: "border-white/10",
    cardBg: "bg-zinc-900",
    mutedText: "text-zinc-400",
    text: "text-white",
  },
};

function makePastLoop(overrides: Record<string, unknown> = {}) {
  return {
    id: "past-1",
    creator_id: "u1",
    start_point: "VIT-AP Gate",
    destination: "Vijayawada Station",
    departure_time: new Date("2026-10-05T10:00:00Z").toISOString(),
    created_at: new Date("2026-10-05T09:00:00Z").toISOString(),
    participants_limit: 4,
    status: "ended",
    ...overrides,
  };
}

describe("PastLoopsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseLoop.mockReturnValue({ ...baseContext, setView: interactions.setView, setSelectedLoop: interactions.setSelectedLoop, formatTime: interactions.formatTime });
  });

  it("shows the empty state with an Explore shortcut when no history exists", async () => {
    render(<PastLoopsView />);
    expect(await screen.findByText("No Past Loops Found")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Find Active Loops"));
    expect(interactions.setView).toHaveBeenCalledWith("home");
  });

  it("renders ended and cancelled rides with status badges and selects on click", async () => {
    const created = makePastLoop({ id: "created-1", status: "ended" });
    const membered = makePastLoop({ id: "membered-1", status: "cancelled", destination: "Amaravati" });

    // Prime the two parallel queries the view fires on mount.
    const mod = await import("@/lib/supabase");
    const fromMock = (mod as any).supabase.from as ReturnType<typeof vi.fn>;
    fromMock.mockImplementation((table: string) => {
      const q: any = {
        select: vi.fn(() => q),
        eq: vi.fn(() => q),
        in: vi.fn(() => q),
        order: vi.fn(() => q),
        then: (resolve: any, reject: any) => {
          const payload =
            table === "loops"
              ? { data: [created], error: null }
              : { data: [{ loop_id: "membered-1", loops: membered }], error: null };
          return Promise.resolve(payload).then(resolve, reject);
        },
      };
      return q;
    });

    render(<PastLoopsView />);

    expect(await screen.findByText("Vijayawada Station")).toBeInTheDocument();
    expect(screen.getByText("Amaravati")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();

    // Click the completed card → ride-details navigation.
    const card = screen.getByText("Vijayawada Station").closest("div[class*='cursor-pointer']");
    fireEvent.click(card as HTMLElement);
    await waitFor(() => {
      expect(interactions.setSelectedLoop).toHaveBeenCalledWith(expect.objectContaining({ id: "created-1" }));
      expect(interactions.setView).toHaveBeenCalledWith("ride-details");
    });
  });

  it("seeds instantly from the per-user localStorage cache", async () => {
    localStorage.setItem("loop_past_loops_cache_u1", JSON.stringify([makePastLoop({ id: "cached-1" })]));

    const { container } = render(<PastLoopsView />);
    // Cached rows paint synchronously on the first render — no skeleton round-trip.
    expect(screen.getByText("Vijayawada Station")).toBeInTheDocument();
    expect(screen.getByText("Ride History")).toBeInTheDocument();
    expect(screen.queryByText("No Past Loops Found")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("animate-pulse");
  });
});
