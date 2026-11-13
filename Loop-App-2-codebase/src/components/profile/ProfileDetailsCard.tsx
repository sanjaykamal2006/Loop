"use client";

import React from "react";
import type { Profile } from "@/lib/types";

interface ProfileDetailsCardProps {
  profile: Profile;
  onAddPhone: () => void;
  onSelectGender: (gender: "male" | "female") => void;
  cardBg: string;
  border: string;
  mutedText: string;
  isDark: boolean;
  isPaper?: boolean;
}

export default function ProfileDetailsCard({
  profile,
  onAddPhone,
  onSelectGender,
  cardBg,
  border,
  mutedText,
  isDark,
  isPaper = false,
}: ProfileDetailsCardProps) {
  return (
    <div
      className={`${cardBg} ${
        isPaper
          ? "border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
          : `border ${border} shadow-sm`
      } rounded-[24px] px-4.5 divide-y ${
        isPaper
          ? "divide-[#2A2420]/15"
          : isDark
          ? "divide-white/[0.06]"
          : "divide-black/[0.06]"
      }`}
    >
      {/* Phone / WhatsApp */}
      <div className="flex items-center justify-between py-4 min-h-[56px]">
        <span className={`text-[13px] font-semibold ${mutedText}`}>WhatsApp / Phone</span>
        {profile.phone_number ? (
          <span
            className={`text-[13px] sm:text-sm font-mono font-bold tracking-tight ${
              isPaper ? "text-[#2C4F9E]" : isDark ? "text-emerald-400" : "text-emerald-700"
            }`}
          >
            +91 {profile.phone_number}
          </span>
        ) : (
          <button
            onClick={onAddPhone}
            className={`text-xs sm:text-[13px] font-bold hover:underline ${
              isPaper ? "text-[#2A2420] font-black" : isDark ? "text-[#FFC554]" : "text-[#881337]"
            }`}
          >
            + Add WhatsApp
          </button>
        )}
      </div>

      {/* Bio */}
      <div className="flex items-center justify-between gap-3 py-4 min-h-[56px]">
        <span className={`text-[13px] font-semibold ${mutedText} shrink-0`}>Bio</span>
        <span
          className={`text-[13px] sm:text-sm text-right max-w-[220px] truncate ${
            profile.bio?.trim()
              ? isPaper
                ? "text-[#2A2420]"
                : isDark
                ? "text-zinc-200"
                : "text-zinc-800"
              : `${mutedText} italic`
          }`}
        >
          {profile.bio?.trim() ? profile.bio : "No bio added yet"}
        </span>
      </div>

      {/* Gender Selection */}
      <div className="flex items-center justify-between py-3.5 min-h-[56px]">
        <span className={`text-[13px] font-semibold ${mutedText}`}>Gender</span>

        <div
          className={`flex items-center p-0.5 rounded-full ${
            isPaper
              ? "bg-[#EFE8D8] border border-[#2A2420]"
              : isDark
              ? "bg-white/5 border border-white/10"
              : "bg-black/5 border border-black/10"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectGender("male")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              profile.gender === "male"
                ? isPaper
                  ? "bg-[#FFC554] text-[#2A2420] font-black border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                  : isDark
                  ? "bg-[#FFC554] text-black font-black shadow-xs"
                  : "bg-[#881337] text-white font-black shadow-xs"
                : isPaper
                ? "text-[#6B6660] hover:text-[#2A2420]"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => onSelectGender("female")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              profile.gender === "female"
                ? isPaper
                  ? "bg-[#FFC554] text-[#2A2420] font-black border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                  : isDark
                  ? "bg-[#FFC554] text-black font-black shadow-xs"
                  : "bg-[#881337] text-white font-black shadow-xs"
                : isPaper
                ? "text-[#6B6660] hover:text-[#2A2420]"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Female
          </button>
        </div>
      </div>
    </div>
  );
}
