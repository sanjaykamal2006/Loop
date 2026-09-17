"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { Repeat, ArrowRight, Calendar, Clock, X } from "lucide-react";
import {
  getLocalTodayStr,
  formatDDMMYYYY,
  buildDepartureDate,
} from "@/lib/dateFormatter";
import { triggerHaptic } from "@/lib/haptics";

export interface PrimaryLoopDetails {
  id?: string;
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
  const [returnHour, setReturnHour] = useState("06");
  const [returnMinute, setReturnMinute] = useState("00");
  const [returnAmpm, setReturnAmpm] = useState<"AM" | "PM">("PM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Initialize return date and an intelligent default time (e.g. 4 hours after outbound)
  useEffect(() => {
    if (primaryLoop?.travelDate) {
      setReturnDate(primaryLoop.travelDate);

      // Compute sensible default return time: 4 hours after outbound
      let outboundH = parseInt(primaryLoop.hour, 10) || 9;
      if (primaryLoop.ampm === "PM" && outboundH < 12) outboundH += 12;
      if (primaryLoop.ampm === "AM" && outboundH === 12) outboundH = 0;

      const returnH24 = (outboundH + 4) % 24;
      const isPM = returnH24 >= 12;
      const h12 = returnH24 % 12 || 12;

      setReturnHour(String(h12).padStart(2, "0"));
      setReturnMinute(primaryLoop.minute ? primaryLoop.minute.padStart(2, "0") : "00");
      setReturnAmpm(isPM ? "PM" : "AM");
    }
  }, [primaryLoop]);

  if (!isOpen || !primaryLoop) return null;

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
      return toast.error("Return time cannot be earlier than departure");
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
          purpose: "return",
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

        // Post announcement in outbound loop's chat from the author
        if (primaryLoop.id) {
          try {
            await supabase.from("messages").insert({
              loop_id: primaryLoop.id,
              user_id: session.user.id,
              content: `Return trip available! Check it out 🔄 [return_loop:${data.id}]`,
            });
          } catch (chatErr) {
            console.error("Failed to post return ride notification in outbound chat:", chatErr);
          }
        }

        toast.success("Return ride created! 🔄");
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
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full max-w-sm ${
          isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"
        } border ${border} rounded-[28px] p-5 space-y-4 shadow-2xl relative`}
      >
        {/* Close Button */}
        <button
          onClick={handleSkip}
          aria-label="Close"
          className={`absolute top-4 right-4 w-7 h-7 rounded-full border ${border} ${cardBg} flex items-center justify-center ${mutedText} hover:opacity-100 active:scale-90 transition-transform`}
        >
          <X size={14} />
        </button>

        {/* Natural Header */}
        <div className="flex items-center gap-3 pt-1">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDark
                ? "bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/30"
                : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
            }`}
          >
            <Repeat size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">Heading back?</h2>
            <p className={`text-[11px] font-bold ${mutedText}`}>Set up your return ride in one tap</p>
          </div>
        </div>

        {/* Reversed Route Strip */}
        <div className={`px-3.5 py-2.5 rounded-[18px] ${cardBg} border ${border} flex items-center justify-between gap-3`}>
          <div className="flex-1 min-w-0">
            <p className={`text-[9px] uppercase font-black ${mutedText} tracking-wider`}>From</p>
            <p className="text-xs font-black truncate">{primaryLoop.destination}</p>
          </div>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
            }`}
          >
            <ArrowRight size={13} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className={`text-[9px] uppercase font-black ${mutedText} tracking-wider`}>To</p>
            <p className="text-xs font-black truncate">{primaryLoop.startPoint}</p>
          </div>
        </div>

        {/* Return Date & Time Pickers */}
        <div className="space-y-2">
          {/* Return Date */}
          <div
            onClick={handleOpenDatePicker}
            className={`relative w-full h-11 ${cardBg} border ${border} rounded-[16px] px-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={15} className={isDark ? "text-[#FFC554]" : "text-[#881337]"} />
              <span className="text-xs font-bold">
                {returnDate ? formatDDMMYYYY(returnDate) : "Pick Return Date"}
              </span>
            </div>
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isDark ? "bg-white/10 text-zinc-300" : "bg-black/5 text-zinc-600"
              }`}
            >
              Change
            </span>
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

          {/* Return Time */}
          <div
            onClick={handleOpenTimePicker}
            className={`relative w-full h-11 ${cardBg} border ${border} rounded-[16px] px-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all`}
          >
            <div className="flex items-center gap-2.5">
              <Clock size={15} className={isDark ? "text-[#FFC554]" : "text-[#881337]"} />
              <span className="text-xs font-bold">
                {returnHour ? `${returnHour}:${returnMinute}` : "Pick Return Time"}
              </span>
              {returnHour && (
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    isDark
                      ? "bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/40"
                      : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
                  }`}
                >
                  {returnAmpm}
                </span>
              )}
            </div>
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isDark ? "bg-white/10 text-zinc-300" : "bg-black/5 text-zinc-600"
              }`}
            >
              Change
            </span>
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

        {/* Actions */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCreateReturnLoop}
            disabled={isSubmitting}
            className={`w-full h-11 ${
              isDark
                ? "bg-[#FFC554] hover:bg-[#FFC554]/90 text-black"
                : "bg-[#881337] hover:bg-[#700f2b] text-white"
            } font-black rounded-[18px] text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
          >
            <Repeat size={14} strokeWidth={2.4} />
            {isSubmitting ? "Creating..." : "Plan Return Ride"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className={`w-full py-2 text-xs font-bold uppercase tracking-wider ${mutedText} hover:opacity-100 active:scale-[0.98] transition-all text-center`}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
