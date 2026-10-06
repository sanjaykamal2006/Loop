import { describe, it, expect, vi, beforeEach } from "vitest";
import { LRUCache } from "@/lib/cache";

describe("LRUCache", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default size of 30 or custom size", () => {
    const cache = new LRUCache<string, string>();
    expect(cache.size).toBe(0);

    const customCache = new LRUCache<string, string>({ maxSize: 3 });
    expect(customCache.size).toBe(0);
  });

  it("should store and retrieve values correctly", () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it("should evict least recently used items when maxSize is exceeded", () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 });
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access 'a' to make it recently used -> order of recency: b, c, a
    cache.get("a");

    // Insert 'd' -> 'b' is the least recently used, so 'b' should be evicted
    cache.set("d", "4");

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
    expect(cache.size).toBe(3);
  });

  it("should update value and recency when setting an existing key", () => {
    const cache = new LRUCache<string, string>({ maxSize: 2 });
    cache.set("k1", "v1");
    cache.set("k2", "v2");

    // Updating k1 moves it to most recent
    cache.set("k1", "v1_updated");

    // Inserting k3 should evict k2 (not k1)
    cache.set("k3", "v3");

    expect(cache.get("k1")).toBe("v1_updated");
    expect(cache.get("k2")).toBeUndefined();
    expect(cache.get("k3")).toBe("v3");
  });

  it("should handle TTL expiration correctly", () => {
    vi.useFakeTimers();
    const cache = new LRUCache<string, string>({ ttlMs: 1000 });
    cache.set("temp", "val");

    expect(cache.get("temp")).toBe("val");
    expect(cache.has("temp")).toBe(true);

    // Advance time past TTL
    vi.advanceTimersByTime(1001);

    expect(cache.get("temp")).toBeUndefined();
    expect(cache.has("temp")).toBe(false);
  });

  it("should support custom TTL per entry", () => {
    vi.useFakeTimers();
    const cache = new LRUCache<string, string>({ ttlMs: 5000 });
    cache.set("shortLived", "val", 500); // 500ms custom TTL

    expect(cache.get("shortLived")).toBe("val");

    vi.advanceTimersByTime(600);

    expect(cache.get("shortLived")).toBeUndefined();
  });

  it("should support delete, clear, and keys iteration", () => {
    const cache = new LRUCache<string, number>({ maxSize: 10 });
    cache.set("x", 10);
    cache.set("y", 20);
    cache.set("z", 30);

    expect(cache.has("y")).toBe(true);
    expect(cache.delete("y")).toBe(true);
    expect(cache.has("y")).toBe(false);
    expect(cache.size).toBe(2);

    expect(cache.keys()).toEqual(["x", "z"]);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.keys()).toEqual([]);
  });
});
