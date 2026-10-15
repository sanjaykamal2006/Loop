"use client";

import React, { useRef } from "react";
import { Calendar, Clock } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface ScheduleSelectorCardProps {
  travelDate: string;
  setTravelDate: (val: string) => void;
  todayStr: string;
  formatJourneyDate: (dateStr: string) => string;
  hasTime: boolean;
  hour: string;
  minute: string;
  ampm: "AM" | "PM";
  rawTime24: string;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cardBg: string;
  border: string;
  isDark: boolean;
}

export default function ScheduleSelectorCard({
  travelDate,
  setTravelDate,
  todayStr,
  formatJourneyDate,
  hasTime,
  hour,
  minute,
  ampm,
  rawTime24,
  onTimeChange,
  cardBg,
  border,
  isDark,
}: ScheduleSelectorCardProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    triggerHaptic(8);
    if (dateInputRef.current) {
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  const handleOpenTimePicker = () => {
    triggerHaptic(8);
    if (timeInputRef.current) {
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          timeInputRef.current.showPicker();
        } else {
          timeInputRef.current.focus();
        }
      } catch {
        timeInputRef.current.focus();
      }
    }
  };

  return (
    <div
      className={`relative ${cardBg} border ${border} rounded-[22px] shadow-sm overflow-hidden grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.08]`}
    >
      {/* Date Column */}
      <div
        onClick={handleOpenDatePicker}
        className="relative p-3.5 sm:p-4 cursor-pointer active:bg-black/[0.03] dark:active:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar
            size={15}
            strokeWidth={2.2}
            className={
              travelDate
                ? isDark
                  ? "text-[#FFC554]"
                  : "text-[#881337]"
                : isDark
                ? "text-zinc-400"
                : "text-stone-500"
            }
          />
          <span
            className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}
          >
            Date
          </span>
        </div>
        <div className="mt-1.5">
          <p
            className={`text-sm sm:text-[15px] font-bold truncate ${
              travelDate
                ? isDark
                  ? "text-white font-black"
                  : "text-zinc-950 font-black"
                : isDark
                ? "text-zinc-200"
                : "text-stone-800"
            }`}
          >
            {travelDate ? formatJourneyDate(travelDate) : "Select Date"}
          </p>
        </div>
        <input
          ref={dateInputRef}
          type="date"
          min={todayStr}
          value={travelDate}
          onChange={(e) => setTravelDate(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            try {
              if ("showPicker" in HTMLInputElement.prototype) {
                e.currentTarget.showPicker();
              }
            } catch {}
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>

      {/* Time Column */}
      <div
        onClick={handleOpenTimePicker}
        className="relative p-3.5 sm:p-4 cursor-pointer active:bg-black/[0.03] dark:active:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock
            size={15}
            strokeWidth={2.2}
            className={
              hasTime
                ? isDark
                  ? "text-[#FFC554]"
                  : "text-[#881337]"
                : isDark
                ? "text-zinc-400"
                : "text-stone-500"
            }
          />
          <span
            className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}
          >
            Time
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {hasTime ? (
            <>
              <span className={`text-sm sm:text-[15px] font-black ${isDark ? "text-white" : "text-zinc-950"}`}>
                {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
              </span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isDark
                    ? "bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40"
                    : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
                }`}
              >
                {ampm}
              </span>
            </>
          ) : (
            <p className={`text-sm sm:text-[15px] font-bold ${isDark ? "text-zinc-200" : "text-stone-800"}`}>
              Select Time
            </p>
          )}
        </div>
        <input
          ref={timeInputRef}
          type="time"
          value={rawTime24}
          onChange={onTimeChange}
          onClick={(e) => {
            e.stopPropagation();
            try {
              if ("showPicker" in HTMLInputElement.prototype) {
                timeInputRef.current?.showPicker();
              }
            } catch {}
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}
