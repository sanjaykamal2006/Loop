"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Users, Calendar, Clock, Repeat, TrainFront, Flag, ArrowUpDown } from "lucide-react";
import { getLocalTodayStr, buildDepartureDate, formatDDMMYYYY } from "@/lib/dateFormatter";
import { SteeringWheelIcon, ScooterIcon, MotorcycleIcon, CarIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";
import { formatLocation } from "@/lib/locationFormatter";

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
        console.error(error);
        toast.error("Failed to create loop. Please try again.");
      } else if (data) {
        await supabase.from("loop_members").insert({ loop_id: data.id, user_id: session.user.id });
        toast.success(isReturnTrip ? "Return ride created! 🔄" : isDriver ? "Ride offer created!" : "Loop created!");

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
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreatingLoop(false);
    }
  };

  return (
    <div className="space-y-2.5 pt-1 pb-4">
      {/* Return Trip Banner */}
      {isReturnTrip && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-[16px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold animate-fade-in shadow-sm">
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
      {/* Unified Route & Schedule Card (MakeMyTrip / Train style) */}
      <div className={`relative ${cardBg} border ${border} rounded-[26px] shadow-sm overflow-hidden`}>
        {/* Row 1: Starting Point */}
        <div className="relative px-4 py-3 sm:py-3.5 pr-14 flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
            <TrainFront size={22} strokeWidth={1.8} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
          </div>
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] block leading-tight`}>
              Starting Point
            </label>
            <input
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              onBlur={() => setStartPoint(formatLocation(startPoint))}
              placeholder="Where from?"
              className={`w-full bg-transparent border-0 outline-none p-0 mt-0.5 text-[15px] sm:text-base font-black ${
                isDark ? "text-white" : "text-zinc-900"
              } placeholder:text-zinc-500 placeholder:font-normal placeholder:text-xs`}
            />
          </div>
        </div>

        {/* Divider with Circular Swap Button */}
        <div className="relative w-full border-b border-white/[0.08] dark:border-white/[0.08] border-black/[0.06]">
          <button
            type="button"
            onClick={handleSwapLocations}
            aria-label="Swap starting point and destination"
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm ${
              isDark
                ? "bg-[#1c1c1e] border border-white/15 text-[#FFC554] hover:border-[#FFC554]/50"
                : "bg-white border border-black/10 text-[#881337] hover:border-[#881337]/50"
            }`}
          >
            <ArrowUpDown size={14} strokeWidth={2.4} />
          </button>
        </div>

        {/* Row 2: Destination */}
        <div className="relative px-4 py-3 sm:py-3.5 pr-14 flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 relative">
            <TrainFront size={22} strokeWidth={1.8} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
            <Flag size={9} strokeWidth={2.6} className={`absolute bottom-0 right-0 ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] block leading-tight`}>
              Destination
            </label>
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onBlur={() => setDest(formatLocation(dest))}
              placeholder="Where to?"
              className={`w-full bg-transparent border-0 outline-none p-0 mt-0.5 text-[15px] sm:text-base font-black ${
                isDark ? "text-white" : "text-zinc-900"
              } placeholder:text-zinc-500 placeholder:font-normal placeholder:text-xs`}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-b border-white/[0.08] dark:border-white/[0.08] border-black/[0.06]" />

        {/* Row 3: Date of Journey */}
        <div
          onClick={handleOpenDatePicker}
          className="relative px-4 py-2.5 sm:py-3 flex items-center justify-between cursor-pointer active:bg-white/[0.03] dark:active:bg-white/[0.03] active:bg-black/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
              <Calendar size={20} strokeWidth={1.8} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
            </div>
            <div>
              <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] block leading-tight`}>
                Date of Journey
              </label>
              <p className={`text-sm sm:text-[15px] font-black mt-0.5 ${
                travelDate ? (isDark ? "text-white" : "text-zinc-900") : mutedText
              }`}>
                {travelDate ? formatJourneyDate(travelDate) : "Select Journey Date"}
              </p>
            </div>
          </div>
          
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
            travelDate
              ? (isDark ? "bg-[#FFC554] text-black shadow-sm" : "bg-[#881337] text-white shadow-sm")
              : (isDark ? "bg-white/10 text-zinc-400" : "bg-black/5 text-zinc-500")
          }`}>
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
                if ('showPicker' in HTMLInputElement.prototype) {
                  e.currentTarget.showPicker();
                }
              } catch {}
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Divider */}
        <div className="w-full border-b border-white/[0.08] dark:border-white/[0.08] border-black/[0.06]" />

        {/* Row 4: Time of Travel */}
        <div
          onClick={handleOpenTimePicker}
          className="relative px-4 py-2.5 sm:py-3 flex items-center justify-between cursor-pointer active:bg-white/[0.03] dark:active:bg-white/[0.03] active:bg-black/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={20} strokeWidth={1.8} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
            </div>
            <div>
              <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] block leading-tight`}>
                Time of Travel
              </label>
              {hasTime ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-sm sm:text-[15px] font-black ${isDark ? "text-white" : "text-zinc-900"}`}>
                    {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    isDark
                      ? "bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40"
                      : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
                  }`}>
                    {ampm}
                  </span>
                </div>
              ) : (
                <p className={`text-sm sm:text-[15px] font-black mt-0.5 ${mutedText}`}>
                  Select Departure Time
                </p>
              )}
            </div>
          </div>

          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
            hasTime
              ? (isDark ? "bg-[#FFC554] text-black shadow-sm" : "bg-[#881337] text-white shadow-sm")
              : (isDark ? "bg-white/10 text-zinc-400" : "bg-black/5 text-zinc-500")
          }`}>
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
                  timeInputRef.current?.showPicker();
                }
              } catch {}
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      {/* Offering a Ride Toggle Card with Compact Vehicle Pills */}
      <div className={`p-3.5 px-4 ${cardBg} border ${border} rounded-[22px] space-y-2.5 transition-all ${
        isDriver ? (isDark ? "border-[#FFC554]/50 shadow-sm" : "border-[#881337]/40 shadow-sm") : ""
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              isDriver 
                ? (isDark ? "bg-[#FFC554] text-black shadow-sm" : "bg-[#881337] text-white shadow-sm") 
                : (isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40")
            }`}>
              <SteeringWheelIcon size={18} />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-black tracking-tight uppercase block leading-tight">Offering a Ride</span>
              <p className={`text-[10px] font-bold ${mutedText} leading-tight`}>Offer a lift with your vehicle</p>
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
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
              isDriver 
                ? (isDark ? "bg-[#FFC554]" : "bg-[#881337]") 
                : (isDark ? "bg-zinc-800" : "bg-zinc-300")
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isDriver ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Compact 1-Row Vehicle Selection Pills */}
        {isDriver && (
          <div className="pt-1.5 border-t border-white/5 flex gap-1.5 animate-fade-in">
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
                  className={`flex-1 h-8 rounded-xl border flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs ${
                    isSelected
                      ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm font-black" : "bg-[#881337] border-[#881337] text-white shadow-sm font-black")
                      : `${bg} ${border} ${mutedText} font-bold`
                  }`}
                >
                  <v.Icon size={14} strokeWidth={2.2} className={isSelected ? (isDark ? "text-black" : "text-white") : (isDark ? "text-[#FFC554]" : "text-[#881337]")} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{v.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Seats / Capacity */}
      {isDriver && vehicleType === "car" ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between ml-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em]`}>
              Passenger Seats to Offer
            </label>
            <span className={`text-[10px] font-bold ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              {limit} {limit === 1 ? "passenger" : "passengers"} (+ driver)
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${
                  limit === n
                    ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : "bg-[#881337] border-[#881337] text-white shadow-sm")
                    : `${border} ${cardBg} ${mutedText}`
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : isDriver && (vehicleType === "bike" || vehicleType === "scooter") ? (
        <div className={`p-3 ${cardBg} border ${border} rounded-[18px] flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg ${
              isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
            } flex items-center justify-center shrink-0`}>
              <Users size={14} />
            </div>
            <div>
              <p className={`text-[10px] uppercase font-black ${mutedText} tracking-wider`}>Capacity</p>
              <p className="text-xs font-black">1 Passenger Seat (Pillion)</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold ${
            isDark ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20" : "text-[#881337] bg-[#881337]/10 border border-[#881337]/25"
          } px-2.5 py-1 rounded-full`}>
            Driver + 1 Rider
          </span>
        </div>
      ) : !isDriver ? (
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Total Group Size</label>
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${
                    limit === n 
                      ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : "bg-[#881337] border-[#881337] text-white shadow-sm") 
                      : `${border} ${cardBg} ${mutedText}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 px-4">
              {[7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${
                    limit === n 
                      ? (isDark ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : "bg-[#881337] border-[#881337] text-white shadow-sm") 
                      : `${border} ${cardBg} ${mutedText}`
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
        className={`flex items-center justify-between p-3 px-3.5 ${cardBg} border ${border} rounded-[20px] cursor-pointer active:scale-[0.99] transition-all ${isFemaleOnly ? "border-pink-500/50" : ""}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isFemaleOnly ? "bg-pink-500 text-white" : isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40"}`}>
            <Users size={16} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight uppercase">Female Only</span>
            <p className={`text-[9px] font-bold ${mutedText}`}>Visible to women only</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFemaleOnly();
          }}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${isFemaleOnly ? "bg-pink-500" : isDark ? "bg-zinc-800" : "bg-zinc-300"}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isFemaleOnly ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={createLoop}
        disabled={isCreatingLoop}
        className={`w-full h-12 ${
          isDark 
            ? "bg-[#FFC554] hover:bg-[#FFC554]/90 text-black" 
            : "bg-[#881337] hover:bg-[#700f2b] text-white"
        } font-black rounded-[20px] text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all`}
      >
        {isCreatingLoop ? "Creating..." : isDriver ? "Offer Ride" : "Create Loop"}
      </button>
    </div>
  );
}
