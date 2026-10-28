import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppHeader from "@/components/sections/AppHeader";
import * as rideWantsLib from "@/lib/rideWants";

const mockSetView = vi.fn();
const mockFetchLoops = vi.fn();
const mockFetchUserMemberships = vi.fn();

const defaultContext = {
  view: "home",
  setView: mockSetView,
  selectedLoop: null,
  theme: {
    isDark: true,
    border: "border-zinc-800",
    cardBg: "bg-zinc-900",
    mutedText: "text-zinc-400",
  },
  fetchLoops: mockFetchLoops,
  fetchUserMemberships: mockFetchUserMemberships,
  chatSource: "home",
  userJoinedLoops: [],
  activeLoops: [],
  setShowEmergencyContactModal: vi.fn(),
  setShowTermsModal: vi.fn(),
  setShowTeluguGuideModal: vi.fn(),
  setShowCreatorModal: vi.fn(),
  setShowBuyCoffeeModal: vi.fn(),
  toggleMessageSearch: vi.fn(),
  toggleChatSearch: vi.fn(),
};

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => defaultContext,
}));

vi.mock("@/components/ui/NativeToast", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe("AppHeader Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultContext.view = "home";
  });

  it("renders LOOP title, refresh button, and Co-Travellers chip on home view", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: [{ destination_key: "vijayawada", depart_date: "2026-10-25", intent_count: 5, has_mine: false, first_depart_time: null }],
      error: null,
    });

    render(<AppHeader />);

    expect(screen.getByText("LOOP")).toBeInTheDocument();
    expect(screen.getByText("Rides go better in Loop.")).toBeInTheDocument();

    const coTravellerBtn = screen.getByTestId("wants-board-header-btn");
    expect(coTravellerBtn).toBeInTheDocument();
    expect(coTravellerBtn).toHaveTextContent("Co-Travellers");

    // Click Co-Travellers chip
    fireEvent.click(coTravellerBtn);
    expect(mockSetView).toHaveBeenCalledWith("wants");

    // Hot badge should be displayed
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("triggers refresh on refresh button click", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: [],
      error: null,
    });
    mockFetchLoops.mockResolvedValueOnce([]);
    mockFetchUserMemberships.mockResolvedValueOnce([]);

    render(<AppHeader />);

    const refreshBtn = screen.getByLabelText("Refresh rides");
    fireEvent.click(refreshBtn);

    expect(mockFetchLoops).toHaveBeenCalledWith(true);
    expect(mockFetchUserMemberships).toHaveBeenCalledWith(true);
  });
});
