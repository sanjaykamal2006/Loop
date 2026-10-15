"use client";

import React from "react";
import { Check, Lock } from "lucide-react";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
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
  email?: string;
  cardBg: string;
  border: string;
  mutedText: string;
  isDark: boolean;
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
  email,
  cardBg,
  border,
  mutedText,
  isDark,
}: ProfileEditCardProps) {
  return (
    <div className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-3.5 shadow-sm animate-fade-in`}>
      <div className="flex items-center justify-between pb-1 border-b border-white/10">
        <span
          className={`text-xs font-black uppercase tracking-wider ${
            isDark ? "text-[#FFC554]" : "text-[#881337]"
          }`}
        >
          Edit Details
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-xs font-bold text-zinc-400 px-2.5 py-1 rounded-lg hover:bg-white/5 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className={`text-xs font-black flex items-center gap-1 px-3.5 py-1.5 rounded-full ${
              isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
            } active:scale-95 shadow-sm`}
          >
            <Check size={12} strokeWidth={3} />
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Display Name</label>
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="Display Name"
          className={`w-full h-11 px-4 rounded-xl ${
            isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"
          } border ${border} text-xs sm:text-[13px] font-bold outline-none ${
            isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
          }`}
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
                isDark ? "text-[#FFC554]" : "text-[#881337]"
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
              ? "bg-white/5 opacity-60 cursor-not-allowed"
              : isDark
              ? "bg-white/5"
              : "bg-black/5"
          } border ${border} text-xs sm:text-[13px] font-bold outline-none ${
            isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
          }`}
        />
      </div>

      <div className="space-y-1">
        <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
          WhatsApp / Mobile No. (10 Digits)
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`h-11 px-3.5 flex items-center justify-center rounded-xl ${
              isDark ? "bg-white/5" : "bg-black/5"
            } border ${border} text-xs sm:text-[13px] font-bold text-zinc-400`}
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
              isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"
            } border ${border} text-xs sm:text-[13px] font-bold outline-none ${
              isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
            }`}
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
            isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"
          } border ${border} text-xs sm:text-[13px] font-medium outline-none ${
            isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
          } resize-none`}
        />
      </div>
    </div>
  );
}
