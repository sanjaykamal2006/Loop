"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Loop } from "@/lib/types";
import { formatLocation } from "@/lib/locationFormatter";
import { X, MapPin, Edit3 } from "lucide-react";
import { getLocalTodayStr, buildDepartureDate, formatDepartureFull } from "@/lib/dateFormatter";
import { LoopDateTimePicker } from "@/components/loop/LoopDateTimePicker";
import { LoopCapacityPicker } from "@/components/loop/LoopCapacityPicker";

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
  const { theme, profile } = useLoop();
  const { isDark, bg, border, mutedText } = theme;

  const [startPoint, setStartPoint] = useState(loop.start_point || "");
  const [dest, setDest] = useState(loop.destination || "");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const todayStr = getLocalTodayStr();
  const [travelDate, setTravelDate] = useState("");
  const [limit, setLimit] = useState(loop.participants_limit || 4);
  const [isFemaleOnly, setIsFemaleOnly] = useState(Boolean(loop.is_female_only));
  const [vehicleType, setVehicleType] = useState<"scooter" | "bike" | "car">(loop.vehicle_type || "bike");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize fields when loop or open state changes
  useEffect(() => {
    if (!isOpen || !loop) return;

    setStartPoint(loop.start_point || "");
    setDest(loop.destination || "");
    const initialLimit = loop.is_driver_offering
      ? (loop.vehicle_type === "car" ? Math.max(1, (loop.participants_limit || 4) - 1) : 1)
      : (loop.participants_limit || 4);
    setLimit(initialLimit);
    setIsFemaleOnly(Boolean(loop.is_female_only));
    if (loop.vehicle_type) setVehicleType(loop.vehicle_type);

    if (loop.departure_time) {
      const d = new Date(loop.departure_time);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setTravelDate(`${year}-${month}-${day}`);

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

  const minAllowedSeats = Math.max(2, currentMemberCount || 1);
  const minPassengerSeats = Math.max(1, (currentMemberCount || 1) - 1);

  const handleSave = async () => {
    const formattedStart = formatLocation(startPoint);
    const formattedDest = formatLocation(dest);
    if (!formattedStart.trim()) return toast.error("Starting Point is required");
    if (!formattedDest.trim()) return toast.error("Destination is required");
    if (formattedStart.toLowerCase() === formattedDest.toLowerCase()) {
      return toast.error("Pickup and Destination cannot be the same!");
    }
    if (!hour.trim() || !minute.trim()) return toast.error("Time of Travel is required");
    if (isSaving) return;

    setIsSaving(true);

    try {
      const departure = buildDepartureDate(travelDate, hour, minute, ampm);

      if (travelDate === todayStr && departure.getTime() < Date.now() - 5 * 60 * 1000) {
        setIsSaving(false);
        return toast.error("Departure time has already passed for today.");
      }

      const expiresAt = new Date(departure);
      expiresAt.setHours(expiresAt.getHours() + 5);

      const finalLimit = loop.is_driver_offering
        ? vehicleType === "car"
          ? limit + 1
          : 2
        : limit;

      // Track changes for announcement
      const changes: string[] = [];
      if (formattedStart !== (loop.start_point || "").trim()) {
        changes.push(`Pickup: ${formattedStart}`);
      }
      if (formattedDest !== loop.destination.trim()) {
        changes.push(`Destination: ${formattedDest}`);
      }
      if (departure.toISOString() !== new Date(loop.departure_time).toISOString()) {
        changes.push(`Schedule: ${formatDepartureFull(departure.toISOString())}`);
      }
      if (finalLimit !== loop.participants_limit) {
        changes.push(loop.is_driver_offering ? `Passenger Seats: ${limit}` : `Seats: ${finalLimit}`);
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
          start_point: formattedStart,
          destination: formattedDest,
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
        logger.error("Error updating loop:", error);
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
            content: `[Update] Ride updated by host:\n• ${changes.join("\n• ")}`,
          });
        } catch (msgErr) {
          logger.warn("Could not post update announcement to chat:", msgErr);
        }
      }

      const updatedData = updated as unknown as {
        [key: string]: unknown;
        loop_members?: { count?: number }[];
      };
      const memberCount = updatedData.loop_members?.[0]?.count ?? currentMemberCount;
      onUpdated({
        ...(updated as unknown as Loop),
        member_count: memberCount,
      });
      onClose();
    } catch (err) {
      logger.error("Unexpected error in EditLoopModal:", err);
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
            type="button"
            onClick={onClose}
            aria-label="Close edit modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/10" : "bg-black/5"
            } flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
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

        {/* Date and Time Picker */}
        <LoopDateTimePicker
          travelDate={travelDate}
          setTravelDate={setTravelDate}
          todayStr={todayStr}
          hour={hour}
          setHour={setHour}
          minute={minute}
          setMinute={setMinute}
          ampm={ampm}
          setAmpm={setAmpm}
          theme={theme}
        />

        {/* Capacity / Vehicle Selection */}
        <LoopCapacityPicker
          isDriverOffering={loop.is_driver_offering}
          vehicleType={vehicleType}
          setVehicleType={setVehicleType}
          limit={limit}
          setLimit={setLimit}
          minPassengerSeats={minPassengerSeats}
          minAllowedSeats={minAllowedSeats}
          currentMemberCount={currentMemberCount}
          theme={theme}
        />

        {/* Female Only Preference (Only if creator is female) */}
        {profile.gender === "female" && (
          <div className={`p-3 ${bg} border ${border} rounded-[20px] flex items-center justify-between`}>
            <div>
              <h4 className="font-bold text-xs">Female Only Ride</h4>
              <p className={`text-[10px] ${mutedText}`}>
                Restricts ride to female members
              </p>
              {isFemaleOnly && (
                <p className="text-[9px] text-pink-400 font-medium leading-tight mt-1 animate-fade-in">
                  Based on self-reported gender at signup. Not independently verified.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsFemaleOnly(!isFemaleOnly)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
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

        {/* Actions - Equal size buttons */}
        <div className="pt-2 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={`w-full h-12 rounded-[22px] border ${
              isDark
                ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                : "bg-black/5 border-black/10 hover:bg-black/10 text-zinc-900"
            } font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full h-12 ${
              isDark 
                ? "bg-[#FFC554] hover:bg-[#FFC554]/90 text-black shadow-[#FFC554]/20" 
                : "bg-[#881337] hover:bg-[#700f2b] text-white shadow-[#881337]/20"
            } font-black rounded-[22px] text-xs uppercase tracking-[0.18em] shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer`}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
