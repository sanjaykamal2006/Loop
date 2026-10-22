"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const POPULAR_DESTINATIONS = [
  "Vijayawada Railway Station",
  "Airport",
  "Vijayawada Bus Stand",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad2 = (n: number) => String(n).padStart(2, "0");

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
  return `${h}:${pad2(m)} ${ampm}`;
}

function parse24to12(time24: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  if (!time24) return { hour: 10, minute: 0, ampm: "AM" };
  const parts = time24.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return { hour: 10, minute: 0, ampm: "AM" };
  const [h24, m] = [parts[0], parts[1]];
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour = h24 % 12 || 12;
  const roundedMin = Math.round(m / 5) * 5;
  const minute = roundedMin >= 60 ? 55 : roundedMin;
  return { hour, minute, ampm };
}

function convert12to24(hour: number, minute: number, ampm: "AM" | "PM"): string {
  let h = hour;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${pad2(h)}:${pad2(minute)}`;
}

interface DatePickerPopoverProps {
  selectedDate: string;
  minDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onDone: () => void;
  theme: {
    isDark: boolean;
    cardBg: string;
    border: string;
    mutedText: string;
  };
}

function DatePickerPopover({
  selectedDate,
  minDateStr,
  onSelectDate,
  onDone,
  theme,
}: DatePickerPopoverProps) {
  const { isDark, cardBg, border, mutedText } = theme;

  // Calculate min and max (today to today + 60 days)
  const minParts = (minDateStr || "").split("-").map(Number);
  const minDate = minParts.length === 3 && !minParts.some(isNaN)
    ? new Date(minParts[0], minParts[1] - 1, minParts[2])
    : new Date();
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + 60);

  const effectiveMinStr = `${minDate.getFullYear()}-${pad2(minDate.getMonth() + 1)}-${pad2(minDate.getDate())}`;
  const effectiveMaxStr = `${maxDate.getFullYear()}-${pad2(maxDate.getMonth() + 1)}-${pad2(maxDate.getDate())}`;

  // Initial view month based on selectedDate or minDate
  const initialParts = (selectedDate || effectiveMinStr).split("-").map(Number);
  const initialYear = initialParts[0] || minDate.getFullYear();
  const initialMonth = (initialParts[1] ? initialParts[1] - 1 : minDate.getMonth());

  const [viewDate, setViewDate] = useState<{ year: number; month: number }>({
    year: initialYear,
    month: initialMonth,
  });

  const isPrevDisabled =
    viewDate.year < minDate.getFullYear() ||
    (viewDate.year === minDate.getFullYear() && viewDate.month <= minDate.getMonth());

  const isNextDisabled =
    viewDate.year > maxDate.getFullYear() ||
    (viewDate.year === maxDate.getFullYear() && viewDate.month >= maxDate.getMonth());

  const handlePrevMonth = () => {
    triggerHaptic(6);
    setViewDate((prev) => {
      const month = prev.month === 0 ? 11 : prev.month - 1;
      const year = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year, month };
    });
  };

  const handleNextMonth = () => {
    triggerHaptic(6);
    setViewDate((prev) => {
      const month = prev.month === 11 ? 0 : prev.month + 1;
      const year = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year, month };
    });
  };

  // Weekday alignment Mon-Sun: Monday=0 ... Sunday=6
  const firstDayOfWeek = new Date(viewDate.year, viewDate.month, 1).getDay();
  const leadingBlanks = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();

  return (
    <div
      role="dialog"
      aria-label="Calendar date picker"
      className={`absolute top-full left-0 right-0 mt-2 z-40 p-4 rounded-2xl border ${border} ${cardBg} shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150`}
    >
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
          aria-label="Previous month"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isPrevDisabled
              ? "opacity-25 cursor-not-allowed"
              : isDark
              ? "hover:bg-white/10 text-white"
              : "hover:bg-black/10 text-zinc-900"
          }`}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold tracking-tight">
          {MONTH_NAMES[viewDate.month]} {viewDate.year}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={isNextDisabled}
          aria-label="Next month"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isNextDisabled
              ? "opacity-25 cursor-not-allowed"
              : isDark
              ? "hover:bg-white/10 text-white"
              : "hover:bg-black/10 text-zinc-900"
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday Labels Mon-Sun */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((w) => (
          <span key={w} className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
            {w}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-8 w-full" aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const dateStr = `${viewDate.year}-${pad2(viewDate.month + 1)}-${pad2(d)}`;
          const isDisabled = dateStr < effectiveMinStr || dateStr > effectiveMaxStr;
          const isToday = dateStr === effectiveMinStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={d}
              type="button"
              disabled={isDisabled}
              aria-label={`Select ${dateStr}`}
              aria-pressed={isSelected}
              onClick={() => {
                triggerHaptic(8);
                onSelectDate(dateStr);
              }}
              className={`h-8 w-full rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                isSelected
                  ? isDark
                    ? "bg-[#FFC554] text-black font-black shadow-sm"
                    : "bg-[#881337] text-white font-black shadow-sm"
                  : isToday
                  ? `ring-1 ${isDark ? "ring-[#FFC554] text-[#FFC554]" : "ring-[#881337] text-[#881337]"} font-bold`
                  : isDisabled
                  ? "opacity-20 cursor-not-allowed pointer-events-none"
                  : isDark
                  ? "hover:bg-white/10 text-zinc-200 cursor-pointer"
                  : "hover:bg-black/5 text-zinc-800 cursor-pointer"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Popover Footer with Done button */}
      <div className="pt-2.5 mt-2 border-t border-white/10 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            isDark
              ? "bg-[#FFC554] text-black hover:bg-[#FFC554]/90"
              : "bg-[#881337] text-white hover:bg-[#881337]/90"
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface TimePickerPopoverProps {
  selectedTime: string;
  onSelectTime: (timeStr: string) => void;
  onDone: () => void;
  theme: {
    isDark: boolean;
    cardBg: string;
    border: string;
  };
}

function TimePickerPopover({
  selectedTime,
  onSelectTime,
  onDone,
  theme,
}: TimePickerPopoverProps) {
  const { isDark, cardBg, border } = theme;

  const parsed = useMemo(() => parse24to12(selectedTime), [selectedTime]);
  const [hour, setHour] = useState<number>(parsed.hour);
  const [minute, setMinute] = useState<number>(parsed.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed.ampm);

  const handleHourChange = (newHour: number) => {
    triggerHaptic(8);
    setHour(newHour);
    onSelectTime(convert12to24(newHour, minute, ampm));
  };

  const handleMinuteChange = (newMinute: number) => {
    triggerHaptic(8);
    setMinute(newMinute);
    onSelectTime(convert12to24(hour, newMinute, ampm));
  };

  const handleAmpmChange = (newAmpm: "AM" | "PM") => {
    triggerHaptic(8);
    setAmpm(newAmpm);
    onSelectTime(convert12to24(hour, minute, newAmpm));
  };

  const handleClear = () => {
    triggerHaptic(8);
    onSelectTime("");
    onDone();
  };

  const handleDone = () => {
    triggerHaptic(8);
    onSelectTime(convert12to24(hour, minute, ampm));
    onDone();
  };

  const minuteSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div
      role="dialog"
      aria-label="Clock time picker"
      className={`absolute top-full left-0 right-0 mt-2 z-40 p-4 rounded-2xl border ${border} ${cardBg} shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-3`}
    >
      {/* Header with AM/PM Segmented Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Time (12-hour)
        </span>
        <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/10">
          {(["AM", "PM"] as const).map((period) => {
            const isCurrent = ampm === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => handleAmpmChange(period)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? isDark
                      ? "bg-[#FFC554] text-black font-black"
                      : "bg-[#881337] text-white font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {period}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hour Picker (1 to 12) */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Hour
        </span>
        <div className="grid grid-cols-6 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
            const isSelected = hour === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => handleHourChange(h)}
                className={`h-7.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-[#FFC554] text-black font-black shadow-sm"
                      : "bg-[#881337] text-white font-black shadow-sm"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 text-zinc-300"
                    : "bg-black/5 hover:bg-black/10 text-zinc-700"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minute Picker (5-min intervals) */}
      <div className="space-y-1 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Minute
        </span>
        <div className="grid grid-cols-6 gap-1">
          {minuteSteps.map((m) => {
            const isSelected = minute === m;
            const mStr = pad2(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleMinuteChange(m)}
                className={`h-7.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-[#FFC554] text-black font-black shadow-sm"
                      : "bg-[#881337] text-white font-black shadow-sm"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 text-zinc-300"
                    : "bg-black/5 hover:bg-black/10 text-zinc-700"
                }`}
              >
                :{mStr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions: Clear and Done */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-bold text-zinc-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleDone}
          className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            isDark
              ? "bg-[#FFC554] text-black hover:bg-[#FFC554]/90"
              : "bg-[#881337] text-white hover:bg-[#881337]/90"
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function RideWantsView() {
  const { setView, theme, profile, setCreatePrefill, setPendingAction, setShowGenderSelect } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const { wants, loading, submitting, loadBoard, handlePost, handleMeToo } = useRideWants();

  const quickDayOptions = useMemo(() => getQuickDayOptions(), []);

  const [destination, setDestination] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(quickDayOptions[0]?.dateStr || "");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [openPopover, setOpenPopover] = useState<"date" | "time" | null>(null);

  const dateRowRef = useRef<HTMLDivElement>(null);
  const timeRowRef = useRef<HTMLDivElement>(null);
  const dateContainerRef = useRef<HTMLDivElement>(null);
  const timeContainerRef = useRef<HTMLDivElement>(null);

  const togglePopover = (type: "date" | "time") => {
    triggerHaptic(8);
    setOpenPopover((prev) => (prev === type ? null : type));
  };

  const closePopover = (type: "date" | "time") => {
    triggerHaptic(8);
    setOpenPopover(null);
    if (type === "date") {
      dateRowRef.current?.focus();
    } else {
      timeRowRef.current?.focus();
    }
  };

  // Keyboard Escape and Outside Tap handlers
  useEffect(() => {
    if (!openPopover) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        triggerHaptic(8);
        const closing = openPopover;
        setOpenPopover(null);
        if (closing === "date") dateRowRef.current?.focus();
        else if (closing === "time") timeRowRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        openPopover === "date" &&
        dateContainerRef.current &&
        !dateContainerRef.current.contains(target)
      ) {
        setOpenPopover(null);
      } else if (
        openPopover === "time" &&
        timeContainerRef.current &&
        !timeContainerRef.current.contains(target)
      ) {
        setOpenPopover(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [openPopover]);

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

          {/* Travel Date — in-app custom calendar popover */}
          <div className="space-y-1.5 relative" ref={dateContainerRef}>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Travel Date</label>
            <div
              role="button"
              tabIndex={0}
              ref={dateRowRef}
              aria-label="Travel date"
              aria-expanded={openPopover === "date"}
              onClick={() => togglePopover("date")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePopover("date");
                }
              }}
              className={`relative w-full h-14 ${cardBg} border ${border} rounded-2xl flex items-center px-4 gap-3 focus:border-[#FFC554]/80 focus:outline-none focus:ring-1 focus:ring-[#FFC554]/40 transition-all cursor-pointer select-none`}
            >
              <Calendar size={18} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#881337] shrink-0"} />
              <span className="flex-1 text-sm font-bold pointer-events-none">
                {selectedDate ? formatDepartDateLabel(selectedDate) || selectedDate : "Pick a date"}
              </span>
              <ChevronDown
                size={16}
                className={`opacity-60 shrink-0 pointer-events-none transition-transform duration-200 ${
                  openPopover === "date" ? "rotate-180" : ""
                }`}
              />
            </div>

            {openPopover === "date" && (
              <DatePickerPopover
                selectedDate={selectedDate}
                minDateStr={quickDayOptions[0]?.dateStr}
                onSelectDate={(d) => setSelectedDate(d)}
                onDone={() => closePopover("date")}
                theme={theme}
              />
            )}
          </div>

          {/* Travel Time — in-app custom clock popover */}
          <div className="space-y-1.5 relative" ref={timeContainerRef}>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Travel Time (optional)</label>
            <div
              role="button"
              tabIndex={0}
              ref={timeRowRef}
              aria-label="Travel time"
              aria-expanded={openPopover === "time"}
              onClick={() => togglePopover("time")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePopover("time");
                }
              }}
              className={`relative w-full h-14 ${cardBg} border ${border} rounded-2xl flex items-center px-4 gap-3 focus:border-[#FFC554]/80 focus:outline-none focus:ring-1 focus:ring-[#FFC554]/40 transition-all cursor-pointer select-none`}
            >
              <Clock size={18} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#881337] shrink-0"} />
              <span className="flex-1 text-sm font-bold pointer-events-none">
                {selectedTime ? formatTimeLabel(selectedTime) || selectedTime : "Pick a time"}
              </span>
              <ChevronDown
                size={16}
                className={`opacity-60 shrink-0 pointer-events-none transition-transform duration-200 ${
                  openPopover === "time" ? "rotate-180" : ""
                }`}
              />
            </div>

            {openPopover === "time" && (
              <TimePickerPopover
                selectedTime={selectedTime}
                onSelectTime={(t) => setSelectedTime(t)}
                onDone={() => closePopover("time")}
                theme={theme}
              />
            )}
          </div>

          {/* Optional Note */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note — anything useful"
            aria-label="Optional note"
            maxLength={80}
            className={`w-full h-10 px-3 text-sm rounded-xl bg-white/5 border ${border} outline-none placeholder:text-zinc-500 focus:border-[#FFC554]/50 transition-all`}
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
            <span>{submitting ? "Checking..." : "Find Co-Travellers"}</span>
          </button>
        </form>
      </div>

      {/* Co-Traveller Board Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Users size={14} />
            Who&apos;s Going?
          </h2>
          {wants.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/15 text-[#881337]"}`}>
              {wants.length} {wants.length === 1 ? "group" : "groups"} going
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
              <p className="text-sm font-black tracking-tight">No co-travellers yet</p>
              <p className={`text-xs ${mutedText} mt-1 max-w-[240px] mx-auto`}>
                Post your plan — stay anonymous until the ride forms. When 2 or more match, it shows here.
              </p>
            </div>
          </div>
        )}

        {/* Active Board Rows (aggregates only, >= 2 rows) */}
        {wants.map((row) => {
          const displayDest = formatLocation(row.destination_key);
          const dateLabel = formatDepartDateLabel(row.depart_date);
          const timeLabel = formatTimeLabel(row.first_depart_time);
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
                    {timeLabel && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDark ? "bg-white/10 text-zinc-300" : "bg-black/5 text-zinc-700"
                      }`}>
                        first leave {timeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold mt-1 text-[#FFC554]">
                    <span className="font-black text-sm">{row.intent_count}</span> students going this way
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
