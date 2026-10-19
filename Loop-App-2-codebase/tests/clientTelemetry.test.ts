import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { StructuredLogEntry } from "@/lib/logger";

const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  logger: { error: loggerError, warn: vi.fn() },
}));

function entry(message: string, error?: StructuredLogEntry["error"]): StructuredLogEntry {
  return {
    timestamp: "2026-10-19T00:00:00.000Z",
    level: "error",
    message,
    error,
  };
}

async function loadModule() {
  return import("@/lib/clientTelemetry");
}

describe("clientTelemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends an error through sendBeacon and deduplicates within the window", async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: sendBeacon,
    });
    const { reportClientError } = await loadModule();

    reportClientError(entry("Render failed", { name: "Error", message: "boom" }));
    reportClientError(entry("Render failed", { name: "Error", message: "boom" }));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/telemetry");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("falls back to fetch with keepalive when sendBeacon is unavailable", async () => {
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { reportClientError } = await loadModule();

    reportClientError(entry("Fetch path"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({ method: "POST", keepalive: true })
    );
  });

  it("never sends more than 20 reports per session", async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: sendBeacon,
    });
    const { reportClientError } = await loadModule();

    for (let i = 0; i < 25; i += 1) {
      reportClientError(entry(`Failure ${i}`));
    }

    expect(sendBeacon).toHaveBeenCalledTimes(20);
  });

  it("swallows fetch rejections without throwing", async () => {
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { reportClientError } = await loadModule();

    expect(() => reportClientError(entry("Offline"))).not.toThrow();
    await Promise.resolve();
  });

  it("installs global handlers once and logs window errors and rejections", async () => {
    const listeners = new Map<string, EventListener>();
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      listeners.set(type, listener as EventListener);
    });
    const { installGlobalErrorHandlers } = await loadModule();

    installGlobalErrorHandlers();
    installGlobalErrorHandlers();

    expect(window.addEventListener).toHaveBeenCalledTimes(2);
    expect(listeners.has("error")).toBe(true);
    expect(listeners.has("unhandledrejection")).toBe(true);

    const error = new Error("window boom");
    listeners.get("error")!({ error } as unknown as Event);
    listeners.get("unhandledrejection")!({ reason: "rejected" } as unknown as Event);

    expect(loggerError).toHaveBeenCalledWith("Unhandled window error", error);
    expect(loggerError).toHaveBeenCalledWith("Unhandled promise rejection", "rejected");
  });
});
