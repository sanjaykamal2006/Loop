"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";

export default function GenderModal() {
  const { showGenderSelect, setShowGenderSelect, profile, updateProfile, theme, pendingAction, setPendingAction, joinLoop, setView } = useLoop();
  const { bg, border, cardBg, mutedText, isDark } = theme;

  const [name, setName] = useState(profile.display_name || "");
  const [regNo, setRegNo] = useState(profile.reg_no || "");
  const [gender, setGender] = useState<"male" | "female" | "unspecified" | null>((profile.gender as any) || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(profile.display_name || "");
    setRegNo(profile.reg_no || "");
    setGender((profile.gender as any) || null);
  }, [profile, showGenderSelect]);

  if (!showGenderSelect) return null;

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (!regNo.trim()) return toast.error("College, Workplace, or Tag is required");
    if (!gender) return toast.error("Gender is required");

    setIsSubmitting(true);
    const updates = {
      display_name: name.trim(),
      reg_no: regNo.trim(),
      gender: gender
    };
    const success = await updateProfile(updates);
    setIsSubmitting(false);

    if (success) {
      setShowGenderSelect(false);
      if (pendingAction?.type === "join" && pendingAction.data) {
        const targetLoop = pendingAction.data;
        setPendingAction(null);
        joinLoop(targetLoop, updates);
      } else if (pendingAction?.type === "create") {
        setPendingAction(null);
        setView("create");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-sm max-h-[85vh] ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-6 space-y-4 shadow-2xl relative overflow-y-auto scrollbar-hide`}>
        <div className="space-y-1.5 text-center">
          <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center mx-auto mb-1 border shadow-md ${
            isDark ? "bg-[#FFC554]/10 text-[#FFC554] border-[#FFC554]/20" : "bg-[#881337]/10 text-[#881337] border-[#881337]/25"
          }`}>
            <Users size={24} strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase">Complete Profile</h2>
          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-[0.2em]`}>Required to continue</p>
          <p className="text-xs opacity-60 text-center max-w-[260px] mx-auto leading-relaxed">
            Gender is used solely for the 'Girls Only' ride safety filter.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 text-xs font-bold outline-none ${
                isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
              } transition-colors placeholder:opacity-40`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>College / Workplace / Role</label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. Google, VIT-AP, Designer"
              className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 text-xs font-bold outline-none ${
                isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
              } transition-colors placeholder:opacity-40`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Gender</label>
            <div className="grid grid-cols-2 gap-2.5">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g as "male" | "female")}
                  className={`w-full h-12 rounded-[20px] border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer ${
                    gender === g
                      ? isDark
                        ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md"
                        : "bg-[#881337] border-[#881337] text-white shadow-md"
                      : `${border} ${cardBg} ${mutedText}`
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${g === "female" ? "bg-pink-500" : "bg-blue-500"}`} />
                  <span className="capitalize">{g}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setGender("unspecified")}
              className={`w-full h-12 mt-2 rounded-[20px] border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer ${
                gender === "unspecified"
                  ? isDark
                    ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md"
                    : "bg-[#881337] border-[#881337] text-white shadow-md"
                  : `${border} ${cardBg} ${mutedText}`
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>Prefer not to say</span>
            </button>
            {gender === "female" && (
              <p className="text-[10px] text-center text-pink-400 font-medium pt-1.5 leading-normal animate-fade-in">
                Based on self-reported gender at signup. Not independently verified.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`w-full h-12 ${
            isDark
              ? "bg-[#FFC554] text-black shadow-[#FFC554]/20"
              : "bg-[#881337] text-white shadow-[#881337]/20"
          } rounded-[20px] font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-transform flex items-center justify-center shadow-lg cursor-pointer ${isSubmitting ? 'opacity-50' : ''}`}
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
