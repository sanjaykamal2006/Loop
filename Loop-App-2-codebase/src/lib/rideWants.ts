"use client";

import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export interface RideWantRow {
  destination_key: string;
  depart_date: string;
  intent_count: number;
  has_mine: boolean;
  first_depart_time: string | null;
}

export interface PostRideWantParams {
  destination: string;
  departDate: string; // ISO date 'YYYY-MM-DD'
  note?: string | null;
  departTime?: string | null; // 'HH:MM' (optional)
}

export interface RideWantResult {
  data: RideWantRow[] | null;
  error: { message: string } | null;
}

export interface PostRideWantResult {
  count: number;
  error: { message: string } | null;
}

export interface QuickDayOption {
  label: string;
  dateStr: string;
}

/**
 * Generates quick calendar date chips: Today, Tomorrow, and This Sunday.
 */
export function getQuickDayOptions(referenceDate: Date = new Date()): QuickDayOption[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Today
  const today = new Date(referenceDate);
  const todayStr = formatDate(today);

  // Tomorrow
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);

  // This Sunday
  const dayOfWeek = referenceDate.getDay(); // 0 is Sunday, 1 is Monday ...
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const sunday = new Date(referenceDate);
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  const sundayStr = formatDate(sunday);

  return [
    { label: "Today", dateStr: todayStr },
    { label: "Tomorrow", dateStr: tomorrowStr },
    { label: "This Sunday", dateStr: sundayStr },
  ];
}

/**
 * Fetches the active "Ride Wanted" aggregation board.
 * Invariant: Returns aggregate counts only; no user identities.
 */
export async function fetchRideWants(): Promise<RideWantResult> {
  const { data, error } = await supabase.rpc("get_ride_intent_board");

  if (error) {
    logger.error("fetchRideWants error:", error);
    return { data: null, error: { message: error.message } };
  }

  return {
    data: (data as RideWantRow[]) ?? [],
    error: null,
  };
}

/**
 * Signals ride demand for a destination and date.
 * Resolves user server-side and deduplicates automatically.
 */
export async function postRideWant(params: PostRideWantParams): Promise<PostRideWantResult> {
  const dest = params.destination?.trim() ?? "";
  if (!dest) {
    return { count: 0, error: { message: "Destination is required" } };
  }

  const date = params.departDate?.trim() ?? "";
  if (!date) {
    return { count: 0, error: { message: "Date is required" } };
  }

  const { data, error } = await supabase.rpc("post_ride_intent", {
    p_destination_key: dest,
    p_depart_date: date,
    p_note: params.note ? params.note.trim() : null,
    p_depart_time: params.departTime ? params.departTime.trim() : null,
  });

  if (error) {
    logger.error("postRideWant error:", error);
    return { count: 0, error: { message: error.message } };
  }

  return {
    count: typeof data === "number" ? data : 0,
    error: null,
  };
}
