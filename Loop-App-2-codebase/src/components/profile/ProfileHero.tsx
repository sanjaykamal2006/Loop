"use client";

import React from "react";
import { Edit2 } from "lucide-react";
import FastAvatar from "@/components/ui/FastAvatar";
import type { Profile } from "@/lib/types";

interface ProfileHeroProps {
  profile: Profile;
  email?: string;
  activeAvatar?: string | null;
  isEditingProfile: boolean;
  onStartEdit: () => void;
  isDark: boolean;
  isPaper?: boolean;
  mutedText: string;
}

export default function ProfileHero({
  profile,
  email,
  activeAvatar,
  isEditingProfile,
  onStartEdit,
  isDark,
  isPaper = false,
  mutedText,
}: ProfileHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-1 shrink-0 text-center">
      {/* Centered Avatar - Fully visible with no camera icon covering it */}
      <div className="relative">
        <div
          className={`w-24 h-24 sm:w-26 sm:h-26 rounded-[28px] ${
            isPaper
              ? "bg-[#FAF8F5] border-2 border-[#2A2420] shadow-[3px_3px_0px_#2A2420]"
              : isDark
              ? "bg-[#18181B] border-white/15 border-2 shadow-lg"
              : "bg-[#EAE5DC] border-black/10 border-2 shadow-lg"
          } flex items-center justify-center overflow-hidden`}
        >
          <FastAvatar
            src={activeAvatar || undefined}
            name={profile.display_name}
            sizeClassName="w-full h-full"
            roundedClassName="rounded-[26px]"
            priority={true}
            initialsClassName={`text-3xl font-black ${isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-black"}`}
            fallbackBgClassName={isPaper ? "bg-[#FAF8F5]" : isDark ? "bg-[#18181B]" : "bg-[#EAE5DC]"}
          />
        </div>
      </div>

      {/* User Info Under Avatar */}
      <div className="mt-3 space-y-1 max-w-xs px-2">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <h2
            className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
              isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-zinc-900"
            }`}
          >
            {profile.display_name || "Not Set"}
          </h2>
          {profile.is_student_verified && (
            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider shrink-0">
              {email?.includes("vitap") ? "VIT-AP" : "Verified"}
            </span>
          )}
        </div>

        <p
          className={`text-xs sm:text-[13px] font-bold tracking-wide ${
            isPaper ? "text-[#2A2420] font-black" : isDark ? "text-[#FFC554]" : "text-[#881337]"
          }`}
        >
          {profile.reg_no || "Student / Tag"}
        </p>
        <p className={`text-xs font-medium ${mutedText} truncate`}>{email}</p>

        {/* Edit Profile Button */}
        {!isEditingProfile && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={onStartEdit}
              aria-label="Edit Profile"
              className={`text-xs font-black flex items-center gap-1.5 px-4 py-1.5 rounded-full active:scale-95 transition-transform ${
                isPaper
                  ? "text-[#2A2420] bg-[#FFC554] border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                  : isDark
                  ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30"
                  : "text-[#881337] bg-[#881337]/10 border border-[#881337]/30"
              }`}
            >
              <Edit2 size={12} />
              <span>Edit Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
