"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { Repeat, ArrowRight, Calendar, Clock, X, Check } from "lucide-react";
import {
  getLocalTodayStr,
  formatDDMMYYYY,
  buildDepartureDate,
} from "@/lib/dateFormatter";

export interface PrimaryLoopDetails {
  startPoint: string;
  destination: string;
  travelDate: string;
  hour: string;
  minute: string;
  ampm: "AM" | "PM";
  limit: number;
  isFemaleOnly: boolean;
  isDriver: boolean;
  vehicleType: "car" | "bike" | "scooter" | null;
}

interface ReturnTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryLoop: PrimaryLoopDetails | null;
}

export default function ReturnTripModal({
  isOpen,
  onClose,
  primaryLoop,
}: ReturnTripModalProps) {
  const { session, theme, setView, fetchLoops, fetchUserMemberships } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const [returnDate, setReturnDate] = useState("");
  const [returnHour, setReturnHour] = useState("");
  const [returnMinute, setReturnMinute] = useState("");
  const [returnAmpm, setReturnAmpm] = useState<"AM" | "PM">("PM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Initialize return date to primary travel date (or tomorrow if not provided)
  useEffect(() => {
    if (primaryLoop?.travelDate) {
      setReturnDate(primaryLoop.travelDate);
      setReturnHour("06");
      setReturnMinute("00");
      setReturnAmpm("PM");
    }
  }, [primaryLoop]);

  if (!isOpen || !primaryLoop) return null;

  const triggerHaptic = (ms = 10) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  const handleOpenDatePicker = () => {
    triggerHaptic(8);
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

  const handleNativeTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [hStr, mStr] = val.split(":");
    let hNum = parseInt(hStr, 10);
    const mNum = parseInt(mStr, 10);

    const isPM = hNum >= 12;
    if (hNum === 0) hNum = 12;
    else if (hNum > 12) hNum -= 12;

    setReturnHour(String(hNum).padStart(2, "0"));
    setReturnMinute(String(mNum).padStart(2, "0"));
    setReturnAmpm(isPM ? "PM" : "AM");
  };

  const getNativeTimeValue = (): string => {
    if (!returnHour || !returnMinute) return "";
    let h = parseInt(returnHour, 10);
    if (returnAmpm === "PM" && h < 12) h += 12;
    if (returnAmpm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${returnMinute.padStart(2, "0")}`;
  };

  const handleCreateReturnLoop = async () => {
    triggerHaptic(12);

    if (!returnDate) {
      return toast.error("Please pick a return date");
    }
    if (!returnHour || !returnMinute) {
      return toast.error("Please pick a return time");
    }

    const returnDeparture = buildDepartureDate(returnDate, returnHour, returnMinute, returnAmpm);
    const outboundDeparture = buildDepartureDate(
      primaryLoop.travelDate,
      primaryLoop.hour,
      primaryLoop.minute,
      primaryLoop.ampm
    );

    // Validate return is not earlier than outbound departure
    if (returnDeparture.getTime() < outboundDeparture.getTime()) {
      return toast.error("Return time cannot be earlier than outbound departure");
    }

    // Validate return departure is not in the past
    if (returnDeparture.getTime() < Date.now() - 5 * 60 * 1000) {
      return toast.error("Return departure time has already passed");
    }

    setIsSubmitting(true);

    const returnExpiresAt = new Date(returnDeparture);
    returnExpiresAt.setHours(returnExpiresAt.getHours() + 5);

    try {
      const { data, error } = await supabase
        .from("loops")
        .insert({
          creator_id: session.user.id,
          start_point: primaryLoop.destination,
          destination: primaryLoop.startPoint,
          departure_time: returnDeparture.toISOString(),
          participants_limit: primaryLoop.limit,
          is_female_only: primaryLoop.isFemaleOnly,
          is_driver_offering: primaryLoop.isDriver,
          vehicle_type: primaryLoop.vehicleType,
          expires_at: returnExpiresAt.toISOString(),
          status: "open",
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create return loop:", error);
        toast.error("Failed to create return loop. Please try again.");
      } else if (data) {
        await supabase.from("loop_members").insert({
          loop_id: data.id,
          user_id: session.user.id,
        });

        toast.success("Return loop created successfully! 🔄");
        fetchLoops(true);
        fetchUserMemberships(true);
        onClose();
        setView("home");
      }
    } catch (err) {
      console.error("Return loop error:", err);
      toast.error("Something went wrong creating the return loop");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    triggerHaptic(8);
    onClose();
    setView("home");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full max-w-sm max-h-[90vh] ${
          isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"
        } border ${border} rounded-[32px] p-5 space-y-3.5 shadow-2xl relative overflow-y-auto scrollbar-hide`}
      >
        {/* Close Button */}
        <button
          onClick={handleSkip}
          aria-label="Close"
          className={`absolute top-4 right-4 w-8 h-8 rounded-full border ${border} ${cardBg} flex items-center justify-center ${mutedText} active:scale-90 transition-transform`}
        >
          <X size={15} />
        </button>

        {/* Header Badge & Title */}
        <div className="text-center space-y-1 pt-1">
          <div className="w-11 h-11 bg-[#FFC554]/10 rounded-[18px] flex items-center justify-center text-[#FFC554] mx-auto border border-[#FFC554]/25 shadow-md">
            <Repeat size={20} strokeWidth={2.5} />
          </div>
          <h2 className="text-base font-black tracking-tight uppercase">Plan Return Trip?</h2>
          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-[0.15em]`}>
            Need a ride back? Create matching return loop in 1 tap
          </p>
        </div>

        {/* Route Visualizer Card */}
        <div className={`p-3 rounded-[20px] ${cardBg} border ${border} space-y-2`}>
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-500">
              <Check size={12} strokeWidth={3} /> Outbound (Created)
            </span>
            <span className={mutedText}>{primaryLoop.travelDate}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-black truncate">
            <span className="truncate">{primaryLoop.startPoint}</span>
            <ArrowRight size={13} className="text-[#FFC554] shrink-0" />
            <span className="truncate text-[#FFC554]">{primaryLoop.destination}</span>
          </div>

          <div className="border-t border-dashed border-white/10 pt-2 flex items-center justify-between text-[10px] font-bold">
            <span className="flex items-center gap-1 text-[#FFC554]">
              <Repeat size={11} strokeWidth={2.5} /> Return Route
            </span>
            <span className="text-xs font-black truncate text-white">
              {primaryLoop.destination} ➔ {primaryLoop.startPoint}
            </span>
          </div>
        </div>

        {/* Return Date Selector */}
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1`}>
            <Calendar size={11} className="text-[#FFC554]" /> Date of Return
          </label>
          <div
            onClick={handleOpenDatePicker}
            className={`w-full h-11 ${cardBg} border ${
              returnDate ? `border-[#FFC554] ${isDark ? "text-white" : "text-zinc-900"}` : `${border} ${mutedText}`
            } rounded-[18px] px-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm`}
          >
            <span className={`text-xs font-bold ${returnDate ? (isDark ? "text-white" : "text-black") : mutedText}`}>
              {returnDate ? formatDDMMYYYY(returnDate) : "Pick Return Date"}
            </span>
            <Calendar size={15} className="text-[#FFC554]" />
            <input
              ref={dateInputRef}
              type="date"
              min={primaryLoop.travelDate || getLocalTodayStr()}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Return Time Selector */}
        <div className="space-y-1">
          <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1 flex items-center gap-1`}>
            <Clock size={11} className="text-[#FFC554]" /> Time of Return
          </label>
          <div
            onClick={handleOpenTimePicker}
            className={`w-full h-11 ${cardBg} border ${
              returnHour ? "border-[#FFC554]" : border
            } rounded-[18px] px-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} className={returnHour ? "text-[#FFC554]" : mutedText} />
              <span className={`text-xs font-bold ${returnHour ? (isDark ? "text-white" : "text-black") : mutedText}`}>
                {returnHour ? `${returnHour}:${returnMinute}` : "Pick Return Time"}
              </span>
            </div>

            {returnHour ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40">
                {returnAmpm}
              </span>
            ) : null}

            <input
              ref={timeInputRef}
              type="time"
              value={getNativeTimeValue()}
              onChange={handleNativeTimeChange}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCreateReturnLoop}
            disabled={isSubmitting}
            className="w-full h-11 bg-[#FFC554] text-black font-black rounded-[20px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Repeat size={14} strokeWidth={2.5} />
            {isSubmitting ? "Creating..." : "Create Return Loop"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className={`w-full py-2.5 ${cardBg} border ${border} rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] ${mutedText} hover:text-white active:scale-[0.98] transition-all text-center`}
          >
            Skip to Home
          </button>
        </div>
      </div>
    </div>
  );
}
