"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import {
  Users,
  Edit2,
  Check,
  Camera,
  ShieldCheck,
  History,
  Bell,
  ChevronRight,
  Sun,
  Moon,
  X,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";
import FastAvatar from "@/components/ui/FastAvatar";
import { compressAvatarImage } from "@/lib/imageOptimization";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
import {
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  requestNotificationPermission,
  sendLocalNotification,
} from "@/lib/notifications";

export default function ProfileView() {
  const { 
    session, 
    profile, 
    updateProfile, 
    handleSignOut, 
    theme, 
    setView, 
    toggleTheme,
  } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempPhone, setTempPhone] = useState(profile.phone_number || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [notifEnabled, setNotifEnabled] = useState(false);

  React.useEffect(() => {
    setNotifPermission(getNotificationPermission());
    setNotifEnabled(isNotificationEnabled());
  }, []);

  const handleToggleNotifications = async () => {
    if (notifEnabled) {
      setNotificationEnabled(false);
      setNotifEnabled(false);
      return;
    }

    const currentPerm = getNotificationPermission();
    if (currentPerm === "granted") {
      setNotificationEnabled(true);
      setNotifEnabled(true);
      return;
    }

    const res = await requestNotificationPermission();
    if (res.granted) {
      setNotifPermission("granted");
      setNotificationEnabled(true);
      setNotifEnabled(true);
    } else if (res.reason === "ios_not_pwa") {
      toast.info("On iPhone, notifications require adding LOOP to your Home Screen: Tap Share -> 'Add to Home Screen'.");
    } else if (res.reason === "blocked") {
      toast.error("Notifications are blocked in your browser. Tap the lock/tune icon in your address bar to allow.");
    } else {
      toast.error("Notifications were not enabled. Please check your device settings.");
    }
  };

  const handleTestAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notifEnabled) {
      toast.info("Turn notifications ON first to test.");
      return;
    }
    toast.success("Sending test alert...");
    await sendLocalNotification("LOOP Test Notification", {
      body: "Awesome! You will receive alerts when passengers join your rides.",
    });
  };

  React.useEffect(() => {
    setTempName(profile.display_name);
    setTempRegNo(profile.reg_no || "");
    setTempBio(profile.bio || "");
    setTempPhone(profile.phone_number || "");
  }, [profile.display_name, profile.reg_no, profile.bio, profile.phone_number]);

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return toast.error("Display name cannot be empty");
    if (!tempRegNo.trim()) return toast.error("Org / College / Tag cannot be empty");

    const cleanPhone = sanitizeIndianPhoneNumber(tempPhone);
    if (cleanPhone && cleanPhone.length !== 10) {
      return toast.error("Please enter a valid 10-digit mobile/WhatsApp number");
    }

    const success = await updateProfile({
      display_name: tempName.trim(),
      reg_no: tempRegNo.trim(),
      bio: tempBio.trim(),
      phone_number: cleanPhone,
    });

    if (success) {
      setIsEditingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      return toast.error("Image must be smaller than 15MB");
    }

    setIsUploading(true);
    try {
      // 1. Instant client-side canvas compression (reduces 4MB+ phone photos to ~25KB WebP/JPEG)
      const { file: compressedFile, previewUrl, fileExt, contentType } = await compressAvatarImage(file, 384, 0.82);

      // 2. Instant Zero-Latency Optimistic Preview (0ms visual update)
      setOptimisticAvatarUrl(previewUrl);

      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      // 3. Fast background upload with 1-Year Immutable Caching
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressedFile, {
          contentType,
          cacheControl: "31536000, immutable",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: publicUrl });
      toast.success("Profile photo updated!");
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Avatar upload error:", err);
      }
      setOptimisticAvatarUrl(null); // Revert optimistic preview on error
      toast.error(err?.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const activeAvatar = optimisticAvatarUrl || profile.avatar_url;

  return (
    <div className="flex-1 flex flex-col space-y-3.5 sm:space-y-4 pt-1.5 pb-2 min-w-0">
      {/* 1. Centered Profile Hero (Avatar in Middle Like Before) */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1 shrink-0 text-center">
        {/* Centered Avatar */}
        <div className="relative group">
          <div
            className={`w-24 h-24 sm:w-26 sm:h-26 rounded-[28px] ${
              isDark ? "bg-[#18181B] border-white/15" : "bg-[#EAE5DC] border-black/10"
            } border-2 flex items-center justify-center shadow-lg overflow-hidden`}
          >
            <FastAvatar
              src={activeAvatar}
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
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* User Info Under Avatar */}
        <div className="mt-3 space-y-1 max-w-xs px-2">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              {profile.display_name || "Not Set"}
            </h2>
            {profile.is_student_verified && (
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider shrink-0">
                {session.user.email?.includes("vitap") ? "VIT-AP" : "Verified"}
              </span>
            )}
          </div>

          <p className={`text-xs sm:text-[13px] font-bold tracking-wide ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
            {profile.reg_no || "Student / Tag"}
          </p>
          <p className={`text-xs font-medium ${mutedText} truncate`}>
            {session.user.email}
          </p>

          {/* Edit Profile Button */}
          {!isEditingProfile && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setIsEditingProfile(true)}
                aria-label="Edit Profile"
                className={`text-xs font-black flex items-center gap-1.5 px-4 py-1.5 rounded-full active:scale-95 transition-transform ${isDark ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30" : "text-[#881337] bg-[#881337]/10 border border-[#881337]/30"}`}
              >
                <Edit2 size={12} />
                <span>Edit Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Edit Profile Form (Expanded When Editing) */}
      {isEditingProfile && (
        <div className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-3.5 shadow-sm animate-fade-in`}>
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>Edit Details</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-xs font-bold text-zinc-400 px-2.5 py-1 rounded-lg hover:bg-white/5 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className={`text-xs font-black flex items-center gap-1 px-3.5 py-1.5 rounded-full ${isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"} active:scale-95 shadow-sm`}
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
              className={`w-full h-11 px-4 rounded-xl ${isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"} border ${border} text-xs sm:text-[13px] font-bold outline-none ${isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"}`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
                {profile.is_student_verified
                  ? (session.user.email?.includes("vitap") ? "VIT-AP Reg. No" : "Student Roll No.")
                  : "Org / College / Roll No."}
              </label>
              {profile.is_student_verified && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
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
                  : isDark ? "bg-white/5" : "bg-black/5"
              } border ${border} text-xs sm:text-[13px] font-bold outline-none ${isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"}`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
              WhatsApp / Mobile No. (10 Digits)
            </label>
            <div className="flex items-center gap-2">
              <span className={`h-11 px-3.5 flex items-center justify-center rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs sm:text-[13px] font-bold text-zinc-400`}>
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
                className={`flex-1 h-11 px-4 rounded-xl ${isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"} border ${border} text-xs sm:text-[13px] font-bold outline-none ${isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"}`}
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
              className={`w-full p-3.5 rounded-xl ${isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"} border ${border} text-xs sm:text-[13px] font-medium outline-none ${isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"} resize-none`}
            />
          </div>
        </div>
      )}

      {/* 3. Details Card (WhatsApp, Bio, Gender) */}
      <div className={`${cardBg} border ${border} rounded-[24px] px-4.5 divide-y ${isDark ? "divide-white/[0.06]" : "divide-black/[0.06]"} shadow-sm`}>
        {/* Phone / WhatsApp */}
        <div className="flex items-center justify-between py-4 min-h-[56px]">
          <span className={`text-[13px] font-semibold ${mutedText}`}>WhatsApp / Phone</span>
          {profile.phone_number ? (
            <span className={`text-[13px] sm:text-sm font-mono font-bold tracking-tight ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
              +91 {profile.phone_number}
            </span>
          ) : (
            <button
              onClick={() => setIsEditingProfile(true)}
              className={`text-xs sm:text-[13px] font-bold hover:underline ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}
            >
              + Add WhatsApp
            </button>
          )}
        </div>

        {/* Bio */}
        <div className="flex items-center justify-between gap-3 py-4 min-h-[56px]">
          <span className={`text-[13px] font-semibold ${mutedText} shrink-0`}>Bio</span>
          <span className={`text-[13px] sm:text-sm text-right max-w-[220px] truncate ${
            profile.bio?.trim()
              ? isDark ? "text-zinc-200" : "text-zinc-800"
              : `${mutedText} italic opacity-50`
          }`}>
            {profile.bio?.trim() ? profile.bio : "No bio added yet"}
          </span>
        </div>

        {/* Gender Selection */}
        <div className="flex items-center justify-between py-3.5 min-h-[56px]">
          <span className={`text-[13px] font-semibold ${mutedText}`}>Gender</span>

          <div className={`flex items-center p-0.5 rounded-full border ${isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
            <button
              type="button"
              onClick={() => updateProfile({ gender: "male" })}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                profile.gender === "male"
                  ? isDark ? "bg-[#FFC554] text-black font-black shadow-xs" : "bg-[#881337] text-white font-black shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => updateProfile({ gender: "female" })}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                profile.gender === "female"
                  ? isDark ? "bg-[#FFC554] text-black font-black shadow-xs" : "bg-[#881337] text-white font-black shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Female
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions & Preferences Card */}
      <div className={`${cardBg} border ${border} rounded-[24px] overflow-hidden shadow-sm divide-y ${isDark ? "divide-white/5" : "divide-black/5"}`}>
        {/* Past Loops */}
        <button
          onClick={() => setView("past-loops")}
          className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
              <History size={18} strokeWidth={2.5} />
            </div>
            <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Past Loops (History)
            </span>
          </div>
          <ChevronRight size={16} className="opacity-40" />
        </button>

        {/* Trusted Drivers */}
        <button
          onClick={() => {
            triggerHaptic(10);
            setView("trusted-vehicles");
          }}
          className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Trusted Drivers
            </span>
          </div>
          <ChevronRight size={16} className="opacity-40" />
        </button>

        {/* Ride Notifications */}
        <div className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${
                notifEnabled
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/10 text-zinc-400"
              } flex items-center justify-center transition-colors shrink-0`}
            >
              <Bell size={18} strokeWidth={2.5} />
            </div>
            <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Ride Notifications
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {notifEnabled && (
              <button
                type="button"
                onClick={handleTestAlert}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border active:scale-95 transition-all ${
                  isDark
                    ? "bg-white/10 text-[#FFC554] border-white/15"
                    : "bg-black/5 text-[#881337] border-black/10"
                }`}
              >
                Test
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              onClick={handleToggleNotifications}
              className={`w-11 h-6.5 rounded-full p-0.5 transition-colors ease-in-out flex items-center cursor-pointer ${
                notifEnabled
                  ? isDark ? "bg-[#FFC554] justify-end" : "bg-[#881337] justify-end"
                  : isDark ? "bg-white/15 justify-start" : "bg-black/15 justify-start"
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full shadow-sm ${
                  notifEnabled ? (isDark ? "bg-black" : "bg-white") : "bg-zinc-400"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Theme Appearance Toggle */}
        <div className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${isDark ? "bg-amber-500/15 text-[#FFC554]" : "bg-rose-500/15 text-[#881337]"} flex items-center justify-center shrink-0`}>
              {isDark ? <Moon size={18} strokeWidth={2.5} /> : <Sun size={18} strokeWidth={2.5} />}
            </div>
            <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Appearance
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${border} ${cardBg} flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer`}
          >
            {isDark ? (
              <>
                <Moon size={13} className="text-[#FFC554]" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={13} className="text-[#881337]" />
                <span className="text-[#881337]">Light</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Account Actions (Anchored at the Bottom) */}
      <div className="flex items-center gap-2.5 pt-1 shrink-0">
        <button
          onClick={handleSignOut}
          className={`flex-1 h-12 ${cardBg} border border-red-500/25 rounded-[20px] text-red-500 font-black text-xs uppercase tracking-wider active:scale-[0.98] shadow-sm flex items-center justify-center hover:bg-red-500/10 transition-colors cursor-pointer`}
        >
          Sign Out
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className={`flex-1 h-12 ${cardBg} border ${border} rounded-[20px] text-zinc-400 hover:text-red-400 font-bold text-xs uppercase tracking-wider active:scale-[0.98] shadow-sm flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer`}
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-5 animate-fade-in">
          <div className={`w-full max-w-sm ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-2xl p-5 space-y-3.5 shadow-2xl`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <h3 className="text-base font-black">Delete Account?</h3>
            </div>
            <p className={`text-xs font-semibold leading-relaxed ${mutedText}`}>
              This will permanently delete your profile, ride history, and trusted driver entries. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className={`flex-1 py-2.5 ${cardBg} border ${border} rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98]`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData.session?.access_token;
                    if (!token) throw new Error("Please log in to delete your account.");

                    const res = await fetch("/api/account/delete", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    });

                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      throw new Error(body.error || "Failed to delete account");
                    }

                    await supabase.auth.signOut({ scope: "global" });
                    toast.success("Account permanently deleted.");
                  } catch (error: any) {
                    if (process.env.NODE_ENV !== "production") {
                      console.error("Account delete error:", error);
                    }
                    toast.error(error.message || "Failed to delete account. Please try again.");
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
