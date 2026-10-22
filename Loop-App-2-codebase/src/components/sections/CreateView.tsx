"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Repeat } from "lucide-react";
import { getLocalTodayStr, buildDepartureDate } from "@/lib/dateFormatter";
import { triggerHaptic } from "@/lib/haptics";
import { formatLocation } from "@/lib/locationFormatter";
import ReturnTripModal, { PrimaryLoopDetails } from "./ReturnTripModal";
import RouteSelectorCard from "@/components/create/RouteSelectorCard";
import ScheduleSelectorCard from "@/components/create/ScheduleSelectorCard";
import VehiclePreferencesCard from "@/components/create/VehiclePreferencesCard";
import type { Loop } from "@/lib/types";

export default function CreateView() {
  const {
    session,
    profile,
    setView,
    fetchLoops,
    fetchUserMemberships,
    registerCreatedLoop,
    setShowGenderSelect,
    setPendingAction,
    theme,
    isProfileLoaded,
    createPrefill,
    setCreatePrefill,
  } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

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
  const [limit, setLimit] = useState(4);
  const [isFemaleOnly, setIsFemaleOnly] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [vehicleType, setVehicleType] = useState<"scooter" | "bike" | "car">("bike");
  const [isCreatingLoop, setIsCreatingLoop] = useState(false);

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
      if (createPrefill.travelDate) setTravelDate(createPrefill.travelDate);
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

  // Strictly require completed profile to access or submit in CreateView (only after profile is loaded)
  useEffect(() => {
    if (!isProfileLoaded) return;
    const isProfileComplete = Boolean(
      profile.gender && profile.display_name?.trim() && profile.reg_no?.trim()
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
      profile.gender && profile.display_name?.trim() && profile.reg_no?.trim()
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
        logger.error("Create loop error:", error);
        toast.error("Failed to create loop. Please try again.");
      } else if (data) {
        await supabase.from("loop_members").insert({ loop_id: data.id, user_id: session.user.id });

        // Immediately persist newly created loop into activeLoops, userLoops, userJoinedLoops & localStorage
        // so turning off internet right after creation still preserves the ride on the Home screen and SOS lease
        registerCreatedLoop?.({
          ...data,
          creator_id: data.creator_id || session.user.id,
          member_count: 1,
          creator: {
            display_name: profile.display_name || "You",
            avatar_url: profile.avatar_url,
            reg_no: profile.reg_no,
          },
        } as Loop);

        if (isReturnTrip) {
          toast.success("Return ride created successfully");
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
      <RouteSelectorCard
        startPoint={startPoint}
        setStartPoint={setStartPoint}
        dest={dest}
        setDest={setDest}
        onSwap={handleSwapLocations}
        cardBg={cardBg}
        border={border}
        isDark={isDark}
      />

      {/* Schedule Card (Date & Time Side-by-Side) */}
      <ScheduleSelectorCard
        travelDate={travelDate}
        setTravelDate={setTravelDate}
        todayStr={todayStr}
        formatJourneyDate={formatJourneyDate}
        hasTime={hasTime}
        hour={hour}
        minute={minute}
        ampm={ampm}
        rawTime24={rawTime24}
        onTimeChange={handleTimeChange}
        cardBg={cardBg}
        border={border}
        isDark={isDark}
      />

      {/* Offering a Ride Toggle Card, Vehicle Pills, Capacity & Female Only */}
      <VehiclePreferencesCard
        isDriver={isDriver}
        setIsDriver={setIsDriver}
        vehicleType={vehicleType}
        setVehicleType={setVehicleType}
        limit={limit}
        setLimit={setLimit}
        isFemaleOnly={isFemaleOnly}
        onToggleFemaleOnly={handleToggleFemaleOnly}
        cardBg={cardBg}
        border={border}
        mutedText={mutedText}
        isDark={isDark}
      />

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
