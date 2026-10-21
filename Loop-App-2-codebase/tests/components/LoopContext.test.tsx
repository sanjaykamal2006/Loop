import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import type { Loop } from "@/lib/types";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/lib/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    profile: { display_name: "Test", theme: "dark" },
    profileRef: { current: { display_name: "Test", theme: "dark" } },
    isProfileLoaded: true,
    fetchProfile: vi.fn(),
    updateProfile: vi.fn(async () => true),
    theme: { isDark: true, bg: "bg-black", text: "text-white" },
    themeTransition: null,
    toggleTheme: vi.fn(),
    handleSignOut: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useLoopDirectory", () => ({
  useLoopDirectory: () => ({
    activeLoops: [],
    userJoinedLoops: [],
    userLoops: [],
    isJoining: false,
    isDeleting: false,
    showGenderSelect: false,
    setShowGenderSelect: vi.fn(),
    pendingAction: null,
    setPendingAction: vi.fn(),
    fetchLoops: vi.fn(async () => {}),
    fetchUserMemberships: vi.fn(async () => {}),
    registerCreatedLoop: vi.fn(),
    joinLoop: vi.fn(async () => {}),
    deleteLoop: vi.fn(async () => {}),
    leaveLoop: vi.fn(async () => {}),
  }),
}));

vi.mock("@/lib/hooks/useEmergencySos", () => ({
  useEmergencySos: () => ({
    emergencyContact: null,
    emergencyContacts: [],
    saveEmergencyContact: vi.fn(),
    saveEmergencyContacts: vi.fn(),
    showSosModal: false,
    setShowSosModal: vi.fn(),
    showEmergencyContactModal: false,
    setShowEmergencyContactModal: vi.fn(),
    triggerSos: vi.fn(),
  }),
}));

import { LoopProvider, useLoop } from "@/lib/LoopContext";

const session = { user: { id: "user-1", email: "a@b.c" } } as unknown as Session;

function Probe() {
  const ctx = useLoop();
  return (
    <div>
      <span data-testid="view">{ctx.view}</span>
      <span data-testid="selected">{ctx.selectedLoop?.id || "none"}</span>
      <span data-testid="unread">{ctx.unreadLoopIds.join(",")}</span>
      <span data-testid="time">{ctx.formatTime("2026-01-01T10:30:00.000Z")}</span>
      <span data-testid="terms">{String(ctx.showTermsModal)}</span>
      <span data-testid="search">{String(ctx.isMessageSearchOpen)}</span>
      <button onClick={() => ctx.setView("create")}>view</button>
      <button onClick={() => ctx.setSelectedLoop({ id: "loop-1" } as Loop)}>select</button>
      <button onClick={() => ctx.setShowTermsModal(true)}>terms</button>
      <button onClick={() => ctx.toggleMessageSearch()}>search</button>
      <button onClick={() => ctx.markLoopAsRead("loop-1")}>read</button>
    </div>
  );
}

describe("LoopContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    mocks.from.mockImplementation(() => {
      const q: any = {
        select: vi.fn(() => q),
        eq: vi.fn(() => q),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
      return q;
    });
  });

  it("throws when useLoop is used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useLoop must be used within LoopProvider");
    spy.mockRestore();
  });

  it("updates navigation state and browser history", () => {
    render(
      <LoopProvider session={session}>
        <Probe />
      </LoopProvider>
    );

    fireEvent.click(screen.getByText("view"));
    expect(screen.getByTestId("view").textContent).toBe("create");
    expect(window.history.state).toMatchObject({ view: "create" });
  });

  it("persists and clears the selected loop", () => {
    render(
      <LoopProvider session={session}>
        <Probe />
      </LoopProvider>
    );

    fireEvent.click(screen.getByText("select"));
    expect(screen.getByTestId("selected").textContent).toBe("loop-1");
    expect(localStorage.getItem("loop_selected_loop")).toContain("loop-1");
  });

  it("toggles modal and search state", () => {
    render(
      <LoopProvider session={session}>
        <Probe />
      </LoopProvider>
    );

    fireEvent.click(screen.getByText("terms"));
    fireEvent.click(screen.getByText("search"));
    expect(screen.getByTestId("terms").textContent).toBe("true");
    expect(screen.getByTestId("search").textContent).toBe("true");
  });

  it("formats times and marks loops read", () => {
    render(
      <LoopProvider session={session}>
        <Probe />
      </LoopProvider>
    );

    expect(screen.getByTestId("time").textContent).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    fireEvent.click(screen.getByText("read"));
    expect(screen.getByTestId("unread").textContent).toBe("");
  });

  it("opens a valid deep-linked loop", async () => {
    window.history.replaceState({}, "", "/?loop=loop-9");
    mocks.from.mockImplementation(() => {
      const q: any = {
        select: vi.fn(() => q),
        eq: vi.fn(() => q),
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "loop-9",
              status: "open",
              creator_id: "other",
              departure_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              expires_at: null,
              is_female_only: false,
              loop_members: [{ count: 2 }],
            },
            error: null,
          })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
      return q;
    });

    render(
      <LoopProvider session={session}>
        <Probe />
      </LoopProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("view").textContent).toBe("ride-details");
    });
    expect(screen.getByTestId("selected").textContent).toBe("loop-9");
    // Every ride-open path persists the server-side read mark (cross-device
    // badges) — the provider must have written to chat_read_state.
    expect(mocks.from).toHaveBeenCalledWith("chat_read_state");
  });
});
