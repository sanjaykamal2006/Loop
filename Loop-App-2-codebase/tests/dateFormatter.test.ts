import { describe, it, expect } from "vitest";
import {
  getLocalTodayStr,
  getLocalTomorrowStr,
  extractLocalDateStr,
  isSameLocalCalendarDay,
  formatShortDate,
  buildDepartureDate,
  getDepartureDateBadge,
  formatDepartureFull,
  formatDDMMYYYY,
} from "@/lib/dateFormatter";

describe("dateFormatter", () => {
  describe("getLocalTodayStr & getLocalTomorrowStr", () => {
    it("should return valid YYYY-MM-DD format", () => {
      const today = getLocalTodayStr();
      const tomorrow = getLocalTomorrowStr();

      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("extractLocalDateStr", () => {
    it("should extract local calendar date from ISO string", () => {
      const dateStr = extractLocalDateStr("2026-09-15T14:30:00Z");
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return empty string for invalid dates", () => {
      expect(extractLocalDateStr(null)).toBe("");
      expect(extractLocalDateStr("invalid-date")).toBe("");
    });
  });

  describe("isSameLocalCalendarDay", () => {
    it("should correctly compare departure ISO and local date string", () => {
      const todayIso = new Date().toISOString();
      const todayLocal = getLocalTodayStr();
      expect(isSameLocalCalendarDay(todayIso, todayLocal)).toBe(true);

      const tomorrowLocal = getLocalTomorrowStr();
      expect(isSameLocalCalendarDay(todayIso, tomorrowLocal)).toBe(false);
    });
  });

  describe("buildDepartureDate", () => {
    it("should construct correct Date for AM time", () => {
      const d = buildDepartureDate("2026-09-15", "8", "30", "AM");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // 0-indexed September = 8
      expect(d.getDate()).toBe(15);
      expect(d.getHours()).toBe(8);
      expect(d.getMinutes()).toBe(30);
    });

    it("should construct correct Date for PM time", () => {
      const d = buildDepartureDate("2026-09-15", "4", "45", "PM");
      expect(d.getHours()).toBe(16);
      expect(d.getMinutes()).toBe(45);
    });

    it("should handle 12:00 AM midnight correctly without rollover", () => {
      const d = buildDepartureDate("2026-09-15", "12", "00", "AM");
      expect(d.getHours()).toBe(0);
      expect(d.getDate()).toBe(15);
    });

    it("should handle 12:00 PM noon correctly", () => {
      const d = buildDepartureDate("2026-09-15", "12", "00", "PM");
      expect(d.getHours()).toBe(12);
      expect(d.getDate()).toBe(15);
    });
  });

  describe("getDepartureDateBadge", () => {
    it("should return 'Today' for today's rides", () => {
      const today = new Date();
      expect(getDepartureDateBadge(today.toISOString())).toBe("Today");
    });

    it("should return 'Tomorrow' for tomorrow's rides", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(getDepartureDateBadge(tomorrow.toISOString())).toBe("Tomorrow");
    });

    it("should return formatted short date for future rides", () => {
      const future = new Date("2028-12-25T10:00:00");
      expect(getDepartureDateBadge(future.toISOString())).toBe("Dec 25");
    });
  });

  describe("formatDDMMYYYY", () => {
    it("should format YYYY-MM-DD to DD/MM/YYYY", () => {
      expect(formatDDMMYYYY("2026-09-15")).toBe("15/09/2026");
    });

    it("should handle ISO strings", () => {
      const d = new Date(2026, 8, 15);
      expect(formatDDMMYYYY(d.toISOString())).toBe("15/09/2026");
    });
  });
});
