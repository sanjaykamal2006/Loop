"use client";

import React, { useRef } from "react";
import { Calendar, Clock } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { logger } from "@/lib/logger";

interface ScheduleSelectorCardProps {
  travelDate: string;
  setTravelDate: (date: string) => void;
  todayStr: string;
  formatJourneyDate: (d: string) => string;
  hasTime: boolean;
  hour: string;
  minute: string;
  ampm: "AM" | "PM";
  rawTime24: string;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cardBg: string;
  border: string;
  isDark: boolean;
  isPaper?: boolean;
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
  isPaper = false,
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
      } catch (err) {
        logger.error("src/components/create/ScheduleSelectorCard.tsx: swallowed non-fatal error", err);
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
      } catch (err) {
        logger.error("src/components/create/ScheduleSelectorCard.tsx: swallowed non-fatal error", err);
        timeInputRef.current.focus();
      }
    }
  };

  return (
    <div
      className={`relative ${cardBg} ${
        isPaper
          ? "border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
          : `border ${border} shadow-sm`
      } rounded-[22px] overflow-hidden grid grid-cols-2 ${
        isPaper
          ? "divide-x-2 divide-[#2A2420]"
          : isDark
          ? "divide-x divide-white/15"
          : "divide-x divide-black/15"
      }`}
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
                ? isPaper
                  ? "text-[#2A2420]"
                  : isDark
                  ? "text-[#FFC554]"
                  : "text-[#881337]"
                : isPaper
                ? "text-[#6B6660]"
                : isDark
                ? "text-zinc-400"
                : "text-stone-500"
            }
          />
          <span
            className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider ${
              isPaper ? "text-[#6B6660]" : isDark ? "text-zinc-400" : "text-stone-600"
            }`}
          >
            Date
          </span>
        </div>
        <div className="mt-1.5">
          <p
            className={`text-sm sm:text-[15px] font-bold truncate ${
              travelDate
                ? isPaper
                  ? "text-[#2A2420] font-black"
                  : isDark
                  ? "text-white font-black"
                  : "text-zinc-950 font-black"
                : isPaper
                ? "text-[#6B6660]"
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
          aria-label="Travel date"
          min={todayStr}
          value={travelDate}
          onChange={(e) => setTravelDate(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            try {
              if ("showPicker" in HTMLInputElement.prototype) {
                e.currentTarget.showPicker();
              }
            } catch (err) { logger.error("src/components/create/ScheduleSelectorCard.tsx: swallowed non-fatal error", err); }
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
                ? isPaper
                  ? "text-[#2A2420]"
                  : isDark
                  ? "text-[#FFC554]"
                  : "text-[#881337]"
                : isPaper
                ? "text-[#6B6660]"
                : isDark
                ? "text-zinc-400"
                : "text-stone-500"
            }
          />
          <span
            className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider ${
              isPaper ? "text-[#6B6660]" : isDark ? "text-zinc-400" : "text-stone-600"
            }`}
          >
            Time
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {hasTime ? (
            <>
              <span className={`text-sm sm:text-[15px] font-black ${
                isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-zinc-950"
              }`}>
                {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
              </span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isPaper
                    ? "bg-[#FFC554] text-[#2A2420] border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                    : isDark
                    ? "bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40"
                    : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
                }`}
              >
                {ampm}
              </span>
            </>
          ) : (
            <p className={`text-sm sm:text-[15px] font-bold ${
              isPaper ? "text-[#6B6660]" : isDark ? "text-zinc-200" : "text-stone-800"
            }`}>
              Select Time
            </p>
          )}
        </div>
        <input
          ref={timeInputRef}
          type="time"
          aria-label="Departure time"
          value={rawTime24}
          onChange={onTimeChange}
          onClick={(e) => {
            e.stopPropagation();
            try {
              if ("showPicker" in HTMLInputElement.prototype) {
                e.currentTarget.showPicker();
              }
            } catch (err) { logger.error("src/components/create/ScheduleSelectorCard.tsx: swallowed non-fatal error", err); }
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}
