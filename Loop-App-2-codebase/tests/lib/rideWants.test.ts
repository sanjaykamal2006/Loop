import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRideWants, postRideWant, getQuickDayOptions } from "@/lib/rideWants";
import { supabase } from "@/lib/supabase";

describe("rideWants lib utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQuickDayOptions", () => {
    it("returns correct Today, Tomorrow, and This Sunday for a Wednesday", () => {
      // 2026-10-21 is a Wednesday (day 3)
      const refDate = new Date(2026, 9, 21);
      const options = getQuickDayOptions(refDate);

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({ label: "Today", dateStr: "2026-10-21" });
      expect(options[1]).toEqual({ label: "Tomorrow", dateStr: "2026-10-22" });
      // Next Sunday is 4 days away (2026-10-25)
      expect(options[2]).toEqual({ label: "This Sunday", dateStr: "2026-10-25" });
    });

    it("returns next Sunday when reference date is already a Sunday", () => {
      // 2026-10-25 is a Sunday (day 0)
      const refDate = new Date(2026, 9, 25);
      const options = getQuickDayOptions(refDate);

      expect(options[0]).toEqual({ label: "Today", dateStr: "2026-10-25" });
      expect(options[1]).toEqual({ label: "Tomorrow", dateStr: "2026-10-26" });
      // If already Sunday, This Sunday option shifts to next Sunday (7 days)
      expect(options[2]).toEqual({ label: "This Sunday", dateStr: "2026-11-01" });
    });

    it("defaults to current date when no reference is passed", () => {
      const options = getQuickDayOptions();
      expect(options).toHaveLength(3);
      expect(options[0].label).toBe("Today");
      expect(options[1].label).toBe("Tomorrow");
      expect(options[2].label).toBe("This Sunday");
    });
  });

  describe("fetchRideWants", () => {
    it("returns data on successful RPC call", async () => {
      const mockRows = [
        { destination_key: "vijayawada", depart_date: "2026-10-25", intent_count: 5, has_mine: true },
        { destination_key: "guntur", depart_date: "2026-10-26", intent_count: 2, has_mine: false },
      ];
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: mockRows, error: null } as any);

      const result = await fetchRideWants();
      expect(supabase.rpc).toHaveBeenCalledWith("get_ride_intent_board");
      expect(result.data).toEqual(mockRows);
      expect(result.error).toBeNull();
    });

    it("returns empty array when RPC returns null data", async () => {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: null, error: null } as any);

      const result = await fetchRideWants();
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("handles and logs RPC error", async () => {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed" },
      } as any);

      const result = await fetchRideWants();
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("Database connection failed");
    });
  });

  describe("postRideWant", () => {
    it("validates empty destination without calling RPC", async () => {
      const rpcSpy = vi.spyOn(supabase, "rpc");
      const result = await postRideWant({ destination: "   ", departDate: "2026-10-25" });

      expect(rpcSpy).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
      expect(result.error?.message).toBe("Destination is required");

      const nullDestResult = await postRideWant({ destination: null as any, departDate: "2026-10-25" });
      expect(nullDestResult.count).toBe(0);
      expect(nullDestResult.error?.message).toBe("Destination is required");
    });

    it("validates missing date without calling RPC", async () => {
      const rpcSpy = vi.spyOn(supabase, "rpc");
      const result = await postRideWant({ destination: "Vijayawada", departDate: "  " });

      expect(rpcSpy).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
      expect(result.error?.message).toBe("Date is required");

      const nullDateResult = await postRideWant({ destination: "Vijayawada", departDate: null as any });
      expect(nullDateResult.count).toBe(0);
      expect(nullDateResult.error?.message).toBe("Date is required");
    });

    it("successfully posts intent and returns updated count", async () => {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: 3, error: null } as any);

      const result = await postRideWant({
        destination: "Vijayawada Railway Station",
        departDate: "2026-10-25",
        note: "Have luggage",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("post_ride_intent", {
        p_destination_key: "Vijayawada Railway Station",
        p_depart_date: "2026-10-25",
        p_note: "Have luggage",
      });
      expect(result.count).toBe(3);
      expect(result.error).toBeNull();
    });

    it("handles RPC without note", async () => {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: 1, error: null } as any);

      const result = await postRideWant({
        destination: "Airport",
        departDate: "2026-10-26",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("post_ride_intent", {
        p_destination_key: "Airport",
        p_depart_date: "2026-10-26",
        p_note: null,
      });
      expect(result.count).toBe(1);
      expect(result.error).toBeNull();
    });

    it("handles RPC non-number response fallback", async () => {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({ data: null, error: null } as any);

      const result = await postRideWant({
        destination: "Airport",
        departDate: "2026-10-26",
      });

      expect(result.count).toBe(0);
      expect(result.error).toBeNull();
    });

    it("handles RPC error gracefully", async () => {
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
        data: null,
        error: { message: "Rate limit exceeded" },
      } as any);

      const result = await postRideWant({
        destination: "Guntur",
        departDate: "2026-10-25",
      });

      expect(result.count).toBe(0);
      expect(result.error?.message).toBe("Rate limit exceeded");
    });
  });
});
