/**
 * Central helper for app-owned localStorage keys.
 *
 * Every cache the app writes is prefixed with "loop_" so a sign-out can wipe
 * all user data from a shared device in one pass. Device-level preferences
 * (notification opt-in) are intentionally preserved across sign-outs.
 */

export const DEVICE_PREFERENCE_KEYS: readonly string[] = ["loop_notifications_enabled"];

const APP_KEY_PREFIX = "loop_";

/**
 * Removes every app-owned cache entry (profile, messages, members, emergency
 * contacts, selected loop, legacy offline session, …).
 * Safe to call in any browser context; never throws.
 */
export function clearUserStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(APP_KEY_PREFIX)) continue;
      if (DEVICE_PREFERENCE_KEYS.includes(key)) continue;
      doomed.push(key);
    }
    doomed.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode); sign-out must still proceed.
  }
}

/**
 * Per-user owned cache entries. Stored shape: { __owner: <user id>, v: value }.
 * Restoring is only allowed for the same owner, so two accounts sharing a
 * device can never read each other's cached state (ride cards, selected loop,
 * unread badges).
 */
export const CACHE_OWNER_FIELD = "__owner";

export function writeOwnedCache(key: string, value: unknown, ownerId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ [CACHE_OWNER_FIELD]: ownerId, v: value }));
  } catch {
    // Private mode / quota — cache is best-effort.
  }
}

export function readOwnedCache<T>(key: string, ownerId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { __owner?: string; v?: T };
    if (!parsed || parsed.__owner !== ownerId) {
      // Owner mismatch (shared device) — clear the stale entry.
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.v ?? null;
  } catch {
    return null;
  }
}
