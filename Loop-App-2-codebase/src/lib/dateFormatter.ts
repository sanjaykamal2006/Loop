/**
 * Utility functions for formatting dates and departure times in LOOP
 */

/**
 * Returns YYYY-MM-DD for today in local user timezone
 */
export function getLocalTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM-DD for tomorrow in local user timezone
 */
export function getLocalTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD into short display like "Sep 12"
 */
export function formatShortDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Builds a Date object from YYYY-MM-DD and 12-hour time components
 */
export function buildDepartureDate(
  travelDate: string,
  hour: string,
  minute: string,
  ampm: "AM" | "PM"
): Date {
  const [y, m, d] = travelDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  let h = parseInt(hour, 10) || 0;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  date.setHours(h, parseInt(minute, 10) || 0, 0, 0);
  return date;
}

/**
 * Returns a compact badge label: "Today", "Tomorrow", or "Sep 12"
 */
export function getDepartureDateBadge(isoString?: string | null): string {
  if (!isoString) return "Upcoming";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Upcoming";
  }
}

/**
 * Returns full readable departure string:
 * "Today • 05:30 PM", "Tomorrow • 09:00 AM", or "Fri, Sep 12 • 06:30 PM"
 */
export function formatDepartureFull(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // MONTH DATE, DAY, TIME FORMAT (e.g. "Sep 10, Thu • 12:30 PM")
    return `${monthDay}, ${dayName} • ${timeStr}`;
  } catch {
    return "";
  }
}

/**
 * Formats YYYY-MM-DD or ISO string to DD/MM/YYYY
 */
export function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts;
      return `${d.slice(0, 2).padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr || "";
  }
}
