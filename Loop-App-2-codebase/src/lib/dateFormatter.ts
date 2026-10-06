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
 * Extracts YYYY-MM-DD representing the local calendar date of any Date or ISO string
 */
export function extractLocalDateStr(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return "";
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Checks whether an ISO departure timestamp falls on the specified local calendar date string (YYYY-MM-DD)
 */
export function isSameLocalCalendarDay(departureIso: string, localDateStr: string): boolean {
  if (!departureIso || !localDateStr) return false;
  return extractLocalDateStr(departureIso) === localDateStr;
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
 * Builds a Date object from YYYY-MM-DD and 12-hour time components in local time
 * Correctly handles 12:00 AM midnight and 12:00 PM noon without rollover
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
 * Uses exact local calendar day comparisons to prevent midnight boundary drift
 */
export function getDepartureDateBadge(isoString?: string | null): string {
  if (!isoString) return "Upcoming";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Upcoming";

    const rideDateStr = extractLocalDateStr(d);
    const todayStr = getLocalTodayStr();
    const tomorrowStr = getLocalTomorrowStr();

    if (rideDateStr === todayStr) return "Today";
    if (rideDateStr === tomorrowStr) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Upcoming";
  }
}

/**
 * Returns full readable departure string:
 * "Sep 10, Thu • 12:30 PM"
 */
export function formatDepartureFull(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    // If it's an exact YYYY-MM-DD date string without time components
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr || "";
  }
}
