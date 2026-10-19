"use client";

import { logger } from "@/lib/logger";

import React, { useRef } from "react";
import { Clock, Calendar } from "lucide-react";
import { formatDDMMYYYY } from "@/lib/dateFormatter";
import { triggerHaptic } from "@/lib/haptics";

interface LoopDateTimePickerProps {
  travelDate: string;
  setTravelDate: (date: string) => void;
  todayStr: string;
  hour: string;
  setHour: (h: string) => void;
  minute: string;
  setMinute: (m: string) => void;
  ampm: "AM" | "PM";
  setAmpm: (val: "AM" | "PM") => void;
  theme: {
    isDark: boolean;
    bg: string;
    border: string;
    mutedText: string;
  };
}

export function LoopDateTimePicker({
  travelDate,
  setTravelDate,
  todayStr,
  hour,
  setHour,
  minute,
  setMinute,
  ampm,
  setAmpm,
  theme,
}: LoopDateTimePickerProps) {
  const { isDark, bg, border, mutedText } = theme;
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const rawTime24 = React.useMemo(() => {
    if (!hour || !minute) return "";
    let h = parseInt(hour, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }, [hour, minute, ampm]);

  const hasTime = Boolean(hour && minute);

  const handleOpenDatePicker = () => {
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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setHour("");
      setMinute("");
      return;
    }
    const [hStr, mStr] = val.split(":");
    const h = parseInt(hStr, 10);
    const newAmpm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    setHour(String(h12).padStart(2, "0"));
    setMinute(mStr.padStart(2, "0"));
    setAmpm(newAmpm);
    triggerHaptic(8);
  };

  return (
    <div className="space-y-3">
      {/* Date of Travel */}
      <div className="space-y-1">
        <label
          className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1`}
        >
          <Calendar size={11} className="text-[#FFC554]" /> Date of Travel
        </label>
        <div
          onClick={handleOpenDatePicker}
          className={`w-full h-11 ${bg} border ${
            travelDate ? "border-[#FFC554]" : border
          } rounded-[18px] px-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar
              size={15}
              className={travelDate ? "text-[#FFC554]" : mutedText}
            />
            <span
              className={`text-xs font-bold ${
                travelDate ? (isDark ? "text-white" : "text-black") : mutedText
              }`}
            >
              {travelDate ? formatDDMMYYYY(travelDate) : "Pick a Date (DD/MM/YYYY)"}
            </span>
          </div>
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
              travelDate
                ? isDark
                  ? "bg-[#FFC554] text-black shadow-sm"
                  : "bg-[#881337] text-white shadow-sm"
                : isDark
                ? "bg-white/10 text-zinc-400"
                : "bg-black/5 text-zinc-500"
            }`}
          >
            {travelDate ? "Change" : "Select"}
          </span>
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
              } catch (err) { logger.error("src/components/loop/LoopDateTimePicker.tsx: swallowed non-fatal error", err); }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      {/* Time of Travel */}
      <div className="space-y-1">
        <label
          className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1.5`}
        >
          <Clock
            size={11}
            className={isDark ? "text-[#FFC554]" : "text-[#881337]"}
          />{" "}
          Time of Travel
        </label>
        <div
          onClick={handleOpenTimePicker}
          className={`w-full h-11 ${bg} border ${
            hasTime ? (isDark ? "border-[#FFC554]" : "border-[#881337]") : border
          } rounded-[18px] px-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock
              size={15}
              className={hasTime ? (isDark ? "text-[#FFC554]" : "text-[#881337]") : mutedText}
            />
            {hasTime ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black tracking-tight ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
                </span>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    isDark
                      ? "bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40"
                      : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
                  }`}
                >
                  {ampm}
                </span>
              </div>
            ) : (
              <span className={`text-xs font-bold ${mutedText}`}>
                Pick a Time (from clock)
              </span>
            )}
          </div>
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
              hasTime
                ? isDark
                  ? "bg-[#FFC554] text-black shadow-sm"
                  : "bg-[#881337] text-white shadow-sm"
                : isDark
                ? "bg-white/10 text-zinc-400"
                : "bg-black/5 text-zinc-500"
            }`}
          >
            {hasTime ? "Change" : "Select"}
          </span>
          <input
            ref={timeInputRef}
            type="time"
            value={rawTime24}
            onChange={handleTimeChange}
            onClick={(e) => {
              e.stopPropagation();
              try {
                if ("showPicker" in HTMLInputElement.prototype) {
                  e.currentTarget.showPicker();
                }
              } catch (err) { logger.error("src/components/loop/LoopDateTimePicker.tsx: swallowed non-fatal error", err); }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
