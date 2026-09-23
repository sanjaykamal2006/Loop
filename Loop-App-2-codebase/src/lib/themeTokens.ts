/**
 * LOOP Semantic Brand & Theme Tokens
 * Centralized color constants for Dark (#FFC554) & Light (#881337) modes.
 */

export const THEME_COLORS = {
  dark: {
    primary: "#FFC554",       // Warm Golden Yellow
    primaryHover: "#E5AF47",
    primaryMuted: "rgba(255, 197, 84, 0.15)",
    primaryBorder: "rgba(255, 197, 84, 0.25)",
    background: "#000000",
    cardBg: "#121214",
    text: "#FFFFFF",
    mutedText: "#A1A1AA",
  },
  light: {
    primary: "#881337",       // Deep Velvet Maroon
    primaryHover: "#700F2B",
    primaryMuted: "rgba(136, 19, 55, 0.10)",
    primaryBorder: "rgba(136, 19, 55, 0.25)",
    background: "#FFFFFF",
    cardBg: "#F4F4F5",
    text: "#09090B",
    mutedText: "#71717A",
  },
} as const;

export const BRAND_GOLD = "#FFC554";
export const BRAND_MAROON = "#881337";
