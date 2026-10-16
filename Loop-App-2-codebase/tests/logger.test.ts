import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, getDiagnosticLogs } from "@/lib/logger";

describe("Logger & Diagnostics Utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("formats and emits info logs", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("Test info message", { key: "value" });
    expect(spy).toHaveBeenCalled();
  });

  it("formats and emits warn logs", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("Test warn message", { code: 123 });
    expect(spy).toHaveBeenCalled();
  });

  it("formats and emits error logs, storing them into the diagnostic buffer", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const initialBufferLength = getDiagnosticLogs().length;

    logger.error("Test error message", new Error("Sample boom"), { traceId: "abc" });
    expect(spy).toHaveBeenCalled();

    const logs = getDiagnosticLogs();
    expect(logs.length).toBeGreaterThan(initialBufferLength);
    const lastEntry = logs[logs.length - 1];
    expect(lastEntry.level).toBe("error");
    expect(lastEntry.message).toBe("Test error message");
    expect(lastEntry.error?.message).toBe("Sample boom");
    expect(lastEntry.context?.traceId).toBe("abc");
  });

  it("captures exceptions seamlessly via captureException", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new TypeError("Invalid argument");
    logger.captureException(err, { action: "save_profile" });

    expect(spy).toHaveBeenCalled();
    const logs = getDiagnosticLogs();
    const lastEntry = logs[logs.length - 1];
    expect(lastEntry.message).toContain("Exception caught: Invalid argument");
    expect(lastEntry.context?.action).toBe("save_profile");
  });

  it("allows registering and triggering custom telemetry handlers", () => {
    const customSink = vi.fn();
    logger.registerTelemetryHandler(customSink);

    logger.error("Telemetry event", { eventId: 42 });
    expect(customSink).toHaveBeenCalled();
    expect(customSink.mock.calls[0][0].message).toBe("Telemetry event");
  });

  it("handles primitive and null arguments gracefully in log formatters", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("Primitive error", "extra string detail", 123, null, undefined);
    expect(spy).toHaveBeenCalled();
  });
});
