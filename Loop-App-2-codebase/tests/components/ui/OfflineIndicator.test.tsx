import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import OfflineIndicator from "@/components/ui/OfflineIndicator";

const mockFetchLoops = vi.fn();
const mockFetchUserMemberships = vi.fn();

vi.mock("@/lib/LoopContext", () => ({
  useLoop: () => ({
    fetchLoops: mockFetchLoops,
    fetchUserMemberships: mockFetchUserMemberships,
  }),
}));

describe("OfflineIndicator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is hidden when browser is online", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    render(<OfflineIndicator isDark={true} />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it("surfaces offline badge when offline event fires", () => {
    render(<OfflineIndicator isDark={true} />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("shows synced badge and re-fetches rides when online event fires", () => {
    render(<OfflineIndicator isDark={true} />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/offline/i)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.getByText(/synced/i)).toBeInTheDocument();
    expect(mockFetchLoops).toHaveBeenCalledWith(true);
    expect(mockFetchUserMemberships).toHaveBeenCalledWith(true);
  });
});
