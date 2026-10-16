import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerHaptic } from "@/lib/haptics";

describe("haptics utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls navigator.vibrate when supported", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    triggerHaptic(20);
    expect(vibrateMock).toHaveBeenCalledWith(20);
  });

  it("handles navigator.vibrate exceptions safely without throwing", () => {
    const throwingMock = vi.fn(() => {
      throw new Error("Vibration permission denied");
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { vibrate: throwingMock },
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic(15)).not.toThrow();
  });

  it("uses default pattern of 12ms when omitted", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    triggerHaptic();
    expect(vibrateMock).toHaveBeenCalledWith(12);
  });
});
