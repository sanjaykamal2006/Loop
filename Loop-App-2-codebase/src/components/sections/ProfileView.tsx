"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { LogOut, Users, Edit2, Check, Camera, ShieldCheck, Sparkles, AlertTriangle, History, Languages } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import TermsModal from "./TermsModal";
import CreatorModal from "./CreatorModal";
import TeluguGuideModal from "./TeluguGuideModal";

export default function ProfileView() {
  const { session, profile, updateProfile, handleSignOut, theme, setView } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showTeluguGuide, setShowTeluguGuide] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    setTempName(profile.display_name);
    setTempRegNo(profile.reg_no || "");
    setTempBio(profile.bio || "");
  }, [profile.display_name, profile.reg_no, profile.bio]);

  React.useEffect(() => {
    const handlePastLoops = () => {
      setView("past-loops");
    };
    const handleTerms = () => {
      setShowTerms(true);
    };
    const handleCreator = () => {
      setShowCreator(true);
    };
    const handleTeluguGuide = () => {
      setShowTeluguGuide(true);
    };

    window.addEventListener("open-past-loops", handlePastLoops);
    window.addEventListener("open-terms-modal", handleTerms);
    window.addEventListener("open-creator-modal", handleCreator);
    window.addEventListener("open-telugu-guide-modal", handleTeluguGuide);
    return () => {
      window.removeEventListener("open-past-loops", handlePastLoops);
      window.removeEventListener("open-terms-modal", handleTerms);
      window.removeEventListener("open-creator-modal", handleCreator);
      window.removeEventListener("open-telugu-guide-modal", handleTeluguGuide);
    };
  }, [setView]);

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return toast.error("Display name cannot be empty");
    if (!tempRegNo.trim()) return toast.error("Reg. No cannot be empty");

    const success = await updateProfile({
      display_name: tempName.trim(),
      reg_no: tempRegNo.trim().toUpperCase(),
      bio: tempBio.trim(),
    });

    if (success) {
      setIsEditingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be smaller than 5MB");
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      toast.success("Profile photo updated!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* Profile Photo without yellow accent */}
      <div className="flex flex-col items-center justify-center space-y-3 pt-2">
        <div className="relative group">
          <div className={`w-24 h-24 rounded-[28px] ${isDark ? "bg-[#18181B] border-white/10" : "bg-[#F4F4F5] border-black/10"} border-2 flex items-center justify-center shadow-lg overflow-hidden`}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={`text-2xl font-black ${isDark ? "text-white" : "text-black"}`}>
                {profile.display_name?.substring(0, 2).toUpperCase() || "U"}
              </span>
            )}
          </div>

          <label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FFC554] text-black border-2 border-black flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform"
          >
            <Camera size={14} strokeWidth={2.5} />
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        <label
          htmlFor="avatar-upload"
          className="h-8 px-4 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-[#FFC554] flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          <Camera size={12} />
          {isUploading ? "Uploading..." : "Change Photo"}
        </label>
      </div>

      {/* Identity Card - Well-spaced with Email at the very last */}
      <div className={`p-5 ${cardBg} border ${border} rounded-[28px] space-y-4 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              <Users size={14} className={mutedText} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>Identity</span>
          </div>
          {!isEditingProfile ? (
            <button
              onClick={() => setIsEditingProfile(true)}
              aria-label="Edit Profile"
              className="text-xs font-bold text-[#FFC554] hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFC554]/10 active:scale-95 transition-transform"
            >
              <Edit2 size={11} />
              <span>Edit</span>
            </button>
          ) : (
            <button
              onClick={handleSaveProfile}
              aria-label="Save Profile"
              className="text-xs font-bold text-black flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC554] active:scale-95 transition-transform font-black"
            >
              <Check size={13} strokeWidth={3} />
              <span>Save</span>
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          <div className="space-y-3.5">
            {/* 1. Display Name & Reg. No */}
            <div className="grid grid-cols-2 gap-3 pb-1 border-b border-white/5">
              <div>
                <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Display Name</p>
                <p className="font-bold text-sm truncate mt-1">{profile.display_name || "Not Set"}</p>
              </div>
              <div>
                <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Reg. No</p>
                <p className="font-bold text-sm truncate mt-1">{profile.reg_no || "Not Set"}</p>
              </div>
            </div>

            {/* 2. Bio */}
            <div className="pb-1 border-b border-white/5">
              <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Bio</p>
              <p className="text-xs font-medium opacity-80 mt-1 leading-relaxed">
                {profile.bio?.trim() ? profile.bio : "The One."}
              </p>
            </div>

            {/* 3. Account (Email) at the very LAST */}
            <div>
              <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Account (Email)</p>
              <p className="font-bold text-xs truncate mt-1 opacity-90">{session.user.email}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <label className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Display Name</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Display Name"
                className={`w-full h-10 px-3.5 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Reg. Number</label>
              <input
                type="text"
                value={tempRegNo}
                onChange={(e) => setTempRegNo(e.target.value)}
                placeholder="Registration Number"
                className={`w-full h-10 px-3.5 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Bio</label>
              <textarea
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                placeholder="Short bio..."
                rows={2}
                className={`w-full p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-medium outline-none focus:border-[#FFC554] resize-none`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Gender Safety Setting */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center justify-between shadow-sm`}>
        <div className="space-y-0.5">
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Gender</p>
          <p className="text-xs font-bold capitalize">{profile.gender || "Not set"}</p>
        </div>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => updateProfile({ gender: "male" })}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              profile.gender === "male"
                ? "bg-[#FFC554] text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Male
          </button>
          <button
            onClick={() => updateProfile({ gender: "female" })}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              profile.gender === "female"
                ? "bg-[#FFC554] text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Female
          </button>
        </div>
      </div>

      {/* Action & Nav List */}
      <div className="space-y-2 pt-1">
        {/* Past Loops */}
        <button
          onClick={() => setView("past-loops")}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <History size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Activity</p>
              <p className={`text-xs font-bold ${text}`}>Past Loops (History)</p>
            </div>
          </div>
        </button>

        {/* Trusted Drivers */}
        <button
          onClick={() => setView("trusted-vehicles")}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Community</p>
              <p className={`text-xs font-bold ${text}`}>Trusted Drivers</p>
            </div>
          </div>
        </button>

        {/* Telugu Auto Guide */}
        <button
          onClick={() => setShowTeluguGuide(true)}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Languages size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Campus Guide</p>
              <p className={`text-xs font-bold ${text}`}>Telugu Auto Phrases</p>
            </div>
          </div>
        </button>

        {/* About Creator */}
        <button
          onClick={() => setShowCreator(true)}
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
              <Sparkles size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Developer</p>
              <p className={`text-xs font-bold ${text}`}>About Creator</p>
            </div>
          </div>
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] shadow-sm mt-2`}
        >
          Sign Out
        </button>

        {/* Delete Account */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className={`w-full py-3 ${cardBg} border border-red-500/20 rounded-[20px] text-red-400 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] shadow-sm`}
        >
          Delete My Account
        </button>
      </div>

      <TeluguGuideModal isOpen={showTeluguGuide} onClose={() => setShowTeluguGuide(false)} />
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <CreatorModal isOpen={showCreator} onClose={() => setShowCreator(false)} />

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className={`w-full max-w-sm ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[28px] p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black">Delete Account?</h3>
            </div>
            <p className={`text-xs font-bold leading-relaxed ${mutedText}`}>
              This will permanently delete your profile, all your messages, ride history, and trusted driver entries. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className={`flex-1 py-3 ${cardBg} border ${border} rounded-2xl text-xs font-black uppercase tracking-wider active:scale-[0.98]`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const { error } = await supabase.rpc('delete_user_account');
                    if (error) throw error;
                    await supabase.auth.signOut();
                    toast.success('Account permanently deleted.');
                  } catch (error) {
                    console.error(error);
                    toast.error('Failed to delete account. Please try again.');
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
