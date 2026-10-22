import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRideWants } from "@/components/sections/useRideWants";
import * as rideWantsLib from "@/lib/rideWants";
import { toast } from "@/components/ui/NativeToast";

vi.mock("@/components/ui/NativeToast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useRideWants hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches active board on mount and sets wants state", async () => {
    const mockBoard = [
      { destination_key: "vijayawada", depart_date: "2026-10-25", intent_count: 3, has_mine: false },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: mockBoard,
      error: null,
    });

    const { result } = renderHook(() => useRideWants());

    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.wants).toEqual(mockBoard);
  });

  it("toasts an error when fetching board fails", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: null,
      error: { message: "Failed to connect" },
    });

    const { result } = renderHook(() => useRideWants());

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Failed to connect");
    expect(result.current.wants).toEqual([]);
  });

  it("posts demand and handles count < 2 message", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({
      data: [],
      error: null,
    });
    const postSpy = vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValueOnce({
      count: 1,
      error: null,
    });

    const { result } = renderHook(() => useRideWants());
    await act(async () => {});

    let ok = false;
    await act(async () => {
      ok = await result.current.handlePost({
        destination: "Vijayawada",
        departDate: "2026-10-25",
      });
    });

    expect(ok).toBe(true);
    expect(postSpy).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("once another student wants it too")
    );
  });

  it("posts demand and handles count >= 2 message", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({
      data: [],
      error: null,
    });
    vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValueOnce({
      count: 3,
      error: null,
    });

    const { result } = renderHook(() => useRideWants());
    await act(async () => {});

    let ok = false;
    await act(async () => {
      ok = await result.current.handlePost({
        destination: "Airport",
        departDate: "2026-10-26",
      });
    });

    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Now 3 students want this ride")
    );
  });

  it("handles post demand error gracefully", async () => {
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValue({
      data: [],
      error: null,
    });
    vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValueOnce({
      count: 0,
      error: { message: "Destination is required" },
    });

    const { result } = renderHook(() => useRideWants());
    await act(async () => {});

    let ok = true;
    await act(async () => {
      ok = await result.current.handlePost({
        destination: "",
        departDate: "2026-10-25",
      });
    });

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Destination is required");
  });

  it("handles handleMeToo optimistic update when joining demand", async () => {
    const initialRows = [
      { destination_key: "guntur", depart_date: "2026-10-25", intent_count: 2, has_mine: false },
      { destination_key: "airport", depart_date: "2026-10-26", intent_count: 3, has_mine: false },
    ];
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: initialRows,
      error: null,
    });
    vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValueOnce({
      count: 3,
      error: null,
    });

    const { result } = renderHook(() => useRideWants());
    await act(async () => {});

    await act(async () => {
      await result.current.handleMeToo(initialRows[0]);
    });

    expect(toast.success).toHaveBeenCalledWith("Added! You signaled demand for this ride.");
    const updated = result.current.wants.find((r) => r.destination_key === "guntur");
    expect(updated?.has_mine).toBe(true);
    expect(updated?.intent_count).toBe(3);
  });

  it("ignores handleMeToo when row already has caller intent", async () => {
    const row = { destination_key: "guntur", depart_date: "2026-10-25", intent_count: 2, has_mine: true };
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: [row],
      error: null,
    });
    const postSpy = vi.spyOn(rideWantsLib, "postRideWant");

    const { result } = renderHook(() => useRideWants());
    await act(async () => {});

    await act(async () => {
      await result.current.handleMeToo(row);
    });

    expect(postSpy).not.toHaveBeenCalled();
  });

  it("handles handleMeToo error gracefully", async () => {
    const row = { destination_key: "guntur", depart_date: "2026-10-25", intent_count: 2, has_mine: false };
    vi.spyOn(rideWantsLib, "fetchRideWants").mockResolvedValueOnce({
      data: [row],
      error: null,
    });
    vi.spyOn(rideWantsLib, "postRideWant").mockResolvedValueOnce({
      count: 0,
      error: { message: "Server error" },
    });

    const { result } = renderHook(() => useRideWants());
    await act(async () => {});

    await act(async () => {
      await result.current.handleMeToo(row);
    });

    expect(toast.error).toHaveBeenCalledWith("Server error");
  });
});
