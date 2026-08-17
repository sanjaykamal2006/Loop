"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";

import { Users } from "lucide-react";

export default function CreateView() {
  const { session, profile, setView, fetchLoops, fetchUserMemberships, setShowGenderSelect, setPendingAction, pendingAction, showGenderSelect, theme } = useLoop();
  const { isDark, bg, border, cardBg, mutedText } = theme;

  const [startPoint, setStartPoint] = useState("");
  const [dest, setDest] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [limit, setLimit] = useState(8);
  const [isFemaleOnly, setIsFemaleOnly] = useState(false);
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

  // Resume creation after profile is set
  useEffect(() => {
    if (pendingAction?.type === "create" && profile.gender && profile.display_name && profile.reg_no && !showGenderSelect) {
      setPendingAction(null);
      createLoop();
    }
  }, [profile.gender, profile.display_name, profile.reg_no, showGenderSelect, pendingAction, setPendingAction]);

  const createLoop = async () => {
    if (!profile.gender || !profile.display_name || !profile.reg_no) {
      setPendingAction({ type: "create" });
      setShowGenderSelect(true);
      return;
    }
    if (!startPoint) return toast.error("Starting Point is required");
    if (!dest) return toast.error("Destination is required");
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
    expiresAt.setHours(expiresAt.getHours() + 8);

    try {
      const { data, error } = await supabase
        .from("loops")
        .insert({
          creator_id: session.user.id,
          start_point: startPoint,
          destination: dest,
          departure_time: departure.toISOString(),
          participants_limit: limit,
          is_female_only: isFemaleOnly,
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
        toast.success("Loop created!");
        setStartPoint("");
        setDest("");
        setHour("");
        setMinute("");
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
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Starting Point</label>
        <input
          value={startPoint}
          onChange={(e) => setStartPoint(e.target.value)}
          placeholder="Where from?"
          className={`w-full h-12 ${cardBg} border ${border} rounded-[20px] px-5 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
        />
      </div>

      <div className="space-y-1.5">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Destination</label>
        <input
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          placeholder="Where to?"
          className={`w-full h-12 ${cardBg} border ${border} rounded-[20px] px-5 text-sm font-bold outline-none focus:border-[#FFC554] transition-colors`}
        />
      </div>

      <div className="space-y-1.5">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Starting Time</label>
        <div className={`${cardBg} border ${border} rounded-[24px] p-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hour}
              onChange={(e) => handleHourChange(e.target.value)}
              onBlur={padTime}
              placeholder="HH"
              className={`w-10 h-10 ${bg} border ${border} rounded-xl text-center font-black text-base outline-none focus:border-[#FFC554] placeholder:text-gray-500 placeholder:font-bold`}
            />
            <span className="font-black text-[#FFC554] text-lg">:</span>
            <input
              type="text"
              value={minute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={padTime}
              placeholder="MM"
              className={`w-10 h-10 ${bg} border ${border} rounded-xl text-center font-black text-base outline-none focus:border-[#FFC554] placeholder:text-gray-500 placeholder:font-bold`}
            />
          </div>
          <div className={`flex ${bg} p-1 rounded-xl border ${border}`}>
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setAmpm(p)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${ampm === p ? "bg-[#FFC554] text-black shadow-md" : mutedText}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Available Seats</label>
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`flex-1 h-10 rounded-xl border font-black text-sm active:scale-95 transition-all ${limit === n ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md" : `${border} ${cardBg} ${mutedText}`}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 px-4">
            {[7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`flex-1 h-10 rounded-xl border font-black text-sm active:scale-95 transition-all ${limit === n ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md" : `${border} ${cardBg} ${mutedText}`}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex items-center justify-between p-3.5 px-4 ${cardBg} border ${border} rounded-[24px] ${isFemaleOnly ? "border-pink-500/50" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFemaleOnly ? "bg-pink-500 text-white" : "bg-white/5 text-white/40"}`}>
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight uppercase">Female Only</span>
            <p className={`text-[10px] font-bold ${mutedText}`}>Visible to women only</p>
          </div>
        </div>
        <button
          onClick={() => setIsFemaleOnly(!isFemaleOnly)}
          className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${isFemaleOnly ? "bg-pink-500" : isDark ? "bg-zinc-800" : "bg-zinc-300"}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isFemaleOnly ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>

      <button
        onClick={createLoop}
        disabled={isCreatingLoop}
        className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98]  disabled:opacity-50"
      >
        {isCreatingLoop ? "Creating..." : "Create Loop"}
      </button>
    </div>
  );
}
