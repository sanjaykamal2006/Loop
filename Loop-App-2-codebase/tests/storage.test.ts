import { describe, it, expect, beforeEach } from "vitest";
import { clearUserStorage } from "@/lib/storage";

describe("clearUserStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes every app-owned cache key", () => {
    localStorage.setItem("loop_profile_user_1", "{}");
    localStorage.setItem("loop_messages_user_1_loop_1", "[]");
    localStorage.setItem("loop_recent_messages_cache_user_1", "{}");
    localStorage.setItem("loop_offline_session", "{}");
    localStorage.setItem("loop_emergency_contacts_user_1", "[]");
    localStorage.setItem("loop_selected_loop", "{}");

    clearUserStorage();

    expect(localStorage.length).toBe(0);
  });

  it("preserves device-level preferences and unrelated keys", () => {
    localStorage.setItem("loop_notifications_enabled", "true");
    localStorage.setItem("sb-abc-auth-token", "session");
    localStorage.setItem("theme", "dark");

    clearUserStorage();

    expect(localStorage.getItem("loop_notifications_enabled")).toBe("true");
    expect(localStorage.getItem("sb-abc-auth-token")).toBe("session");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("never throws when storage is empty", () => {
    expect(() => clearUserStorage()).not.toThrow();
  });
});
