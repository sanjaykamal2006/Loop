"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "sonner";

import { Users } from "lucide-react";

export default function CreateView() {
  const { session, profile, setView, fetchLoops, fetchUserMemberships, setShowGenderSelect, setPendingAction, pendingAction, showGenderSelect, theme } = useLoop();
  const { isDark, bg, border, cardBg, mutedText } = theme;

  const [dest, setDest] = useState("");
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("45");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [limit, setLimit] = useState(8);
  const [category, setCategory] = useState("Other");
  const [isFemaleOnly, setIsFemaleOnly] = useState(false);
  const [isCreatingLoop, setIsCreatingLoop] = useState(false);

  // Resume creation after gender is set
  useEffect(() => {
    if (pendingAction?.type === "create" && profile.gender && !showGenderSelect) {
      createLoop();
    }
  }, [profile.gender, showGenderSelect]);

  const createLoop = async () => {
    if (!profile.gender) {
      setPendingAction({ type: "create" });
      setShowGenderSelect(true);
      return;
    }
    if (!dest) return toast.error("Destination is required");
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
    expiresAt.setHours(expiresAt.getHours() + 2);

    try {
      const { data, error } = await supabase
        .from("loops")
        .insert({
          creator_id: session.user.id,
          destination: dest,
          departure_time: departure.toISOString(),
          participants_limit: limit,
          is_female_only: isFemaleOnly,
          category: category,
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
      } else {
        await supabase.from("loop_members").insert({ loop_id: data.id, user_id: session.user.id });
        toast.success("Loop created!");
        setDest("");
        setView("home");
        fetchLoops();
        fetchUserMemberships();
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsCreatingLoop(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
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
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Departure Time</label>
        <div className={`${cardBg} border ${border} rounded-[24px] p-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hour}
              onChange={(e) => setHour(e.target.value.slice(0, 2))}
              className={`w-10 h-10 ${bg} border ${border} rounded-xl text-center font-black text-base outline-none focus:border-[#FFC554]`}
            />
            <span className="font-black text-[#FFC554] text-lg">:</span>
            <input
              type="text"
              value={minute}
              onChange={(e) => setMinute(e.target.value.slice(0, 2))}
              className={`w-10 h-10 ${bg} border ${border} rounded-xl text-center font-black text-base outline-none focus:border-[#FFC554]`}
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

      <div className="space-y-1.5">
        <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Category</label>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
          {["Other", "Food", "Airport", "Study", "Event", "Ride"].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 shrink-0 rounded-[14px] text-xs font-black uppercase tracking-widest active:scale-95 transition-colors duration-1000 ${
                category === c ? "bg-[#FFC554] text-black shadow-md" : `${cardBg} border ${border} ${mutedText}`
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex items-center justify-between p-4 ${cardBg} border ${border} rounded-[28px] ${isFemaleOnly ? "border-pink-500/50" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isFemaleOnly ? "bg-pink-500 text-white" : "bg-white/5 text-white/40"}`}>
            <Users size={22} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight uppercase">Female Only</span>
            <p className={`text-[10px] font-bold ${mutedText}`}>Visible to women only</p>
          </div>
        </div>
        <button
          onClick={() => setIsFemaleOnly(!isFemaleOnly)}
          className={`w-12 h-7 rounded-full relative transition-all duration-300 ${isFemaleOnly ? "bg-pink-500" : isDark ? "bg-zinc-800" : "bg-zinc-200"}`}
        >
          <div className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all duration-300 ${isFemaleOnly ? "left-[23px]" : "left-[3px]"}`} />
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
