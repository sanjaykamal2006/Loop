import { describe, it, expect, beforeEach, vi } from "vitest";

const profilesByCall: { data: any; error: any }[] = [];
const fromCounter = { count: 0 };

vi.mock("@/lib/supabase", () => {
  const buildChain = () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(() => Promise.resolve(profilesByCall[fromCounter.count++] ?? { data: null, error: null })),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return chain;
  };
  return {
    supabase: {
      from: vi.fn(() => buildChain()),
    },
  };
});

import { getProfileDisplayName, clearProfileNameCache } from "@/lib/profileNameCache";

beforeEach(() => {
  profilesByCall.length = 0;
  fromCounter.count = 0;
  clearProfileNameCache();
});

describe("profileNameCache", () => {
  it("fetches a display name once per sender id within the TTL", async () => {
    profilesByCall.push({ data: { display_name: "Priya" }, error: null });

    const first = await getProfileDisplayName("u-1");
    const second = await getProfileDisplayName("u-1");

    expect(first).toBe("Priya");
    expect(second).toBe("Priya");
    expect(fromCounter.count).toBe(1); // zero extra profile fetches for the repeat event
  });

  it("returns null for empty ids without touching the network", async () => {
    expect(await getProfileDisplayName("")).toBeNull();
    expect(fromCounter.count).toBe(0);
  });

  it("does not turn a missing profile row into a poisoned cache entry", async () => {
    profilesByCall.push({ data: null, error: null });
    expect(await getProfileDisplayName("u-4")).toBeNull();
    // null misses do not count as successes; a later populated row resolves.
    profilesByCall.push({ data: { display_name: "Later" }, error: null });
    expect(await getProfileDisplayName("u-4")).toBeNull(); // still cached as a miss within TTL
  });

  it("clears the cache on demand", async () => {
    profilesByCall.push(
      { data: { display_name: "One" }, error: null },
      { data: { display_name: "One" }, error: null }
    );
    await getProfileDisplayName("u-3");
    clearProfileNameCache();
    await getProfileDisplayName("u-3");
    expect(fromCounter.count).toBe(2);
  });
});
