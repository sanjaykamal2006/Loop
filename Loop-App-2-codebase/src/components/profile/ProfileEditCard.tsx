"use client";

import React from "react";
import { Check, Lock, Camera } from "lucide-react";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
import FastAvatar from "@/components/ui/FastAvatar";
import type { Profile } from "@/lib/types";

interface ProfileEditCardProps {
  profile: Profile;
  tempName: string;
  setTempName: (val: string) => void;
  tempRegNo: string;
  setTempRegNo: (val: string) => void;
  tempPhone: string;
  setTempPhone: (val: string) => void;
  tempBio: string;
  setTempBio: (val: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onAvatarUpload?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading?: boolean;
  activeAvatar?: string | null;
  email?: string;
  cardBg: string;
  border: string;
  mutedText: string;
  isDark: boolean;
  isPaper?: boolean;
}

export default function ProfileEditCard({
  profile,
  tempName,
  setTempName,
  tempRegNo,
  setTempRegNo,
  tempPhone,
  setTempPhone,
  tempBio,
  setTempBio,
  onCancel,
  onSave,
  onAvatarUpload,
  isUploading = false,
  activeAvatar,
  email,
  cardBg,
  border,
  mutedText,
  isDark,
  isPaper = false,
}: ProfileEditCardProps) {
  return (
    <div
      className={`p-4 ${cardBg} ${
        isPaper
          ? "border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
          : `border ${border} shadow-sm`
      } rounded-[24px] space-y-3.5 animate-fade-in`}
    >
      <div className={`flex items-center justify-between pb-1 border-b ${
        isPaper ? "border-[#2A2420]/15" : isDark ? "border-white/10" : "border-black/10"
      }`}>
        <span
          className={`text-xs font-black uppercase tracking-wider ${
            isPaper ? "text-[#2A2420]" : isDark ? "text-[#FFC554]" : "text-[#881337]"
          }`}
        >
          Edit Details
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all ${
              isPaper ? "text-[#6B6660] hover:text-[#2A2420]" : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className={`text-xs font-black flex items-center gap-1 px-3.5 py-1.5 rounded-full ${
              isPaper
                ? "bg-[#FFC554] text-[#2A2420] border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                : isDark
                ? "bg-[#FFC554] text-black"
                : "bg-[#881337] text-white"
            } active:scale-95 shadow-sm transition-all`}
          >
            <Check size={12} strokeWidth={3} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Change Profile Picture Action Row */}
      {onAvatarUpload && (
        <div className={`p-3 rounded-2xl flex items-center justify-between gap-3 ${
          isPaper
            ? "bg-[#FAF8F5] border border-[#2A2420]"
            : isDark
            ? "bg-white/5 border border-white/10"
            : "bg-black/[0.03] border border-black/10"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 ${
              isPaper ? "border border-[#2A2420]" : isDark ? "border border-white/15" : "border border-black/10"
            }`}>
              <FastAvatar
                src={activeAvatar || undefined}
                name={profile.display_name}
                sizeClassName="w-full h-full"
                roundedClassName="rounded-2xl"
                initialsClassName={`text-base font-black ${isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-black"}`}
                fallbackBgClassName={isPaper ? "bg-[#FAF8F5]" : isDark ? "bg-[#18181B]" : "bg-[#EAE5DC]"}
              />
            </div>
            <div>
              <p className={`text-xs font-bold ${isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-zinc-900"}`}>
                Profile Photo
              </p>
              <p className={`text-[10px] ${mutedText}`}>JPEG, PNG or WebP</p>
            </div>
          </div>
          <label
            htmlFor="edit-avatar-upload"
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            } ${
              isPaper
                ? "bg-[#FFC554] text-[#2A2420] border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                : isDark
                ? "bg-[#FFC554] text-black shadow-xs"
                : "bg-[#881337] text-white shadow-xs"
            }`}
          >
            <Camera size={14} strokeWidth={2.5} />
            <span>{isUploading ? "Uploading..." : "Change Photo"}</span>
            <input
              id="edit-avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      )}

      <div className="space-y-1">
        <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Display Name</label>
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="Display Name"
          className={`w-full h-11 px-4 rounded-xl ${
            isPaper
              ? "bg-[#FAF8F5] text-[#2A2420] border-2 border-[#2A2420] focus:ring-1 focus:ring-[#FFC554]"
              : isDark
              ? `bg-white/5 text-white border ${border} focus:border-[#FFC554]`
              : `bg-black/[0.04] text-zinc-900 border ${border} focus:border-[#881337]`
          } text-xs sm:text-[13px] font-bold outline-none`}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
            {profile.is_student_verified
              ? email?.includes("vitap")
                ? "VIT-AP Reg. No"
                : "Student Roll No."
              : "Org / College / Roll No."}
          </label>
          {profile.is_student_verified && (
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isPaper ? "text-[#2A2420]" : isDark ? "text-[#FFC554]" : "text-[#881337]"
              }`}
            >
              <Lock size={10} strokeWidth={2.4} />
              <span>Locked</span>
            </span>
          )}
        </div>
        <input
          type="text"
          value={tempRegNo}
          disabled={Boolean(profile.is_student_verified && profile.reg_no)}
          onChange={(e) => setTempRegNo(e.target.value)}
          placeholder="e.g. 24MIC7119"
          className={`w-full h-11 px-4 rounded-xl ${
            profile.is_student_verified && profile.reg_no
              ? "opacity-60 cursor-not-allowed"
              : ""
          } ${
            isPaper
              ? "bg-[#FAF8F5] text-[#2A2420] border-2 border-[#2A2420] focus:ring-1 focus:ring-[#FFC554]"
              : isDark
              ? `bg-white/5 border ${border} focus:border-[#FFC554]`
              : `bg-black/5 border ${border} focus:border-[#881337]`
          } text-xs sm:text-[13px] font-bold outline-none`}
        />
      </div>

      <div className="space-y-1">
        <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
          WhatsApp / Mobile No. (10 Digits)
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`h-11 px-3.5 flex items-center justify-center rounded-xl ${
              isPaper
                ? "bg-[#FAF8F5] border-2 border-[#2A2420] text-[#2A2420]"
                : isDark
                ? `bg-white/5 border ${border} text-zinc-400`
                : `bg-black/5 border ${border} text-zinc-400`
            } text-xs sm:text-[13px] font-bold`}
          >
            +91
          </span>
          <input
            type="tel"
            value={tempPhone}
            onChange={(e) => setTempPhone(sanitizeIndianPhoneNumber(e.target.value))}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              const cleaned = sanitizeIndianPhoneNumber(pasted);
              if (cleaned.length === 10) {
                e.preventDefault();
                setTempPhone(cleaned);
              }
            }}
            placeholder="9876543210"
            className={`flex-1 h-11 px-4 rounded-xl ${
              isPaper
                ? "bg-[#FAF8F5] text-[#2A2420] border-2 border-[#2A2420] focus:ring-1 focus:ring-[#FFC554]"
                : isDark
                ? `bg-white/5 text-white border ${border} focus:border-[#FFC554]`
                : `bg-black/[0.04] text-zinc-900 border ${border} focus:border-[#881337]`
            } text-xs sm:text-[13px] font-bold outline-none`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Bio</label>
        <textarea
          value={tempBio}
          onChange={(e) => setTempBio(e.target.value)}
          placeholder="Short bio..."
          rows={2}
          className={`w-full p-3.5 rounded-xl ${
            isPaper
              ? "bg-[#FAF8F5] text-[#2A2420] border-2 border-[#2A2420] focus:ring-1 focus:ring-[#FFC554]"
              : isDark
              ? `bg-white/5 text-white border ${border} focus:border-[#FFC554]`
              : `bg-black/[0.04] text-zinc-900 border ${border} focus:border-[#881337]`
          } text-xs sm:text-[13px] font-medium outline-none resize-none`}
        />
      </div>
    </div>
  );
}
