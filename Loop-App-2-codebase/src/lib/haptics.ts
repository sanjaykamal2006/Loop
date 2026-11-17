/**
 * Triggers light tactile micro-vibrations on mobile browsers that support the Vibration API
 */
export const triggerHaptic = (pattern: number | number[] = 12) => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* Vibration is best-effort; unsupported devices are expected. */
    }
  }
};

/**
 * Standard tactile feedback presets tailored for mobile micro-interactions.
 */
export const haptic = {
  // Ultra-light 6ms tap - for slider ticks, tabs, chips
  selection: () => triggerHaptic(6),
  // Light 10ms tap - for standard buttons, route cards
  tap: () => triggerHaptic(10),
  // Medium 16ms bump - for seat capacity picker, switch toggles
  medium: () => triggerHaptic(16),
  // Snappy 18ms notch - for pull-to-refresh threshold trigger
  snap: () => triggerHaptic(18),
  // Double-pulse [12, 35, 16]ms - for successful actions (ride joined, ride created, message sent)
  success: () => triggerHaptic([12, 35, 16]),
  // Warning pulse [25, 45, 25]ms - for delete confirmation, leave ride, errors
  warning: () => triggerHaptic([25, 45, 25]),
};
