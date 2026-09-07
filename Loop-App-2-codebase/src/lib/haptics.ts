/**
 * Triggers light tactile micro-vibrations on mobile browsers that support the Vibration API
 */
export const triggerHaptic = (pattern: number | number[] = 12) => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};
