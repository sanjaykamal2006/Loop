import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSosLocation } from "@/lib/hooks/useSosLocation";

type GeolocationCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

function stubGeolocation() {
  const successCallbacks: GeolocationCallback[] = [];
  const errorCallbacks: ErrorCallback[] = [];

  const getCurrentPosition = vi.fn(
    (success: GeolocationCallback, error?: ErrorCallback) => {
      successCallbacks.push(success);
      errorCallbacks.push(error ?? (() => {}));
      return undefined as unknown as number;
    }
  );

  Object.defineProperty(globalThis.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });

  return {
    getCurrentPosition,
    succeed: (coords: Partial<GeolocationCoordinates> = {}) =>
      successCallbacks.forEach((cb) =>
        cb({
          coords: {
            latitude: 17.02,
            longitude: 80.03,
            accuracy: 8,
            ...coords,
          } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition)
      ),
    fail: (code = 1) =>
      errorCallbacks.forEach((cb) =>
        cb({ code, message: "denied" } as GeolocationPositionError)
      ),
  };
}

const originalDescriptor =
  Object.getOwnPropertyDescriptor(globalThis.navigator, "geolocation");

describe("useSosLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis.navigator, "geolocation", originalDescriptor);
    }
  });

  it("starts locating and returns coordinates on success", async () => {
    const geo = stubGeolocation();
    const { result } = renderHook(() => useSosLocation());

    expect(result.current.isLocating).toBe(true);
    expect(result.current.location).toBeNull();
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);

    act(() => geo.succeed({ latitude: 17.02, longitude: 80.03, accuracy: 8 }));

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.location).toEqual({ lat: 17.02, lng: 80.03, accuracy: 8 });
    expect(result.current.locError).toBeNull();
  });

  it("clears stale coordinates when reopened so a fresh open can send nothing", async () => {
    const geo = stubGeolocation();
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useSosLocation(open),
      { initialProps: { open: false } }
    );

    rerender({ open: true });
    await waitFor(() => expect(result.current.isLocating).toBe(true));

    act(() => geo.succeed({ latitude: 11.11, longitude: 22.22, accuracy: 5 }));
    await waitFor(() => expect(result.current.location).not.toBeNull());

    // Close modal
    rerender({ open: false });

    // Reopen while GPS is unavailable. Because the hook clears the previous
    // pin on open, the stale location must NOT leak into this session.
    rerender({ open: true });
    await waitFor(() => expect(result.current.isLocating).toBe(true));
    expect(result.current.location).toBeNull();

    act(() => geo.fail());
    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.location).toBeNull();
    expect(result.current.locError).toBe("Could not retrieve GPS pin. Sharing ride details.");
  });

  it("reports GPS as unavailable when the browser has no geolocation", () => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useSosLocation());
    expect(result.current.locError).toBe("GPS not supported on this device");
    expect(result.current.isLocating).toBe(false);
    expect(result.current.location).toBeNull();
  });
});
