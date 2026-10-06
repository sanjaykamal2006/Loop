/**
 * High-performance, memory-safe Least Recently Used (LRU) Cache.
 * Prevents memory leaks in long-lived Single Page Application sessions
 * by evicting oldest unaccessed items when maxSize threshold is reached.
 */

interface CacheEntry<V> {
  value: V;
  expiresAt?: number;
}

export interface LRUCacheOptions {
  maxSize?: number;
  ttlMs?: number;
}

export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly ttlMs?: number;
  private readonly cache = new Map<K, CacheEntry<V>>();

  constructor(options: LRUCacheOptions = {}) {
    this.maxSize = Math.max(1, options.maxSize ?? 30);
    this.ttlMs = options.ttlMs;
  }

  /**
   * Retrieves an item from the cache. Updates its recency.
   * Returns undefined if the key does not exist or has expired.
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh recency in Map (delete and re-insert moves to end)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Inserts or updates an item in the cache.
   * Evicts the oldest entry if size exceeds maxSize.
   */
  set(key: K, value: V, customTtlMs?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used entry (the first key in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = customTtlMs ?? this.ttlMs;
    const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Checks if an unexpired key exists in the cache.
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Deletes a specific key.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all items.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns current count of cached items.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Returns all active non-expired keys.
   */
  keys(): K[] {
    const now = Date.now();
    const validKeys: K[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      } else {
        validKeys.push(key);
      }
    }
    return validKeys;
  }
}
