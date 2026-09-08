/**
 * Smart Location & Campus Destination Formatter
 * Automatically corrects typos, abbreviations, and formatting
 * e.g. "vit ap" -> "VIT-AP", "bza" -> "Vijayawada Railway Station", "rgia" -> "RGIA Hyderabad Airport"
 */

export function formatLocation(input: string): string {
  if (!input) return "";

  let cleaned = input.trim();
  // Collapse multiple spaces, tabs, dashes
  cleaned = cleaned.replace(/[-_]{2,}/g, "-").replace(/\s+/g, " ");

  const lower = cleaned.toLowerCase();

  // 1. Direct and composite pattern matches for VIT-AP and campus
  if (/^vit[\s\-_.]*ap[\s\-_.]*campus$/i.test(lower) || /^vit[\s\-_.]*campus$/i.test(lower)) {
    return "VIT-AP Campus";
  }
  if (/^vit[\s\-_.]*ap$/i.test(lower) || lower === "vitap") {
    return "VIT-AP";
  }

  // 2. Airport checks
  if (lower === "rgia" || lower.includes("hyderabad airport") || lower.includes("hyd airport")) {
    return "RGIA Hyderabad Airport";
  }
  if (
    lower === "vga" ||
    lower === "gannavaram" ||
    lower.includes("gannavaram airport") ||
    lower.includes("vga airport") ||
    lower === "vijayawada airport"
  ) {
    return "Vijayawada Airport (Gannavaram)";
  }
  if (lower === "airport") {
    return "Airport";
  }

  // 3. Railway Station checks
  if (
    lower === "bza" ||
    lower === "bza station" ||
    lower === "bza stn" ||
    lower === "bza railway station" ||
    lower.includes("vijayawada railway") ||
    lower === "vijayawada station" ||
    lower === "vja station" ||
    lower === "vja railway station"
  ) {
    return "Vijayawada Railway Station";
  }
  if (
    lower === "gnt station" ||
    lower === "gnt stn" ||
    lower === "gnt railway station" ||
    lower.includes("guntur railway") ||
    lower === "guntur station"
  ) {
    return "Guntur Railway Station";
  }

  // 4. Bus Station checks
  if (
    lower === "pnbs" ||
    lower.includes("pandit nehru") ||
    lower === "bus stand" ||
    lower === "bus station" ||
    lower === "vja bus stand" ||
    lower === "vijayawada bus stand"
  ) {
    return "Pandit Nehru Bus Station (PNBS)";
  }

  // 5. Major Malls / Hubs
  if (lower === "pvp" || lower === "pvp mall" || lower === "pvp square") {
    return "PVP Square";
  }
  if (lower === "trendset" || lower === "trendset mall") {
    return "Trendset Mall";
  }
  if (lower === "inorbit" || lower === "inorbit mall") {
    return "Inorbit Mall";
  }

  // 6. Cities
  if (lower === "vja" || lower === "vijayawada") {
    return "Vijayawada";
  }
  if (lower === "gnt" || lower === "guntur") {
    return "Guntur";
  }
  if (lower === "mangalagiri") {
    return "Mangalagiri";
  }
  if (lower === "amaravati") {
    return "Amaravati";
  }
  if (lower === "tenali") {
    return "Tenali";
  }
  if (lower === "hyd" || lower === "hyderabad") {
    return "Hyderabad";
  }

  // 7. Inline replacement for compound descriptions (e.g. "vit ap gate 2" -> "VIT-AP Gate 2")
  cleaned = cleaned.replace(/\bvit[\s\-_.]*ap\b/gi, "VIT-AP");
  cleaned = cleaned.replace(/\brgia\b/gi, "RGIA");
  cleaned = cleaned.replace(/\bpnbs\b/gi, "PNBS");
  cleaned = cleaned.replace(/\bbza\b/gi, "BZA");
  cleaned = cleaned.replace(/\bvga\b/gi, "VGA");
  cleaned = cleaned.replace(/\bpvp\b/gi, "PVP");
  cleaned = cleaned.replace(/\bvit\b/gi, "VIT");
  cleaned = cleaned.replace(/\brly\b/gi, "Railway");
  cleaned = cleaned.replace(/\bstn\b/gi, "Station");

  // Title case words, preserving acronyms
  const words = cleaned.split(" ").map((w) => {
    if (w === "VIT-AP" || /^[A-Z0-9&-]{2,}$/.test(w)) {
      return w;
    }
    if (w.includes("-")) {
      return w
        .split("-")
        .map((part) =>
          part.toUpperCase() === "AP" || part.toUpperCase() === "VIT"
            ? part.toUpperCase()
            : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join("-");
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return words.join(" ").trim();
}
