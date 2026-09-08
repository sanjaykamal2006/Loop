/**
 * Smart Location & Campus Destination Formatter
 * Automatically cleans punctuation, casing, and standardizes key destinations:
 * - "pnbs" / "bus stand" -> "Vijayawada Bus Stand"
 * - "gannavaram" / "vga" / "airport" -> "Airport"
 * - "vit ap" / "vitap" -> "VIT-AP"
 * - "bza" -> "Vijayawada Railway Station"
 * - "gnt" -> "Guntur Railway Station"
 */

export function formatLocation(input: string): string {
  if (!input) return "";

  let cleaned = input.trim();
  // Collapse multiple punctuation, dashes, spaces
  cleaned = cleaned.replace(/[-_]{2,}/g, "-").replace(/\s+/g, " ");

  const lower = cleaned.toLowerCase();

  // 1. VIT-AP and Campus
  if (/^vit[\s\-_.]*ap[\s\-_.]*campus$/i.test(lower) || /^vit[\s\-_.]*campus$/i.test(lower)) {
    return "VIT-AP Campus";
  }
  if (/^vit[\s\-_.]*ap$/i.test(lower) || lower === "vitap") {
    return "VIT-AP";
  }

  // 2. Airport (kept simple as "Airport", no Gannavaram)
  if (
    lower === "airport" ||
    lower === "vga" ||
    lower === "gannavaram" ||
    lower.includes("gannavaram") ||
    lower.includes("vga airport") ||
    lower === "vijayawada airport"
  ) {
    return "Airport";
  }
  if (lower === "rgia" || lower.includes("hyderabad airport") || lower.includes("hyd airport")) {
    return "RGIA Hyderabad Airport";
  }

  // 3. Railway Stations
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

  // 4. Bus Stand (simply Vijayawada Bus Stand, no PNBS)
  if (
    lower === "pnbs" ||
    lower.includes("pandit nehru") ||
    lower === "bus stand" ||
    lower === "bus station" ||
    lower === "vja bus stand" ||
    lower === "vijayawada bus stand"
  ) {
    return "Vijayawada Bus Stand";
  }

  // 5. Cities
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

  // 6. Compound inline cleanup
  cleaned = cleaned.replace(/\bvit[\s\-_.]*ap\b/gi, "VIT-AP");
  cleaned = cleaned.replace(/\bvit\b/gi, "VIT");
  cleaned = cleaned.replace(/\brly\b/gi, "Railway");
  cleaned = cleaned.replace(/\bstn\b/gi, "Station");
  cleaned = cleaned.replace(/\bpnbs\b/gi, "Vijayawada Bus Stand");
  cleaned = cleaned.replace(/\bbza\b/gi, "Vijayawada Railway Station");

  // 7. Title-case words and format punctuation properly
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
