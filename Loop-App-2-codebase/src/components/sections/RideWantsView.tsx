"use client";

import React, { useState, useMemo } from "react";
import { useLoop } from "@/lib/LoopContext";
import { useRideWants } from "@/components/sections/useRideWants";
import { formatLocation } from "@/lib/locationFormatter";
import { getQuickDayOptions, RideWantRow } from "@/lib/rideWants";
import { triggerHaptic } from "@/lib/haptics";
import { ArrowLeft, RefreshCw, Users, MapPin, Sparkles, Plus, Check, Calendar } from "lucide-react";

const POPULAR_DESTINATIONS = [
  "Vijayawada Railway Station",
  "Airport",
  "Guntur Railway Station",
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

export default function RideWantsView() {
  const { setView, theme, profile, setCreatePrefill, setPendingAction, setShowGenderSelect } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const { wants, loading, submitting, loadBoard, handlePost, handleMeToo } = useRideWants();

  const quickDayOptions = useMemo(() => getQuickDayOptions(), []);

  const [destination, setDestination] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(quickDayOptions[0]?.dateStr || "");
  const [note, setNote] = useState<string>("");

  const handleDestinationChip = (dest: string) => {
    triggerHaptic(8);
    setDestination(dest);
  };

  const handleDateChip = (dateStr: string) => {
    triggerHaptic(8);
    setSelectedDate(dateStr);
  };

  const onSubmitWant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !selectedDate) return;
    const formatted = formatLocation(destination);
    const ok = await handlePost({
      destination: formatted,
      departDate: selectedDate,
      note: note.trim() || null,
    });
    if (ok) {
      setDestination("");
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
        prefill: { destination: formatLocation(row.destination_key), depart_date: row.depart_date },
      });
      setShowGenderSelect(true);
      return;
    }

    setCreatePrefill({
      destination: formatLocation(row.destination_key),
      travelDate: row.depart_date,
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
            <h1 className="text-lg font-black tracking-tight leading-none">Ride Wanted</h1>
            <p className={`text-[11px] font-medium ${mutedText} mt-1`}>Signal demand without commitment</p>
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

      {/* Signal Demand Form Card (≤ 5 seconds flow) */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] shadow-sm space-y-3.5`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#FFC554] flex items-center gap-1.5">
            <Sparkles size={13} />
            Post Demand
          </span>
          <span className={`text-[10px] ${mutedText}`}>Anonymous until ride forms</span>
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
              placeholder="Destination (e.g. Vijayawada, Airport)"
              aria-label="Destination"
              className="flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-zinc-500 placeholder:font-normal"
            />
          </div>

          {/* Day Selector Chips */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Travel Day</label>
            <div className="grid grid-cols-3 gap-2">
              {quickDayOptions.map((opt) => {
                const isSelected = selectedDate === opt.dateStr;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleDateChip(opt.dateStr)}
                    className={`h-9 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center ${
                      isSelected
                        ? isDark
                          ? "bg-[#FFC554] text-black shadow-sm"
                          : "bg-[#881337] text-white shadow-sm"
                        : isDark
                        ? "bg-white/5 border border-white/10 text-zinc-300 hover:border-white/20"
                        : "bg-black/5 border border-black/10 text-zinc-700 hover:border-black/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {/* Custom Date Picker fallback */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <span className={`text-[10px] ${mutedText}`}>Or pick specific date:</span>
              <div className={`relative px-2.5 py-1 rounded-xl border ${border} bg-white/5 flex items-center gap-1.5`}>
                <Calendar size={13} className="opacity-70" />
                <input
                  type="date"
                  value={selectedDate}
                  min={quickDayOptions[0]?.dateStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Pick date"
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Optional Note */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g. 2 bags, flight at 6 PM)"
            aria-label="Optional note"
            maxLength={80}
            className={`w-full h-9 px-3 text-xs rounded-xl bg-white/5 border ${border} outline-none placeholder:text-zinc-500 focus:border-[#FFC554]/50 transition-all`}
          />

          {/* Submit Button */}
          <button
            type="submit"
            data-testid="post-want-btn"
            disabled={submitting || !destination.trim() || !selectedDate}
            className={`w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98] ${
              !destination.trim() || !selectedDate || submitting
                ? "opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400"
                : isDark
                ? "bg-[#FFC554] text-black hover:bg-[#FFC554]/90"
                : "bg-[#881337] text-white hover:bg-[#881337]/90"
            }`}
          >
            <Plus size={15} strokeWidth={3} />
            <span>{submitting ? "Posting..." : "I Need This Ride"}</span>
          </button>
        </form>
      </div>

      {/* Aggregate Demand Board Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Users size={14} />
            Community Demand
          </h2>
          {wants.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/15 text-[#881337]"}`}>
              {wants.length} active {wants.length === 1 ? "want" : "wants"}
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && wants.length === 0 && (
          <div className="space-y-2.5 pt-1">
            {[1, 2].map((i) => (
              <div key={i} className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-2 animate-pulse`}>
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
              <p className="text-sm font-black tracking-tight">No active ride wants yet</p>
              <p className={`text-xs ${mutedText} mt-1 max-w-[240px] mx-auto`}>
                Be the first to post where you want to go. When 2 or more students want the same ride, it appears here.
              </p>
            </div>
          </div>
        )}

        {/* Active Board Rows (aggregates only, >= 2 rows) */}
        {wants.map((row) => {
          const displayDest = formatLocation(row.destination_key);
          const dateLabel = formatDepartDateLabel(row.depart_date);
          const isHot = row.intent_count >= 4;

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
                  </div>
                  <p className="text-xs font-semibold mt-1 text-[#FFC554]">
                    <span className="font-black text-sm">{row.intent_count}</span> students want this ride
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
                      <span>Added</span>
                    </>
                  ) : (
                    <span>Me too!</span>
                  )}
                </button>
              </div>

              {/* Threshold >= 4: Gold "Create this ride" CTA */}
              {isHot && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-medium ${mutedText}`}>High demand ride</span>
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
