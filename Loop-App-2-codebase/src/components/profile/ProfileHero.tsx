"use client";

import React from "react";
import { Camera, Edit2 } from "lucide-react";
import FastAvatar from "@/components/ui/FastAvatar";
import type { Profile } from "@/lib/types";

interface ProfileHeroProps {
  profile: Profile;
  email?: string;
  activeAvatar?: string | null;
  isUploading: boolean;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isEditingProfile: boolean;
  onStartEdit: () => void;
  isDark: boolean;
  mutedText: string;
}

export default function ProfileHero({
  profile,
  email,
  activeAvatar,
  isUploading,
  onAvatarUpload,
  isEditingProfile,
  onStartEdit,
  isDark,
  mutedText,
}: ProfileHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-1 shrink-0 text-center">
      {/* Centered Avatar */}
      <div className="relative group">
        <div
          className={`w-24 h-24 sm:w-26 sm:h-26 rounded-[28px] ${
            isDark ? "bg-[#18181B] border-white/15" : "bg-[#EAE5DC] border-black/10"
          } border-2 flex items-center justify-center shadow-lg overflow-hidden`}
        >
          <FastAvatar
            src={activeAvatar || undefined}
            name={profile.display_name}
            sizeClassName="w-full h-full"
            roundedClassName="rounded-[26px]"
            priority={true}
            initialsClassName={`text-3xl font-black ${isDark ? "text-white" : "text-black"}`}
            fallbackBgClassName={isDark ? "bg-[#18181B]" : "bg-[#EAE5DC]"}
          />
        </div>

        {/* Camera Upload Button */}
        <label
          htmlFor="avatar-upload"
          className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 ${
            isDark ? "bg-[#FFC554] text-black border-black" : "bg-[#881337] text-white border-white"
          } flex items-center justify-center shadow-md cursor-pointer active:scale-90 transition-transform`}
          title="Change profile photo"
        >
          <Camera size={14} strokeWidth={2.5} />
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* User Info Under Avatar */}
      <div className="mt-3 space-y-1 max-w-xs px-2">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <h2
            className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
              isDark ? "text-white" : "text-zinc-900"
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
            isDark ? "text-[#FFC554]" : "text-[#881337]"
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
                isDark
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
