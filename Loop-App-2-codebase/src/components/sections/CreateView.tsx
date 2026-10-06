"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Users, Calendar, Clock, Repeat, Flag, ArrowUpDown } from "lucide-react";
import { getLocalTodayStr, buildDepartureDate, formatDDMMYYYY } from "@/lib/dateFormatter";
import { SteeringWheelIcon, ScooterIcon, MotorcycleIcon, CarIcon, AutoRickshawIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";
import { formatLocation } from "@/lib/locationFormatter";
import ReturnTripModal, { PrimaryLoopDetails } from "./ReturnTripModal";

export default function CreateView() {
  const { session, profile, setView, fetchLoops, fetchUserMemberships, setShowGenderSelect, setPendingAction, pendingAction, showGenderSelect, theme, isProfileLoaded, createPrefill, setCreatePrefill } = useLoop();
  const { isDark, bg, border, cardBg, mutedText } = theme;

  const [startPoint, setStartPoint] = useState("");
  const [dest, setDest] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const todayStr = getLocalTodayStr();
  const [travelDate, setTravelDate] = useState("");
  const [isReturnTrip, setIsReturnTrip] = useState(false);
  const [createdLoopInfo, setCreatedLoopInfo] = useState<PrimaryLoopDetails | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleSwapLocations = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);
    const temp = startPoint;
    setStartPoint(dest);
    setDest(temp);
  };

  const formatJourneyDate = (dateStr: string) => {
    if (!dateStr) return "Pick a Date";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  useEffect(() => {
    if (createPrefill) {
      if (createPrefill.startPoint) setStartPoint(createPrefill.startPoint);
      if (createPrefill.destination) setDest(createPrefill.destination);
      if (createPrefill.isReturn) setIsReturnTrip(true);
    }
  }, [createPrefill]);

  const rawTime24 = React.useMemo(() => {
    if (!hour || !minute) return "";
    let h = parseInt(hour, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }, [hour, minute, ampm]);

  const hasTime = Boolean(hour && minute);
  const formattedTimeDisplay = hasTime
    ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")} ${ampm}`
    : "Select Departure Time";

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

  const handleOpenDatePicker = () => {
    triggerHaptic(8);
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  };
  const [limit, setLimit] = useState(4);
  const [isFemaleOnly, setIsFemaleOnly] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [vehicleType, setVehicleType] = useState<"scooter" | "bike" | "car">("bike");
  const [isCreatingLoop, setIsCreatingLoop] = useState(false);

  const handleHourChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) { setHour(''); return; }
    let num = parseInt(digits);
    if (num > 12) setHour('12');
    else setHour(digits);
  };

  const handleMinuteChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) { setMinute(''); return; }
    let num = parseInt(digits);
    if (num > 59) setMinute('59');
    else setMinute(digits);
  };

  const padTime = () => {
    if (hour) setHour(hour.padStart(2, '0'));
    if (minute) setMinute(minute.padStart(2, '0'));
  };

  const applyTimePreset = (minutesToAdd: number) => {
    triggerHaptic(8);
    const target = new Date(Date.now() + minutesToAdd * 60 * 1000);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    setTravelDate(`${y}-${m}-${d}`);

    const rawH = target.getHours();
    const rawM = target.getMinutes();
    const newAmpm = rawH >= 12 ? "PM" : "AM";
    const h12 = rawH % 12 || 12;
    setHour(String(h12).padStart(2, "0"));
    setMinute(String(rawM).padStart(2, "0"));
    setAmpm(newAmpm);
  };

  // Strictly require completed profile to access or submit in CreateView (only after profile is loaded)
  useEffect(() => {
    if (!isProfileLoaded) return;
    const isProfileComplete = Boolean(
      profile.gender && 
      profile.display_name?.trim() && 
      profile.reg_no?.trim()
    );
    if (!isProfileComplete) {
      setPendingAction({ type: "create" });
      setShowGenderSelect(true);
    }
  }, [isProfileLoaded, profile.gender, profile.display_name, profile.reg_no, setPendingAction, setShowGenderSelect]);

  const handleToggleFemaleOnly = () => {
    triggerHaptic(8);
    if (!isFemaleOnly && profile.gender !== "female") {
      toast.error("Applicable for female travellers only");
      return;
    }
    setIsFemaleOnly(!isFemaleOnly);
  };

  const createLoop = async () => {
    triggerHaptic(15);
    const isProfileComplete = Boolean(
      profile.gender && 
      profile.display_name?.trim() && 
      profile.reg_no?.trim()
    );
    if (!isProfileComplete) {
      setPendingAction({ type: "create" });
      setShowGenderSelect(true);
      return;
    }
    const formattedStart = formatLocation(startPoint);
    const formattedDest = formatLocation(dest);

    if (!formattedStart) return toast.error("Starting Point is required");
    if (!formattedDest) return toast.error("Destination is required");
    if (formattedStart.toLowerCase() === formattedDest.toLowerCase()) {
      return toast.error("Starting point and destination cannot be the same");
    }
    if (isFemaleOnly && profile.gender !== "female") {
      return toast.error("Applicable for female travellers only");
    }
    if (!hour.trim() || !minute.trim()) return toast.error("Time of Travel is required");
    if (isCreatingLoop) return;

    setIsCreatingLoop(true);
    if (!travelDate) {
      setIsCreatingLoop(false);
      return toast.error("Date of Travel is required");
    }

    const departure = buildDepartureDate(travelDate, hour, minute, ampm);

    // If user selected Today and the time has already passed
    if (travelDate === todayStr && departure.getTime() < Date.now() - 5 * 60 * 1000) {
      setIsCreatingLoop(false);
      return toast.error("Departure time has already passed for today. Please pick a future time or date.");
    }

    const expiresAt = new Date(departure);
    expiresAt.setHours(expiresAt.getHours() + 5);

    const finalLimit = isDriver ? (vehicleType === "car" ? limit + 1 : 2) : limit;

    try {
      const { data, error } = await supabase
        .from("loops")
        .insert({
          creator_id: session.user.id,
          start_point: formattedStart,
          destination: formattedDest,
          departure_time: departure.toISOString(),
          participants_limit: finalLimit,
          is_female_only: isFemaleOnly,
          is_driver_offering: isDriver,
          vehicle_type: isDriver ? vehicleType : null,
          expires_at: expiresAt.toISOString(),
          status: "open",
          purpose: isReturnTrip ? "return" : null,
        })
        .select()
        .single();

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Create loop error:", error);
        }
        toast.error("Failed to create loop. Please try again.");
      } else if (data) {
        await supabase.from("loop_members").insert({ loop_id: data.id, user_id: session.user.id });

        if (isReturnTrip) {
          toast.success("Return ride created! 🔄");
          setStartPoint("");
          setDest("");
          setHour("");
          setMinute("");
          setTravelDate("");
          setIsDriver(false);
          setIsReturnTrip(false);
          setCreatePrefill(null);
          setView("home");
          fetchLoops(true);
          fetchUserMemberships(true);
        } else {
          toast.success(isDriver ? "Ride offer created!" : "Loop created!");
          const primaryInfo: PrimaryLoopDetails = {
            id: data.id,
            startPoint: formattedStart,
            destination: formattedDest,
            travelDate,
            hour,
            minute,
            ampm,
            limit: finalLimit,
            isFemaleOnly,
            isDriver,
            vehicleType: isDriver ? vehicleType : null,
          };
          setCreatedLoopInfo(primaryInfo);
          setShowReturnModal(true);

          setStartPoint("");
          setDest("");
          setHour("");
          setMinute("");
          setTravelDate("");
          setIsDriver(false);
          setCreatePrefill(null);
          fetchLoops(true);
          fetchUserMemberships(true);
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreatingLoop(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-3.5 pt-1.5 pb-2">
      {/* Return Trip Banner */}
      {isReturnTrip && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[18px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold animate-fade-in shadow-sm">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
            <Repeat size={12} strokeWidth={2.5} />
            <span>Return Ride (Auto-Reversed Route)</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setIsReturnTrip(false);
              setCreatePrefill(null);
              setStartPoint("");
              setDest("");
            }}
            className="text-[9px] uppercase font-black tracking-wider text-zinc-400 hover:text-white px-2 py-0.5 rounded-full bg-white/5"
          >
            Clear
          </button>
        </div>
      )}
      {/* Route Card (From & To) */}
      <div className={`relative ${cardBg} border ${border} rounded-[24px] shadow-sm overflow-hidden`}>
        {/* Row 1: Starting Point */}
        <div className="relative px-4 sm:px-5 py-3.5 pr-14 flex items-center gap-3.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? "bg-white/5 text-zinc-300" : "bg-black/5 text-zinc-700"
          }`}>
            <AutoRickshawIcon size={22} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider block leading-tight ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}>
              Starting Point
            </label>
            <input
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              onBlur={() => setStartPoint(formatLocation(startPoint))}
              placeholder="Where from?"
              className={`w-full bg-transparent border-0 outline-none p-0 mt-0.5 text-[15px] sm:text-base font-bold ${
                isDark ? "text-white placeholder:text-zinc-400" : "text-zinc-900 placeholder:text-stone-500"
              }`}
            />
          </div>
        </div>

        {/* Divider with Circular Swap Button */}
        <div className="relative w-full border-b border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={handleSwapLocations}
            aria-label="Swap starting point and destination"
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm cursor-pointer ${
              isDark
                ? "bg-[#1c1c1e] border border-white/15 text-[#FFC554] hover:border-[#FFC554]/50"
                : "bg-white border border-black/10 text-[#881337] hover:border-[#881337]/50"
            }`}
          >
            <ArrowUpDown size={14} strokeWidth={2.4} />
          </button>
        </div>

        {/* Row 2: Destination */}
        <div className="relative px-4 sm:px-5 py-3.5 pr-14 flex items-center gap-3.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative ${
            isDark ? "bg-white/5 text-zinc-300" : "bg-black/5 text-zinc-700"
          }`}>
            <AutoRickshawIcon size={22} strokeWidth={1.8} />
            <Flag size={10} strokeWidth={2.6} className={`absolute bottom-1 right-1 ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider block leading-tight ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}>
              Destination
            </label>
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onBlur={() => setDest(formatLocation(dest))}
              placeholder="Where to?"
              className={`w-full bg-transparent border-0 outline-none p-0 mt-0.5 text-[15px] sm:text-base font-bold ${
                isDark ? "text-white placeholder:text-zinc-400" : "text-zinc-900 placeholder:text-stone-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Schedule Card (Date & Time Side-by-Side) */}
      <div className={`relative ${cardBg} border ${border} rounded-[22px] shadow-sm overflow-hidden grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.08]`}>
        {/* Date Column */}
        <div
          onClick={handleOpenDatePicker}
          className="relative p-3.5 sm:p-4 cursor-pointer active:bg-black/[0.03] dark:active:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={15} strokeWidth={2.2} className={travelDate ? (isDark ? "text-[#FFC554]" : "text-[#881337]") : (isDark ? "text-zinc-400" : "text-stone-500")} />
            <span className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}>
              Date
            </span>
          </div>
          <div className="mt-1.5">
            <p className={`text-sm sm:text-[15px] font-bold truncate ${
              travelDate
                ? (isDark ? "text-white font-black" : "text-zinc-950 font-black")
                : (isDark ? "text-zinc-200" : "text-stone-800")
            }`}>
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
                if ('showPicker' in HTMLInputElement.prototype) {
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
            <Clock size={15} strokeWidth={2.2} className={hasTime ? (isDark ? "text-[#FFC554]" : "text-[#881337]") : (isDark ? "text-zinc-400" : "text-stone-500")} />
            <span className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}>
              Time
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {hasTime ? (
              <>
                <span className={`text-sm sm:text-[15px] font-black ${isDark ? "text-white" : "text-zinc-950"}`}>
                  {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isDark
                    ? "bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40"
                    : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
                }`}>
                  {ampm}
                </span>
              </>
            ) : (
              <p className={`text-sm sm:text-[15px] font-bold ${
                isDark ? "text-zinc-200" : "text-stone-800"
              }`}>
                Select Time
              </p>
            )}
          </div>
          <input
            ref={timeInputRef}
            type="time"
            value={rawTime24}
            onChange={handleTimeChange}
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

      {/* Quick Departure Presets (+15m, +30m, +1h, +2h) */}
      <div className="flex items-center gap-1.5 px-0.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-stone-500"} shrink-0 flex items-center gap-1`}>
          <Clock size={11} strokeWidth={2.4} /> Quick:
        </span>
        <div className="flex items-center gap-1.5 flex-1">
          {[
            { label: "+15m", mins: 15 },
            { label: "+30m", mins: 30 },
            { label: "+1h", mins: 60 },
            { label: "+2h", mins: 120 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyTimePreset(preset.mins)}
              className={`flex-1 py-1 px-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 border cursor-pointer text-center ${
                isDark
                  ? "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/10 hover:border-[#FFC554]/50 hover:text-[#FFC554]"
                  : "bg-black/[0.03] hover:bg-black/[0.06] text-zinc-700 border-black/10 hover:border-[#881337]/50 hover:text-[#881337]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offering a Ride Toggle Card with Compact Vehicle Pills */}
      <div className={`p-4 sm:p-4.5 px-4.5 ${cardBg} border ${border} rounded-[24px] space-y-2.5 transition-all ${
        isDriver ? (isDark ? "border-[#FFC554]/50 shadow-sm" : "border-[#881337]/40 shadow-sm") : ""
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
              isDriver 
                ? (isDark ? "bg-[#FFC554] text-black shadow-sm" : "bg-[#881337] text-white shadow-sm") 
                : (isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40")
            }`}>
              <SteeringWheelIcon size={20} />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs sm:text-[13px] font-black tracking-tight uppercase block leading-tight">Offering a Ride</span>
              <p className={`text-[10px] sm:text-[11px] font-bold ${mutedText} leading-tight`}>Offer a lift with your vehicle</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !isDriver;
              setIsDriver(next);
              if (next) {
                if (vehicleType === "bike" || vehicleType === "scooter") setLimit(1);
                else setLimit(3);
              } else {
                setLimit(4);
              }
            }}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
              isDriver 
                ? (isDark ? "bg-[#FFC554]" : "bg-[#881337]") 
                : (isDark ? "bg-zinc-800" : "bg-zinc-300")
            }`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${isDriver ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Compact 1-Row Vehicle Selection Pills */}
        {isDriver && (
          <div className="pt-2 border-t border-white/5 flex gap-2 animate-fade-in">
            {[
              { type: "scooter", label: "Scooter (1)", Icon: ScooterIcon },
              { type: "bike", label: "Bike (1)", Icon: MotorcycleIcon },
              { type: "car", label: "Car (1-6)", Icon: CarIcon }
            ].map(v => {
              const isSelected = vehicleType === v.type;
              return (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => {
                    setVehicleType(v.type as any);
                    if (v.type === "scooter" || v.type === "bike") {
                      setLimit(1);
                    } else if (limit === 1) {
                      setLimit(3);
                    }
                  }}
                  className={`flex-1 h-9 sm:h-10 rounded-xl border flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs cursor-pointer ${
                    isSelected
                      ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm font-black" : "bg-[#881337] border-[#881337] text-white shadow-sm font-black")
                      : `${cardBg} ${border} ${isDark ? "text-zinc-300" : "text-stone-700"} font-bold`
                  }`}
                >
                  <v.Icon size={15} strokeWidth={2.2} className={isSelected ? (isDark ? "text-black" : "text-white") : (isDark ? "text-[#FFC554]" : "text-[#881337]")} />
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider">{v.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Seats / Capacity */}
      {isDriver && vehicleType === "car" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className={`text-[10px] sm:text-[11px] uppercase font-black ${mutedText} tracking-[0.15em]`}>
              Passenger Seats to Offer
            </label>
            <span className={`text-[11px] font-bold ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              {limit} {limit === 1 ? "passenger" : "passengers"} (+ driver)
            </span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={`flex-1 h-11 sm:h-12 rounded-2xl border font-black text-sm sm:text-base active:scale-95 transition-all cursor-pointer ${
                  limit === n
                    ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : "bg-[#881337] border-[#881337] text-white shadow-sm")
                    : `${border} ${cardBg} ${isDark ? "text-zinc-300" : "text-stone-700"}`
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : isDriver && (vehicleType === "bike" || vehicleType === "scooter") ? (
        <div className={`p-3.5 ${cardBg} border ${border} rounded-[20px] flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl ${
              isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
            } flex items-center justify-center shrink-0`}>
              <Users size={16} />
            </div>
            <div>
              <p className={`text-[10px] uppercase font-black ${mutedText} tracking-wider`}>Capacity</p>
              <p className="text-xs sm:text-sm font-black">1 Passenger Seat (Pillion)</p>
            </div>
          </div>
          <span className={`text-[10px] sm:text-[11px] font-bold ${
            isDark ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20" : "text-[#881337] bg-[#881337]/10 border border-[#881337]/25"
          } px-3 py-1 rounded-full`}>
            Driver + 1 Rider
          </span>
        </div>
      ) : !isDriver ? (
        <div className="space-y-1.5">
          <label className={`text-[10px] sm:text-[11px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Total Group Size</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 h-11 sm:h-12 rounded-2xl border font-black text-sm sm:text-base active:scale-95 transition-all cursor-pointer ${
                    limit === n 
                      ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : "bg-[#881337] border-[#881337] text-white shadow-sm") 
                      : `${border} ${cardBg} ${isDark ? "text-zinc-300" : "text-stone-700"}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-3 sm:px-4">
              {[7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 h-11 sm:h-12 rounded-2xl border font-black text-sm sm:text-base active:scale-95 transition-all cursor-pointer ${
                    limit === n 
                      ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : "bg-[#881337] border-[#881337] text-white shadow-sm") 
                      : `${border} ${cardBg} ${isDark ? "text-zinc-300" : "text-stone-700"}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Female Only Option */}
      <div 
        onClick={handleToggleFemaleOnly}
        className={`flex items-center justify-between p-3.5 px-4 ${cardBg} border ${border} rounded-[22px] cursor-pointer active:scale-[0.99] transition-all ${isFemaleOnly ? "border-pink-500/50" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isFemaleOnly ? "bg-pink-500 text-white" : isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40"}`}>
            <Users size={17} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs sm:text-[13px] font-black tracking-tight uppercase">Female Only</span>
            <p className={`text-[10px] font-bold ${mutedText}`}>Visible to women only</p>
            {isFemaleOnly && (
              <p className="text-[9px] text-pink-400 font-medium leading-tight mt-1 animate-fade-in">
                Based on self-reported gender at signup. Not independently verified.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFemaleOnly();
          }}
          className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${isFemaleOnly ? "bg-pink-500" : isDark ? "bg-zinc-800" : "bg-zinc-300"}`}
        >
          <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${isFemaleOnly ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={createLoop}
        disabled={isCreatingLoop}
        className={`w-full h-13 sm:h-14 ${
          isDark 
            ? "bg-[#FFC554] hover:bg-[#FFC554]/90 text-black" 
            : "bg-[#881337] hover:bg-[#700f2b] text-white"
        } font-black rounded-[22px] text-xs sm:text-[13px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer`}
      >
        {isCreatingLoop ? "Creating..." : isDriver ? "Offer Ride" : "Create Loop"}
      </button>

      {/* Return Trip Modal */}
      <ReturnTripModal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setView("home");
        }}
        primaryLoop={createdLoopInfo}
      />
    </div>
  );
}
