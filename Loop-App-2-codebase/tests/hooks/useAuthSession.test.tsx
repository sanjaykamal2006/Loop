import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  signOut: vi.fn(),
  clearUserStorage: vi.fn(),
  preloadAvatars: vi.fn(),
  parseStudentEmail: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from, auth: { signOut: mocks.signOut } },
}));
vi.mock("@/lib/storage", () => ({ clearUserStorage: mocks.clearUserStorage }));
vi.mock("@/lib/imageOptimization", () => ({ preloadAvatars: mocks.preloadAvatars }));
vi.mock("@/lib/studentParser", () => ({ parseStudentEmail: mocks.parseStudentEmail }));
vi.mock("@/components/ui/NativeToast", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { useAuthSession } from "@/lib/hooks/useAuthSession";

const session = {
  user: { id: "user-1", email: "23bce1234@vitapstudent.ac.in" },
} as unknown as Session;

const serverProfile = {
  display_name: "Server User",
  theme: "dark",
  gender: "female",
  reg_no: "23BCE1234",
  avatar_url: "https://example.supabase.co/avatar.png",
  bio: "hello",
  is_student_verified: true,
};

let profileResponse: { data: unknown; error: unknown };
let contactResponse: { data: unknown; error: unknown };
let upsertResponse: { error: unknown };
let queries: { table: string; q: Record<string, ReturnType<typeof vi.fn>> }[];

function makeQuery(table: string) {
  const q: Record<string, any> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve(profileResponse));
  q.maybeSingle = vi.fn(() =>
    Promise.resolve(table === "profile_contacts" ? contactResponse : profileResponse)
  );
  q.upsert = vi.fn(() => Promise.resolve(upsertResponse));
  q.delete = vi.fn(() => q);
  q.update = vi.fn(() => q);
  q.then = (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject);
  queries.push({ table, q });
  return q;
}

function upsertCalls(table: string) {
  return queries.filter((entry) => entry.table === table).flatMap((entry) => entry.q.upsert.mock.calls);
}

describe("useAuthSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queries = [];
    profileResponse = { data: serverProfile, error: null };
    contactResponse = { data: { phone_number: "9876543210" }, error: null };
    upsertResponse = { error: null };
    mocks.from.mockImplementation(makeQuery);
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.parseStudentEmail.mockReturnValue({
      displayName: "Parsed User",
      regNo: "23BCE9999",
      isStudentDomain: true,
    });
  });

  it("hydrates the profile and theme from the local cache", () => {
    localStorage.setItem(
      "loop_profile_user-1",
      JSON.stringify({ display_name: "Cached", theme: "light", avatar_url: "https://x/avatar.png" })
    );

    const { result } = renderHook(() => useAuthSession({ session }));

    expect(result.current.profile.display_name).toBe("Cached");
    expect(result.current.theme.isDark).toBe(false);
    expect(result.current.theme.bg).toContain("F2EFE9");
    expect(mocks.preloadAvatars).toHaveBeenCalledWith(["https://x/avatar.png"]);
  });

  it("fetches the profile and joins the contact phone", async () => {
    const { result } = renderHook(() => useAuthSession({ session }));

    await act(async () => {
      await result.current.fetchProfile();
    });

    expect(result.current.isProfileLoaded).toBe(true);
    expect(result.current.profile.display_name).toBe("Server User");
    expect(result.current.profile.phone_number).toBe("9876543210");
    expect(result.current.profile.is_student_verified).toBe(true);
    expect(localStorage.getItem("loop_profile_user-1")).toContain("Server User");
    expect(mocks.preloadAvatars).toHaveBeenCalledWith([serverProfile.avatar_url]);
  });

  it("creates a default profile when the row does not exist (PGRST116)", async () => {
    profileResponse = { data: null, error: { code: "PGRST116" } };
    const { result } = renderHook(() => useAuthSession({ session }));

    await act(async () => {
      await result.current.fetchProfile();
    });

    expect(result.current.profile.display_name).toBe("Parsed User");
    expect(result.current.profile.reg_no).toBe("23BCE9999");
    expect(result.current.profile.is_student_verified).toBe(true);
    expect(upsertCalls("profiles")[0]?.[0]).toMatchObject({
      id: "user-1",
      display_name: "Parsed User",
      reg_no: "23BCE9999",
    });
  });

  it("updates the profile optimistically, normalizes phone, and caches it", async () => {
    const { result } = renderHook(() => useAuthSession({ session }));

    let ok = false;
    await act(async () => {
      ok = await result.current.updateProfile({
        display_name: "New Name",
        phone_number: "+91 98765 43210",
      });
    });

    expect(ok).toBe(true);
    expect(result.current.profile.display_name).toBe("New Name");
    expect(result.current.profile.phone_number).toBe("+91 98765 43210");
    expect(localStorage.getItem("loop_profile_user-1")).toContain("New Name");
    expect(upsertCalls("profile_contacts")[0]?.[0]).toMatchObject({
      user_id: "user-1",
      phone_number: "9876543210",
    });
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("reverts the optimistic update when the database write fails", async () => {
    const { result } = renderHook(() => useAuthSession({ session }));
    await act(async () => {
      await result.current.updateProfile({ display_name: "Original" });
    });

    upsertResponse = { error: { message: "write failed" } };
    let ok = true;
    await act(async () => {
      ok = await result.current.updateProfile({ display_name: "Broken" });
    });

    expect(ok).toBe(false);
    expect(result.current.profile.display_name).toBe("Original");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to update profile. Please try again.");
  });

  it("toggles between dark and light themes", async () => {
    localStorage.setItem(
      "loop_profile_user-1",
      JSON.stringify({ display_name: "Cached", theme: "dark" } satisfies Partial<Profile>)
    );
    const { result } = renderHook(() => useAuthSession({ session }));

    await act(async () => {
      result.current.toggleTheme();
    });

    expect(result.current.profile.theme).toBe("light");
    expect(result.current.theme.isDark).toBe(false);
  });

  it("clears app storage and signs out globally", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
    const { result } = renderHook(() => useAuthSession({ session }));

    await act(async () => {
      await result.current.handleSignOut();
    });

    expect(mocks.clearUserStorage).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(reload).toHaveBeenCalled();
  });

  it("keeps the status-bar theme-color in sync", () => {
    localStorage.setItem(
      "loop_profile_user-1",
      JSON.stringify({ display_name: "Cached", theme: "light" })
    );
    renderHook(() => useAuthSession({ session }));

    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#ffffff"
    );
  });
});
