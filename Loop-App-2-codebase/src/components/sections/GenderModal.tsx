"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users } from "lucide-react";

export default function GenderModal() {
  const { showGenderSelect, profile, updateProfile, theme } = useLoop();
  const { bg, border, cardBg, mutedText } = theme;

  if (!showGenderSelect) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
      <div className={`${cardBg} border ${border} rounded-[40px] p-8 w-full max-w-sm space-y-8 shadow-2xl`}>
        <div className="space-y-2 text-center">
          <div className="w-16 h-16 bg-[#FFC554]/10 rounded-[24px] flex items-center justify-center text-[#FFC554] mx-auto mb-4">
            <Users size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Select Gender</h2>
          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-[0.2em]`}>Required to continue</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {["male", "female"].map((g) => (
            <button
              key={g}
              onClick={() => updateProfile({ gender: g })}
              className={`w-full h-14 rounded-[24px] border-2 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.97] transition-all ${profile.gender === g ? "bg-[#FFC554] border-[#FFC554] text-black" : `${border} ${bg} ${mutedText}`}`}
            >
              <div className={`w-2 h-2 rounded-full ${g === "female" ? "bg-pink-500" : "bg-blue-500"}`} />
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
