"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users } from "lucide-react";
import { toast } from "sonner";

export default function GenderModal() {
  const { showGenderSelect, setShowGenderSelect, profile, updateProfile, theme } = useLoop();
  const { bg, border, cardBg, mutedText } = theme;

  const [name, setName] = useState(profile.display_name || "");
  const [regNo, setRegNo] = useState(profile.reg_no || "");
  const [gender, setGender] = useState<"male" | "female" | null>((profile.gender as "male" | "female") || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(profile.display_name || "");
    setRegNo(profile.reg_no || "");
    setGender((profile.gender as "male" | "female") || null);
  }, [profile, showGenderSelect]);

  if (!showGenderSelect) return null;

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (!regNo.trim()) return toast.error("Registration Number is required");
    if (!gender) return toast.error("Gender is required");

    setIsSubmitting(true);
    await updateProfile({
      display_name: name.trim(),
      reg_no: regNo.trim().toUpperCase(),
      gender: gender
    });
    setIsSubmitting(false);
    setShowGenderSelect(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
      <div className={`${cardBg} border ${border} rounded-[40px] p-8 w-full max-w-sm space-y-6 shadow-2xl relative`}>
        <div className="space-y-2 text-center">
          <div className="w-16 h-16 bg-[#FFC554]/10 rounded-[24px] flex items-center justify-center text-[#FFC554] mx-auto mb-4">
            <Users size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Complete Profile</h2>
          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-[0.2em]`}>Required to continue</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`w-full h-14 ${cardBg} border ${border} rounded-[24px] px-5 font-bold outline-none focus:border-[#FFC554]/50 transition-colors placeholder:text-gray-500`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Registration Number</label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. 21BCE1234"
              className={`w-full h-14 ${cardBg} border ${border} rounded-[24px] px-5 font-bold outline-none focus:border-[#FFC554]/50 transition-colors placeholder:text-gray-500 uppercase`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase font-black ${mutedText} tracking-[0.15em] ml-1`}>Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g as "male" | "female")}
                  className={`w-full h-12 rounded-[20px] border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${gender === g ? "bg-[#FFC554] border-[#FFC554] text-black" : `${border} ${bg} ${mutedText}`}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${g === "female" ? "bg-pink-500" : "bg-blue-500"}`} />
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`w-full h-14 mt-4 bg-[#FFC554] text-black rounded-[24px] font-black uppercase tracking-widest text-xs active:scale-[0.98] transition-transform flex items-center justify-center ${isSubmitting ? 'opacity-50' : ''}`}
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
