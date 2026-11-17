import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PullToRefresh from "@/components/ui/PullToRefresh";

describe("PullToRefresh Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children content cleanly", () => {
    const handleRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <PullToRefresh onRefresh={handleRefresh} isDark={true}>
        <div>Active Rides List</div>
      </PullToRefresh>
    );

    expect(screen.getByText("Active Rides List")).toBeInTheDocument();
  });

  it("triggers onRefresh when pulled down past threshold", async () => {
    const handleRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PullToRefresh onRefresh={handleRefresh} isDark={true}>
        <div>Active Rides List</div>
      </PullToRefresh>
    );

    const touchArea = container.firstChild as HTMLElement;

    // Simulate touch pull sequence
    fireEvent.touchStart(touchArea, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(touchArea, { touches: [{ clientY: 260 }] });
    fireEvent.touchEnd(touchArea);

    await waitFor(() => {
      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("does not trigger onRefresh when pull distance is small", () => {
    const handleRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PullToRefresh onRefresh={handleRefresh} isDark={true}>
        <div>Active Rides List</div>
      </PullToRefresh>
    );

    const touchArea = container.firstChild as HTMLElement;

    fireEvent.touchStart(touchArea, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(touchArea, { touches: [{ clientY: 110 }] }); // very small pull
    fireEvent.touchEnd(touchArea);

    expect(handleRefresh).not.toHaveBeenCalled();
  });
});
