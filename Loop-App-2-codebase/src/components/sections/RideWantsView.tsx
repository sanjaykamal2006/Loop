"use client";

import React, { useState, useMemo, useRef } from "react";
import { useLoop } from "@/lib/LoopContext";
import { useRideWants } from "@/components/sections/useRideWants";
import { formatLocation } from "@/lib/locationFormatter";
import { getQuickDayOptions, RideWantRow } from "@/lib/rideWants";
import { triggerHaptic } from "@/lib/haptics";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  MapPin,
  Sparkles,
  Plus,
  Check,
  Calendar,
  Clock,
  ChevronDown,
} from "lucide-react";

const POPULAR_DESTINATIONS = [
  "Vijayawada Railway Station",
  "Airport",
  "Vijayawada Bus Stand",
];

export function formatDepartDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === tomorrow.getTime()) return "Tomorrow";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[target.getDay()]}, ${months[target.getMonth()]} ${target.getDate()}`;
}

/** '18:05' | '18:05:00' -> '6:05 PM' */
export function formatTimeLabel(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return "";
  const [h24, m] = [parts[0], parts[1]];
  if (h24 < 0 || h24 > 23 || m < 0 || m > 59) return "";
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function RideWantsView() {
  const { setView, theme, profile, setCreatePrefill, setPendingAction, setShowGenderSelect, handleSignOut } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const { wants, loading, submitting, loadBoard, handlePost, handleMeToo } = useRideWants({
    // Dead auth session: sign out cleanly so the user lands on the login
    // screen instead of a board whose every action fails server-side.
    onAuthDead: handleSignOut,
  });

  const quickDayOptions = useMemo(() => getQuickDayOptions(), []);

  const [destination, setDestination] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  // Opens the default native Android / OS date and time picker dialogs.
  // Works reliably across mobile devices, PWAs, and desktops.
  const openNativePicker = (el: HTMLInputElement | null) => {
    if (!el) return;
    triggerHaptic(8);
    try {
      if ("showPicker" in HTMLInputElement.prototype) {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  const handleDestinationChip = (dest: string) => {
    triggerHaptic(8);
    setDestination(dest);
  };

  const onSubmitWant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !selectedDate) return;
    const formatted = formatLocation(destination);
    const ok = await handlePost({
      destination: formatted,
      departDate: selectedDate,
      note: note.trim() || null,
      departTime: selectedTime || null,
    });
    if (ok) {
      setDestination("");
      setSelectedDate("");
      setSelectedTime("");
      setNote("");
    }
  };

  const handleCreateThisRide = (row: RideWantRow) => {
    triggerHaptic(14);
    const isProfileComplete = Boolean(
      profile.gender && profile.display_name?.trim() && profile.reg_no?.trim()
    );
    if (!isProfileComplete) {
      setPendingAction({
        type: "create",
        prefill: {
          destination: formatLocation(row.destination_key),
          depart_date: row.depart_date,
          ...(row.first_depart_time ? { depart_time: row.first_depart_time } : {}),
        },
      });
      setShowGenderSelect(true);
      return;
    }

    setCreatePrefill({
      destination: formatLocation(row.destination_key),
      travelDate: row.depart_date,
      ...(row.first_depart_time ? { departTime: row.first_depart_time } : {}),
    });
    setView("create");
  };

  return (
    <div className="space-y-4 pb-20 pt-1">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic(10);
              setView("home");
            }}
            aria-label="Back to home"
            className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shrink-0 cursor-pointer`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">Find Co-Travellers</h1>
            <p className={`text-[11px] font-medium ${mutedText} mt-1`}>Match with students going the same way</p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic(10);
            loadBoard();
          }}
          disabled={loading}
          aria-label="Refresh board"
          className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shrink-0 cursor-pointer`}
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-[#FFC554]" : "opacity-70"} />
        </button>
      </div>

      {/* Signal Demand Form Card */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] shadow-sm space-y-3.5`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#FFC554] flex items-center gap-1.5">
            <Sparkles size={13} />
            Your Trip
          </span>
          <span className={`text-[10px] ${mutedText}`}>Anonymous until the ride forms</span>
        </div>

        <form onSubmit={onSubmitWant} className="space-y-3">
          {/* Quick Destination Chips */}
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_DESTINATIONS.map((preset) => {
              const isSelected = destination.toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleDestinationChip(preset)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-[#FFC554] text-black"
                        : "bg-[#881337] text-white"
                      : isDark
                      ? "bg-white/5 border border-white/10 hover:border-white/20 text-zinc-300"
                      : "bg-black/5 border border-black/10 hover:border-black/20 text-zinc-700"
                  }`}
                >
                  {preset.replace("Railway Station", "Stn").replace("Bus Stand", "Bus")}
                </button>
              );
            })}
          </div>

          {/* Destination Free Text Input */}
          <div className={`w-full h-11 ${cardBg} border ${border} rounded-2xl flex items-center px-3.5 gap-2.5 focus-within:border-[#FFC554]/80 transition-all`}>
            <MapPin size={16} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#881337] shrink-0"} />
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Where to?"
              aria-label="Destination"
              className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-500 placeholder:font-normal"
            />
          </div>

          {/* Travel Date — Android default date picker via native input */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Travel Date</label>
            <div
              onClick={() => openNativePicker(dateRef.current)}
              className={`relative w-full h-14 ${cardBg} border ${border} rounded-2xl flex items-center px-4 gap-3 focus-within:border-[#FFC554]/80 transition-all cursor-pointer select-none`}
            >
              <Calendar size={18} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#881337] shrink-0"} />
              <span className="flex-1 text-sm font-bold pointer-events-none" aria-hidden="true">
                {selectedDate ? formatDepartDateLabel(selectedDate) || selectedDate : "Pick a date"}
              </span>
              <ChevronDown size={16} className="opacity-60 shrink-0 pointer-events-none" aria-hidden="true" />
              <input
                ref={dateRef}
                type="date"
                value={selectedDate}
                min={quickDayOptions[0]?.dateStr}
                onClick={(e) => {
                  e.stopPropagation();
                  openNativePicker(e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Tab" && e.key !== "Escape" && e.key !== "Enter") e.preventDefault();
                }}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Travel date"
                style={{ colorScheme: isDark ? "dark" : "light" }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>

          {/* Travel Time — Android default time picker via native input */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Travel Time (optional)</label>
            <div
              onClick={() => openNativePicker(timeRef.current)}
              className={`relative w-full h-14 ${cardBg} border ${border} rounded-2xl flex items-center px-4 gap-3 focus-within:border-[#FFC554]/80 transition-all cursor-pointer select-none`}
            >
              <Clock size={18} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#881337] shrink-0"} />
              <span className="flex-1 text-sm font-bold pointer-events-none" aria-hidden="true">
                {selectedTime ? formatTimeLabel(selectedTime) || selectedTime : "Pick a time"}
              </span>
              <ChevronDown size={16} className="opacity-60 shrink-0 pointer-events-none" aria-hidden="true" />
              <input
                ref={timeRef}
                type="time"
                value={selectedTime}
                onClick={(e) => {
                  e.stopPropagation();
                  openNativePicker(e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Tab" && e.key !== "Escape" && e.key !== "Enter") e.preventDefault();
                }}
                onChange={(e) => setSelectedTime(e.target.value)}
                aria-label="Travel time"
                style={{ colorScheme: isDark ? "dark" : "light" }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>

          {/* Optional Note */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note — anything useful"
            maxLength={120}
            aria-label="Optional note"
            className={`w-full h-11 ${cardBg} border ${border} rounded-2xl px-3.5 text-xs font-medium outline-none placeholder:text-zinc-500 focus:border-[#FFC554]/80 transition-all`}
          />

          {/* Submit Signal Button */}
          <button
            type="submit"
            disabled={submitting || !destination.trim() || !selectedDate}
            data-testid="post-want-btn"
            className={`w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              submitting || !destination.trim() || !selectedDate
                ? "opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-500"
                : isDark
                ? "bg-[#FFC554] text-black hover:bg-[#FFC554]/90 active:scale-[0.99]"
                : "bg-[#881337] text-white hover:bg-[#881337]/90 active:scale-[0.99]"
            }`}
          >
            {submitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <>
                <Plus size={16} strokeWidth={3} />
                <span>Find Co-Travellers</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Aggregate Demand List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Active Routes
          </span>
          <span className={`text-[11px] ${mutedText}`}>Auto-updates</span>
        </div>

        {/* Loading Skeletons */}
        {loading && wants.length === 0 && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`p-4 ${cardBg} border ${border} rounded-[24px] animate-pulse space-y-2`}
              >
                <div className="h-4 w-32 bg-white/10 rounded-md" />
                <div className="h-3 w-48 bg-white/5 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && wants.length === 0 && (
          <div className={`p-6 ${cardBg} border ${border} rounded-[28px] text-center space-y-3`}>
            <div className={`w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              <Users size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">No co-travellers yet</p>
              <p className={`text-xs ${mutedText} mt-1 max-w-[240px] mx-auto`}>
                Post your plan — it appears on the board right away. Others join you with one tap.
              </p>
            </div>
          </div>
        )}

        {/* Active Board Rows (aggregates only; the caller's own row also
            appears while it is still solo) */}
        {wants.map((row) => {
          const displayDest = formatLocation(row.destination_key);
          const dateLabel = formatDepartDateLabel(row.depart_date);
          const timeLabel = formatTimeLabel(row.first_depart_time);
          const isHot = row.intent_count >= 4;
          // Solo groups show to everyone now; ownership changes the phrasing.
          const isSolo = row.intent_count === 1;

          return (
            <div
              key={`${row.destination_key}-${row.depart_date}`}
              data-testid="ride-want-card"
              className={`p-3.5 px-4 ${cardBg} border ${
                isHot ? (isDark ? "border-[#FFC554]/40" : "border-[#881337]/40") : border
              } rounded-[24px] shadow-sm space-y-3 transition-all`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[14px] leading-snug">{displayDest}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDark ? "bg-white/10 text-zinc-300" : "bg-black/5 text-zinc-700"
                    }`}>
                      {dateLabel}
                    </span>
                    {timeLabel && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDark ? "bg-white/10 text-zinc-300" : "bg-black/5 text-zinc-700"
                      }`}>
                        first leave {timeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold mt-1 text-[#FFC554]">
                    {isSolo ? (
                      row.has_mine ? (
                        <>Just you so far — others can still join</>
                      ) : (
                        <>1 student wants this — be the 2nd!</>
                      )
                    ) : (
                      <>
                        <span className="font-black text-sm">{row.intent_count}</span> students going this way
                      </>
                    )}
                  </p>
                </div>

                {/* Me Too Button */}
                <button
                  onClick={() => handleMeToo(row)}
                  disabled={row.has_mine}
                  data-testid="me-too-btn"
                  aria-label={row.has_mine ? "Already added" : "Join demand"}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    row.has_mine
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default"
                      : isDark
                      ? "bg-white/10 hover:bg-white/15 text-white active:scale-95"
                      : "bg-black/5 hover:bg-black/10 text-zinc-900 active:scale-95"
                  }`}
                >
                  {row.has_mine ? (
                    <>
                      <Check size={14} strokeWidth={2.5} />
                      <span>You&apos;re in</span>
                    </>
                  ) : (
                    <span>Me too!</span>
                  )}
                </button>
              </div>

              {/* Threshold >= 4: Gold "Create this ride" CTA */}
              {isHot && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-medium ${mutedText}`}>4+ students going</span>
                  <button
                    onClick={() => handleCreateThisRide(row)}
                    data-testid="create-ride-btn"
                    className={`h-8 px-3.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-transform ${
                      isDark
                        ? "bg-[#FFC554] text-black hover:bg-[#FFC554]/90"
                        : "bg-[#881337] text-white hover:bg-[#881337]/90"
                    }`}
                  >
                    <span>Create This Ride</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
