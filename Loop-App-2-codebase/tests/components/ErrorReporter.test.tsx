import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ErrorReporter from "@/components/ErrorReporter";

const loggerMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  getDiagnosticLogs: vi.fn(() => [] as { level: string; message: string }[]),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    captureException: loggerMocks.captureException,
    getDiagnosticLogs: loggerMocks.getDiagnosticLogs,
  },
  getDiagnosticLogs: loggerMocks.getDiagnosticLogs,
}));

describe("ErrorReporter (global error page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loggerMocks.getDiagnosticLogs.mockReturnValue([]);
  });

  it("renders nothing when there is no error", () => {
    const { container } = render(<ErrorReporter />);
    expect(container).toBeEmptyDOMElement();
    expect(loggerMocks.captureException).not.toHaveBeenCalled();
  });

  it("reports the captured exception and offers Try again", () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("server exploded"), { digest: "abc-123" });

    render(<ErrorReporter error={error} reset={reset} />);

    expect(loggerMocks.captureException).toHaveBeenCalledWith(error, { source: "ErrorReporter" });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("exposes stack, digest, and recent diagnostic logs in development only", () => {
    vi.stubEnv("NODE_ENV", "development");
    loggerMocks.getDiagnosticLogs.mockReturnValue([
      { level: "error", message: "fetch failed at 12:40" },
    ]);

    const error = Object.assign(new Error("dev-mode crash"), { digest: "dig-7" });
    const { container } = render(<ErrorReporter error={error} />);

    // The page renders its own <html>/<body>, so text can repeat: assert on
    // presence rather than uniqueness.
    expect(screen.getAllByText("Error details (Development only)").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("dev-mode crash");
    expect(container.textContent).toContain("Digest: dig-7");
    expect(container.textContent).toContain("[ERROR] fetch failed at 12:40");
    expect(screen.queryByText("Try again")).not.toBeInTheDocument(); // no reset offered
    vi.unstubAllEnvs();
  });
});
