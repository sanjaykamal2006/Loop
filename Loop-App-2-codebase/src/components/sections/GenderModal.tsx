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
    if (!regNo.trim()) return toast.error("Registration Number is required");
    if (!gender) return toast.error("Gender is required");

    setIsSubmitting(true);
    const updates = {
      display_name: name.trim(),
      reg_no: regNo.trim().toUpperCase(),
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
          <div className="w-12 h-12 bg-[#FFC554]/10 rounded-[20px] flex items-center justify-center text-[#FFC554] mx-auto mb-1 border border-[#FFC554]/20 shadow-md">
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
              className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 text-xs font-bold outline-none focus:border-[#FFC554] transition-colors placeholder:opacity-40`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Registration Number</label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. 21BCE1234"
              className={`w-full h-11 ${cardBg} border ${border} rounded-[18px] px-4 text-xs font-bold outline-none focus:border-[#FFC554] transition-colors placeholder:opacity-40 uppercase`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g as "male" | "female")}
                  className={`w-full h-10 rounded-[16px] border font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${gender === g ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md" : `${border} ${cardBg} ${mutedText}`}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${g === "female" ? "bg-pink-500" : "bg-blue-500"}`} />
                  {g}
                </button>
              ))}
            </div>
            <button
              onClick={() => setGender("unspecified")}
              className={`w-full h-10 mt-1.5 rounded-[16px] border font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${gender === "unspecified" ? "bg-[#FFC554] border-[#FFC554] text-black shadow-md" : `${border} ${cardBg} ${mutedText}`}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Prefer not to say
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`w-full h-11 bg-[#FFC554] text-black rounded-[18px] font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-transform flex items-center justify-center shadow-lg shadow-[#FFC554]/10 ${isSubmitting ? 'opacity-50' : ''}`}
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
