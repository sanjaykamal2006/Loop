import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders LOOP title and refresh button on home view", async () => {
    render(<AppHeader />);

    expect(screen.getByText("LOOP")).toBeInTheDocument();
    expect(screen.getByText("Rides go better in Loop.")).toBeInTheDocument();

    const refreshBtn = screen.getByLabelText("Refresh rides");
    expect(refreshBtn).toBeInTheDocument();
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
