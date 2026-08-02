"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { LogOut, Users, Edit2, Check, Camera, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ProfileView() {
  const { session, profile, updateProfile, handleSignOut, theme, setView } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = () => {
    updateProfile({ display_name: tempName, reg_no: tempRegNo });
    setIsEditingProfile(false);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      toast.success("Avatar updated!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-4 pb-2 gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="relative group cursor-pointer" onClick={() => document.getElementById("avatar-upload")?.click()}>
          <div className="w-20 h-20 rounded-[28px] bg-[#FFC554] flex items-center justify-center text-black text-2xl font-black shadow-xl overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile.display_name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-[28px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={24} className="text-white" />}
          </div>
          <input 
            type="file" 
            id="avatar-upload" 
            accept="image/*" 
            className="hidden" 
            onChange={uploadAvatar}
            disabled={isUploading}
          />
        </div>
        <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>Edit Picture</p>
      </div>

      <div className="w-full space-y-3">
        <div className={`p-5 ${cardBg} border ${border} rounded-[28px]`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs font-bold ${mutedText} uppercase tracking-widest`}>Identity</p>
            {isEditingProfile ? (
              <button
                onClick={handleSave}
                className="w-9 h-9 bg-[#FFC554] rounded-full flex items-center justify-center shadow-lg active:scale-90 "
              >
                <Check size={16} className="text-black" strokeWidth={3} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempName(profile.display_name);
                  setTempRegNo(profile.reg_no || "");
                  setIsEditingProfile(true);
                }}
                className="p-2 rounded-full active:scale-90 "
              >
                <Edit2 size={15} className="text-[#FFC554]" />
              </button>
            )}
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1.5">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Display Name</p>
              {isEditingProfile ? (
                <input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className={`w-full bg-black/10 border ${border} rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFC554]`}
                  placeholder="Name"
                />
              ) : (
                <h2 className="text-xl font-black tracking-tight">{profile.display_name}</h2>
              )}
            </div>
            <div className="w-32 space-y-1.5">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Reg. No</p>
              {isEditingProfile ? (
                <input
                  value={tempRegNo}
                  onChange={(e) => setTempRegNo(e.target.value)}
                  className={`w-full bg-black/10 border ${border} rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFC554]`}
                  placeholder="Reg #"
                />
              ) : (
                <h2 className="text-xl font-black tracking-tight">{profile.reg_no || "—"}</h2>
              )}
            </div>
          </div>
        </div>

        <div className={`p-5 ${cardBg} border ${border} rounded-[28px] flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Gender</p>
              <p className="text-sm font-bold capitalize">{profile.gender || "Not set"}</p>
            </div>
          </div>
          <div className={`flex gap-1 ${isDark ? "bg-white/5" : "bg-black/5"} p-1 rounded-xl transition-colors duration-1000`}>
            {["male", "female"].map((g) => (
              <button
                key={g}
                onClick={() => updateProfile({ gender: g })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-90 transition-all ${profile.gender === g ? "bg-[#FFC554] text-black shadow-sm" : mutedText}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className={`p-5 ${cardBg} border ${border} rounded-[28px] flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
            <LogOut size={18} strokeWidth={2.5} className="rotate-180" />
          </div>
          <div className="space-y-1 overflow-hidden">
            <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Account</p>
            <p className="text-sm font-bold opacity-60 truncate">{session.user.email}</p>
          </div>
        </div>

        <button
          onClick={() => setView("trusted-vehicles")}
          className={`p-5 ${cardBg} border ${border} rounded-[28px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div className="space-y-1 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Community</p>
              <p className={`text-sm font-bold ${text}`}>Trusted Vehicles</p>
            </div>
          </div>
        </button>

        <button
          onClick={handleSignOut}
          className={`w-full py-4 ${cardBg} border ${border} rounded-[22px] text-red-500 font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] shadow-sm mt-4`}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
