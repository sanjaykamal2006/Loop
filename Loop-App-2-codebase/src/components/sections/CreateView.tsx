"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Users } from "lucide-react";
import { SteeringWheelIcon } from "@/components/ui/VehicleIcons";

export default function CreateView() {
  const { session, profile, setView, fetchLoops, fetchUserMemberships, setShowGenderSelect, setPendingAction, pendingAction, showGenderSelect, theme } = useLoop();
  const { isDark, bg, border, cardBg, mutedText } = theme;

  const [startPoint, setStartPoint] = useState("");
  const [dest, setDest] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
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

  // Strictly require completed profile to access or submit in CreateView
  useEffect(() => {
    const isProfileComplete = Boolean(
      profile.gender && 
      profile.display_name?.trim() && 
      profile.reg_no?.trim()
    );
    if (!isProfileComplete) {
      setPendingAction({ type: "create" });
      setShowGenderSelect(true);
    }
  }, [profile.gender, profile.display_name, profile.reg_no, setPendingAction, setShowGenderSelect]);

  const createLoop = async () => {
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
    if (!startPoint.trim()) return toast.error("Starting Point is required");
    if (!dest.trim()) return toast.error("Destination is required");
    if (!hour.trim() || !minute.trim()) return toast.error("Starting Time is required");
    if (isCreatingLoop) return;

    setIsCreatingLoop(true);
    const departure = new Date();
    let h = parseInt(hour);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    departure.setHours(h, parseInt(minute), 0, 0);
    
    // If selected time is in the past for today, it must be for tomorrow
    if (departure < new Date()) {
      departure.setDate(departure.getDate() + 1);
    }
    
    const expiresAt = new Date(departure);
    expiresAt.setHours(expiresAt.getHours() + 5);

    const finalLimit = isDriver ? (vehicleType === "car" ? limit : 1) : limit;

    try {
      const { data, error } = await supabase
        .from("loops")
        .insert({
          creator_id: session.user.id,
          start_point: startPoint.trim(),
          destination: dest.trim(),
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
        setStartPoint("");
        setDest("");
        setHour("");
        setMinute("");
        setIsDriver(false);
        setView("home");
        fetchLoops();
        fetchUserMemberships();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreatingLoop(false);
    }
  };

  return (
    <div className="space-y-2.5 pt-1 pb-4">
      {/* Starting Point */}
      <div className="space-y-1">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Starting Point</label>
        <input
          value={startPoint}
          onChange={(e) => setStartPoint(e.target.value)}
          placeholder="Where from?"
          className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
        />
      </div>

      {/* Destination */}
      <div className="space-y-1">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Destination</label>
        <input
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          placeholder="Where to?"
          className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
        />
      </div>

      {/* Starting Time */}
      <div className="space-y-1">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Starting Time</label>
        <div className={`${cardBg} border ${border} rounded-[20px] p-2.5 px-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hour}
              onChange={(e) => handleHourChange(e.target.value)}
              onBlur={padTime}
              placeholder="HH"
              className={`w-9 h-9 ${bg} border ${border} rounded-xl text-center font-black text-sm outline-none focus:border-[#FFC554] placeholder:text-gray-500 placeholder:font-bold`}
            />
            <span className="font-black text-[#FFC554] text-base">:</span>
            <input
              type="text"
              value={minute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={padTime}
              placeholder="MM"
              className={`w-9 h-9 ${bg} border ${border} rounded-xl text-center font-black text-sm outline-none focus:border-[#FFC554] placeholder:text-gray-500 placeholder:font-bold`}
            />
          </div>
          <div className={`flex ${bg} p-0.5 rounded-xl border ${border}`}>
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmpm(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${ampm === p ? "bg-[#FFC554] text-black shadow-sm" : mutedText}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* I'm Driving Toggle Card with Compact Vehicle Pills */}
      <div className={`p-3 px-3.5 ${cardBg} border ${border} rounded-[20px] space-y-2 transition-all ${isDriver ? "border-[#FFC554]/40 shadow-sm" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDriver ? "bg-[#FFC554] text-black shadow-sm" : "bg-white/5 text-white/40"}`}>
              <SteeringWheelIcon size={16} />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight uppercase">I'm Driving</span>
              <p className={`text-[9px] font-bold ${mutedText}`}>Offering ride with my vehicle</p>
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
              { type: "scooter", label: "Scooter (1)", icon: "🛵" },
              { type: "bike", label: "Bike (1)", icon: "🏍️" },
              { type: "car", label: "Car (1-4)", icon: "🚗" }
            ].map(v => (
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
                className={`flex-1 h-8 rounded-xl border flex items-center justify-center gap-1 active:scale-95 transition-all text-xs ${
                  vehicleType === v.type
                    ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm font-black"
                    : `${bg} ${border} ${mutedText} font-bold hover:text-white`
                }`}
              >
                <span className="text-sm leading-none">{v.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{v.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Available Seats: Only show selector if Car or normal ride */}
      {isDriver && vehicleType === "car" ? (
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Available Seats</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${limit === n ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm" : `${border} ${cardBg} ${mutedText}`}`}
              >
                {n} {n === 1 ? "seat" : "seats"}
              </button>
            ))}
          </div>
        </div>
      ) : !isDriver ? (
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Available Seats</label>
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
      <div className={`flex items-center justify-between p-3 px-3.5 ${cardBg} border ${border} rounded-[20px] ${isFemaleOnly ? "border-pink-500/50" : ""}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isFemaleOnly ? "bg-pink-500 text-white" : "bg-white/5 text-white/40"}`}>
            <Users size={16} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight uppercase">Female Only</span>
            <p className={`text-[9px] font-bold ${mutedText}`}>Visible to women only</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsFemaleOnly(!isFemaleOnly)}
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
    </div>
  );
}
