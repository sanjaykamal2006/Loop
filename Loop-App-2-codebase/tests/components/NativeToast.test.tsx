import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import Toaster, { toast } from "@/components/ui/NativeToast";

describe("NativeToast & Toaster Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("renders nothing initially when no toast is dispatched", () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild).toBeNull();
  });

  it("renders success toast and automatically dismisses after timeout", () => {
    render(<Toaster />);

    act(() => {
      toast.success("Ride created successfully!");
    });

    expect(screen.getByText("Ride created successfully!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2350);
    });

    expect(screen.queryByText("Ride created successfully!")).not.toBeInTheDocument();
  });

  it("renders error toast and dismisses after error timeout", () => {
    render(<Toaster />);

    act(() => {
      toast.error("Network request failed");
    });

    expect(screen.getByText("Network request failed")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2650);
    });

    expect(screen.queryByText("Network request failed")).not.toBeInTheDocument();
  });

  it("renders info toast and dismisses after timeout", () => {
    render(<Toaster />);

    act(() => {
      toast.info("Connecting to ride chat...");
    });

    expect(screen.getByText("Connecting to ride chat...")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2350);
    });

    expect(screen.queryByText("Connecting to ride chat...")).not.toBeInTheDocument();
  });

  it("ignores empty or falsey toast messages", () => {
    render(<Toaster />);

    act(() => {
      toast.success("");
      toast.error("");
      toast.info("");
    });

    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });
});
