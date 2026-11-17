import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerHaptic, haptic } from "@/lib/haptics";

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

  it("supports named haptic presets", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    haptic.selection();
    expect(vibrateMock).toHaveBeenCalledWith(6);

    haptic.tap();
    expect(vibrateMock).toHaveBeenCalledWith(10);

    haptic.medium();
    expect(vibrateMock).toHaveBeenCalledWith(16);

    haptic.snap();
    expect(vibrateMock).toHaveBeenCalledWith(18);

    haptic.success();
    expect(vibrateMock).toHaveBeenCalledWith([12, 35, 16]);

    haptic.warning();
    expect(vibrateMock).toHaveBeenCalledWith([25, 45, 25]);
  });
});
