import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    captureException: vi.fn(),
    getDiagnosticLogs: vi.fn(() => []),
  },
}));

function Bomb(): React.ReactElement {
  throw new Error("kaboom");
}

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("ErrorBoundary", () => {
  it("renders children while nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("renders the default crash card and returns to children after a reload reset", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/rides and coordinates are safe/)).toBeInTheDocument();

    // Hand the boundary a non-throwing subtree first; the persistent error
    // state keeps the crash card on screen...
    rerender(
      <ErrorBoundary>
        <div>recovered after reload</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Reload LOOP")).toBeInTheDocument();

    // ...until the user taps reload, which resets the boundary (jsdom logs the
    // real navigation as "Not implemented" and continues).
    fireEvent.click(screen.getByText("Reload LOOP"));
    expect(screen.getByText("recovered after reload")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders a caller-provided fallback instead of the crash card", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("Reload LOOP")).not.toBeInTheDocument();
  });
});
