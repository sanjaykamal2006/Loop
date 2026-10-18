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
