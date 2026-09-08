"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Loop } from "@/lib/types";
import { formatLocation } from "@/lib/locationFormatter";
import { X, Clock, MapPin, Edit3 } from "lucide-react";

interface EditLoopModalProps {
  isOpen: boolean;
  onClose: () => void;
  loop: Loop;
  currentMemberCount: number;
  onUpdated: (updatedLoop: Loop) => void;
}

export default function EditLoopModal({
  isOpen,
  onClose,
  loop,
  currentMemberCount,
  onUpdated,
}: EditLoopModalProps) {
  const { theme, profile, formatTime } = useLoop();
  const { isDark, bg, border, cardBg, mutedText } = theme;

  const [startPoint, setStartPoint] = useState(loop.start_point || "");
  const [dest, setDest] = useState(loop.destination || "");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [limit, setLimit] = useState(loop.participants_limit || 4);
  const [isFemaleOnly, setIsFemaleOnly] = useState(Boolean(loop.is_female_only));
  const [vehicleType, setVehicleType] = useState<"scooter" | "bike" | "car">(loop.vehicle_type || "bike");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize fields when loop or open state changes
  useEffect(() => {
    if (!isOpen || !loop) return;

    setStartPoint(loop.start_point || "");
    setDest(loop.destination || "");
    setLimit(loop.participants_limit || 4);
    setIsFemaleOnly(Boolean(loop.is_female_only));
    if (loop.vehicle_type) setVehicleType(loop.vehicle_type);

    if (loop.departure_time) {
      const d = new Date(loop.departure_time);
      let h = d.getHours();
      const ap: "AM" | "PM" = h >= 12 ? "PM" : "AM";
      h = h % 12;
      if (h === 0) h = 12;
      setHour(h.toString().padStart(2, "0"));
      setMinute(d.getMinutes().toString().padStart(2, "0"));
      setAmpm(ap);
    }
  }, [isOpen, loop]);

  if (!isOpen) return null;

  const minAllowedSeats = Math.max(loop.is_driver_offering ? 1 : 2, currentMemberCount || 1);

  const handleHourChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    if (!digits) { setHour(""); return; }
    const num = parseInt(digits);
    if (num > 12) setHour("12");
    else setHour(digits);
  };

  const handleMinuteChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    if (!digits) { setMinute(""); return; }
    const num = parseInt(digits);
    if (num > 59) setMinute("59");
    else setMinute(digits);
  };

  const handleSave = async () => {
    const formattedStart = formatLocation(startPoint);
    const formattedDest = formatLocation(dest);
    if (!formattedStart.trim()) return toast.error("Starting Point is required");
    if (!formattedDest.trim()) return toast.error("Destination is required");
    if (!hour.trim() || !minute.trim()) return toast.error("Starting Time is required");
    if (isSaving) return;

    setIsSaving(true);

    try {
      const departure = new Date();
      let h = parseInt(hour);
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      departure.setHours(h, parseInt(minute), 0, 0);

      // If selected time is earlier than current time today, assume next day
      if (departure < new Date()) {
        departure.setDate(departure.getDate() + 1);
      }

      const expiresAt = new Date(departure);
      expiresAt.setHours(expiresAt.getHours() + 5);

      const finalLimit = loop.is_driver_offering
        ? vehicleType === "car"
          ? limit
          : 1
        : limit;

      // Track changes for announcement
      const changes: string[] = [];
      if (startPoint.trim() !== (loop.start_point || "").trim()) {
        changes.push(`Pickup: ${startPoint.trim()}`);
      }
      if (dest.trim() !== loop.destination.trim()) {
        changes.push(`Destination: ${dest.trim()}`);
      }
      if (departure.toISOString() !== new Date(loop.departure_time).toISOString()) {
        changes.push(`Departure: ${formatTime(departure.toISOString())}`);
      }
      if (finalLimit !== loop.participants_limit) {
        changes.push(`Seats: ${finalLimit}`);
      }
      if (isFemaleOnly !== loop.is_female_only) {
        changes.push(isFemaleOnly ? "Mode: Female Only" : "Mode: Open to Everyone");
      }
      if (loop.is_driver_offering && vehicleType !== loop.vehicle_type) {
        changes.push(`Vehicle: ${vehicleType}`);
      }

      const { data: updated, error } = await supabase
        .from("loops")
        .update({
          start_point: startPoint.trim(),
          destination: dest.trim(),
          departure_time: departure.toISOString(),
          participants_limit: finalLimit,
          is_female_only: isFemaleOnly,
          vehicle_type: loop.is_driver_offering ? vehicleType : null,
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", loop.id)
        .select("*, loop_members(count), creator:profiles!fk_loops_creator_id(display_name, avatar_url, reg_no)")
        .single();

      if (error || !updated) {
        console.error("Error updating loop:", error);
        toast.error("Failed to update loop details.");
        setIsSaving(false);
        return;
      }

      // Send chat announcement if there were any changes
      if (changes.length > 0) {
        try {
          await supabase.from("messages").insert({
            loop_id: loop.id,
            user_id: loop.creator_id,
            content: `📢 Ride updated by creator:\n• ${changes.join("\n• ")}`,
          });
        } catch (msgErr) {
          console.warn("Could not post update announcement to chat", msgErr);
        }
      }

      toast.success("Ride details updated!");
      onUpdated({
        ...updated,
        member_count: updated.loop_members?.[0]?.count || currentMemberCount,
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full max-w-sm max-h-[90vh] ${
          isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"
        } border ${border} rounded-[32px] p-5 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide space-y-4`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFC554]/15 border border-[#FFC554]/30 flex items-center justify-center text-[#FFC554]">
              <Edit3 size={15} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#FFC554]">
                Edit Ride Details
              </h2>
              <p className={`text-[10px] ${mutedText} font-medium`}>
                Update route, time, or capacity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close edit modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/10" : "bg-black/5"
            } flex items-center justify-center active:scale-90 transition-transform`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Route Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1`}>
              <MapPin size={11} className="text-[#FFC554]" /> Starting Point
            </label>
            <input
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              onBlur={() => setStartPoint(formatLocation(startPoint))}
              placeholder="e.g., Campus Gate 2, Hostel D..."
              className={`w-full h-11 ${bg} border ${border} rounded-[18px] px-4 text-xs font-bold outline-none focus:border-[#FFC554] placeholder:opacity-30 transition-colors`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1`}>
              <MapPin size={11} className="text-[#FFC554]" /> Destination
            </label>
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onBlur={() => setDest(formatLocation(dest))}
              placeholder="e.g., Airport, Vijayawada, PVP Mall..."
              className={`w-full h-11 ${bg} border ${border} rounded-[18px] px-4 text-xs font-bold outline-none focus:border-[#FFC554] placeholder:opacity-30 transition-colors`}
            />
          </div>
        </div>

        {/* Departure Time */}
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1`}>
            <Clock size={11} className="text-[#FFC554]" /> Departure Time
          </label>
          <div className="flex gap-2 items-center">
            <div className={`flex-1 flex items-center h-11 ${bg} border ${border} rounded-[18px] px-3 focus-within:border-[#FFC554] transition-colors`}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={hour}
                onChange={(e) => handleHourChange(e.target.value)}
                placeholder="HH"
                className="w-8 text-center text-sm font-black bg-transparent outline-none placeholder:opacity-30"
              />
              <span className={`font-black ${mutedText} mx-1`}>:</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={minute}
                onChange={(e) => handleMinuteChange(e.target.value)}
                placeholder="MM"
                className="w-8 text-center text-sm font-black bg-transparent outline-none placeholder:opacity-30"
              />
            </div>

            {/* AM/PM Switch */}
            <div className={`flex p-1 ${bg} border ${border} rounded-[18px] h-11`}>
              {(["AM", "PM"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAmpm(mode)}
                  className={`px-3 rounded-[14px] text-[11px] font-black transition-all ${
                    ampm === mode
                      ? "bg-[#FFC554] text-black shadow-sm"
                      : `${mutedText} hover:text-white`
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Student Driver Vehicle Selection (if offering ride) */}
        {loop.is_driver_offering && (
          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>
              Vehicle
            </label>
            <div className="flex gap-1.5">
              {[
                { type: "scooter", label: "Scooter", icon: "🛵" },
                { type: "bike", label: "Bike", icon: "🏍️" },
                { type: "car", label: "Car", icon: "🚗" },
              ].map((v) => (
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
                      ? "bg-[#FFC554] border-[#FFC554] text-black font-black shadow-sm"
                      : `${bg} ${border} ${mutedText} font-bold`
                  }`}
                >
                  <span>{v.icon}</span>
                  <span className="text-[10px] font-black uppercase">{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Available Seats / Limit */}
        {(!loop.is_driver_offering || vehicleType === "car") && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em]`}>
                Available Seats / Limit
              </label>
              {currentMemberCount > 1 && (
                <span className="text-[9px] text-[#FFC554] font-bold">
                  Min {minAllowedSeats} (Joined: {currentMemberCount})
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                {[2, 3, 4, 5, 6].map((n) => {
                  const isDisabled = n < minAllowedSeats;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setLimit(n)}
                      className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${
                        limit === n
                          ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                          : isDisabled
                          ? "opacity-25 cursor-not-allowed border-white/5"
                          : `${border} ${bg} ${mutedText}`
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              {!loop.is_driver_offering && (
                <div className="flex gap-1.5">
                  {[7, 8, 9, 10].map((n) => {
                    const isDisabled = n < minAllowedSeats;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setLimit(n)}
                        className={`flex-1 h-9 rounded-xl border font-black text-xs active:scale-95 transition-all ${
                          limit === n
                            ? "bg-[#FFC554] border-[#FFC554] text-black shadow-sm"
                            : isDisabled
                            ? "opacity-25 cursor-not-allowed border-white/5"
                            : `${border} ${bg} ${mutedText}`
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Female Only Preference (Only if creator is female) */}
        {profile.gender === "female" && (
          <div className={`p-3 ${bg} border ${border} rounded-[20px] flex items-center justify-between`}>
            <div>
              <h4 className="font-bold text-xs">Female Only Ride</h4>
              <p className={`text-[10px] ${mutedText}`}>
                Restricts ride to female members
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFemaleOnly(!isFemaleOnly)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                isFemaleOnly ? "bg-pink-500" : "bg-white/20"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  isFemaleOnly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-[#FFC554] hover:bg-[#FFC554]/90 text-black font-black rounded-[22px] text-xs uppercase tracking-[0.18em] shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
