"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Users, Calendar, Clock, ArrowUpDown } from "lucide-react";
import { getLocalTodayStr, buildDepartureDate, formatDDMMYYYY } from "@/lib/dateFormatter";
import { SteeringWheelIcon, ScooterIcon, MotorcycleIcon, CarIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";
import { formatLocation } from "@/lib/locationFormatter";
import ReturnTripModal, { PrimaryLoopDetails } from "./ReturnTripModal";

export default function CreateView() {
  const { session, profile, setView, fetchLoops, fetchUserMemberships, setShowGenderSelect, setPendingAction, pendingAction, showGenderSelect, theme, isProfileLoaded } = useLoop();
  const { isDark, bg, border, cardBg, mutedText } = theme;

  const [startPoint, setStartPoint] = useState("");
  const [dest, setDest] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const todayStr = getLocalTodayStr();
  const [travelDate, setTravelDate] = useState("");
  const [createdLoopInfo, setCreatedLoopInfo] = useState<PrimaryLoopDetails | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleSwapLocations = () => {
    triggerHaptic(8);
    const temp = startPoint;
    setStartPoint(dest);
    setDest(temp);
  };

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
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        toast.error("Failed to create loop. Please try again.");
      } else if (data) {
        await supabase.from("loop_members").insert({ loop_id: data.id, user_id: session.user.id });
        toast.success(isDriver ? "Ride offer created!" : "Loop created!");

        const createdDetails: PrimaryLoopDetails = {
          startPoint: formattedStart,
          destination: formattedDest,
          travelDate: travelDate,
          hour: hour,
          minute: minute,
          ampm: ampm,
          limit: finalLimit,
          isFemaleOnly: isFemaleOnly,
          isDriver: isDriver,
          vehicleType: isDriver ? vehicleType : null,
        };

        setStartPoint("");
        setDest("");
        setHour("");
        setMinute("");
        setTravelDate("");
        setIsDriver(false);
        fetchLoops(true);
        fetchUserMemberships(true);

        setCreatedLoopInfo(createdDetails);
        setShowReturnModal(true);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreatingLoop(false);
    }
  };

  return (
    <div className="space-y-2.5 pt-1 pb-4">
      {/* Starting Point & Destination with Swap */}
      <div className="relative space-y-2">
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Starting Point</label>
          <input
            value={startPoint}
            onChange={(e) => setStartPoint(e.target.value)}
            onBlur={() => setStartPoint(formatLocation(startPoint))}
            placeholder="Where from?"
            className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 pr-12 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
          />
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwapLocations}
          aria-label="Swap starting point and destination"
          className={`absolute right-3 top-[37px] z-10 w-7 h-7 rounded-full border ${border} ${cardBg} flex items-center justify-center text-[#FFC554] hover:border-[#FFC554] active:scale-90 shadow-md transition-all`}
        >
          <ArrowUpDown size={13} strokeWidth={2.5} />
        </button>

        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Destination</label>
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            onBlur={() => setDest(formatLocation(dest))}
            placeholder="Where to?"
            className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 pr-12 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
          />
        </div>
      </div>

      {/* Date of Travel */}
      <div className="space-y-1">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Date of Travel</label>
        <div
          onClick={handleOpenDatePicker}
          className={`w-full h-11 ${cardBg} border ${
            travelDate ? `border-[#FFC554] ${isDark ? "text-white" : "text-zinc-900"}` : `${border} ${mutedText}`
          } rounded-[18px] px-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden shadow-sm`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar size={16} className={travelDate ? "text-[#FFC554]" : mutedText} />
            <span className={`text-xs font-bold ${travelDate ? (isDark ? "text-white" : "text-black") : mutedText}`}>
              {travelDate ? formatDDMMYYYY(travelDate) : "Pick a Date (DD/MM/YYYY)"}
            </span>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
            travelDate
              ? "bg-[#FFC554] text-black shadow-sm"
              : isDark ? "bg-white/10 text-zinc-400" : "bg-black/5 text-zinc-500"
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
      </div>

      {/* Time of Travel */}
      <div className="space-y-1">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1.5`}>
          <Clock size={11} className="text-[#FFC554]" /> Time of Travel
        </label>
        <div
          onClick={handleOpenTimePicker}
          className={`w-full h-11 ${cardBg} border ${
            hasTime ? `border-[#FFC554] ${isDark ? "text-white" : "text-zinc-900"}` : `${border} ${mutedText}`
          } rounded-[18px] px-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden shadow-sm`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock size={16} className={hasTime ? "text-[#FFC554]" : mutedText} />
            {hasTime ? (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                  {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40 uppercase tracking-wider">
                  {ampm}
                </span>
              </div>
            ) : (
              <span className={`text-xs font-bold ${mutedText}`}>
                Pick a Time (from clock)
              </span>
            )}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
            hasTime
              ? "bg-[#FFC554] text-black shadow-sm"
              : isDark ? "bg-white/10 text-zinc-400" : "bg-black/5 text-zinc-500"
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
                  e.currentTarget.showPicker();
                }
              } catch {}
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      {/* Offering a Ride Toggle Card with Compact Vehicle Pills */}
      <div className={`p-3.5 px-4 ${cardBg} border ${border} rounded-[22px] space-y-2.5 transition-all ${isDriver ? "border-[#FFC554]/50 shadow-sm" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${isDriver ? "bg-[#FFC554] text-black shadow-sm" : isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40"}`}>
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
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${isDriver ? "bg-[#FFC554]" : isDark ? "bg-zinc-800" : "bg-zinc-300"}`}
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
                      ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm font-black"
                      : `${bg} ${border} ${mutedText} font-bold`
                  }`}
                >
                  <v.Icon size={14} strokeWidth={2.2} className={isSelected ? "text-black" : "text-[#FFC554]"} />
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
            <span className="text-[10px] font-bold text-[#FFC554]">
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
                    ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
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
            <div className="w-7 h-7 rounded-lg bg-[#FFC554]/15 text-[#FFC554] flex items-center justify-center shrink-0">
              <Users size={14} />
            </div>
            <div>
              <p className={`text-[10px] uppercase font-black ${mutedText} tracking-wider`}>Capacity</p>
              <p className="text-xs font-black">1 Passenger Seat (Pillion)</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20 px-2.5 py-1 rounded-full">
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
                  className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${limit === n ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : `${border} ${cardBg} ${mutedText}`}`}
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
                  className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${limit === n ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : `${border} ${cardBg} ${mutedText}`}`}
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
        className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[20px] text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] disabled:opacity-50"
      >
        {isCreatingLoop ? "Creating..." : isDriver ? "Offer Ride" : "Create Loop"}
      </button>

      {/* Return Trip Modal */}
      <ReturnTripModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        primaryLoop={createdLoopInfo}
      />
    </div>
  );
}
