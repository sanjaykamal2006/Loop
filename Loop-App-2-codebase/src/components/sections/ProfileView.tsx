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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";
import {
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  requestNotificationPermission,
  sendLocalNotification,
} from "@/lib/notifications";

export default function ProfileView() {
  const { session, profile, updateProfile, handleSignOut, theme, setView, toggleTheme } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempPhone, setTempPhone] = useState(profile.phone_number || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      toast.info("Notifications turned off");
      return;
    }

    const currentPerm = getNotificationPermission();
    if (currentPerm === "granted") {
      setNotificationEnabled(true);
      setNotifEnabled(true);
      toast.success("Ride notifications enabled! 🔔");
      await sendLocalNotification("LOOP Notifications Enabled! 🚗", {
        body: "You'll now receive alerts when passengers join your rides.",
      });
      return;
    }

    const res = await requestNotificationPermission();
    if (res.granted) {
      setNotifPermission("granted");
      setNotificationEnabled(true);
      setNotifEnabled(true);
      toast.success("Ride notifications enabled! 🔔");
      await sendLocalNotification("LOOP Notifications Enabled! 🚗", {
        body: "You'll now receive alerts when passengers join your rides.",
      });
    } else if (res.reason === "ios_not_pwa") {
      toast.info("📱 On iPhone, notifications require adding LOOP to your Home Screen: Tap Share (⎋) ➔ 'Add to Home Screen'.");
    } else if (res.reason === "blocked") {
      toast.error("🔒 Notifications are blocked in your browser. Tap the lock/tune icon in your address bar to allow.");
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
    toast.success("Sending test alert... 🔔");
    await sendLocalNotification("LOOP Test Notification 🔔", {
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

    let cleanPhone = tempPhone.trim().replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("+91")) cleanPhone = cleanPhone.slice(3);
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
    <div className="flex-1 flex flex-col space-y-3.5 pt-1 pb-4 min-w-0">
      {/* 1. Centered Profile Hero (Avatar in Middle Like Before) */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1 shrink-0 text-center">
        {/* Centered Avatar */}
        <div className="relative group">
          <div
            className={`w-20 h-20 sm:w-22 sm:h-22 rounded-[26px] ${
              isDark ? "bg-[#18181B] border-white/15" : "bg-[#EAE5DC] border-black/10"
            } border-2 flex items-center justify-center shadow-lg overflow-hidden`}
          >
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

          {/* Camera Upload Button */}
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FFC554] text-black border-2 border-black flex items-center justify-center shadow-md cursor-pointer active:scale-90 transition-transform"
            title="Change profile photo"
          >
            <Camera size={13} strokeWidth={2.5} />
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
        <div className="mt-2.5 space-y-0.5 max-w-xs px-2">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h2 className={`text-lg font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              {profile.display_name || "Not Set"}
            </h2>
            {profile.is_student_verified && (
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider shrink-0">
                {session.user.email?.includes("vitap") ? "VIT-AP" : "Verified"}
              </span>
            )}
          </div>

          <p className={`text-xs font-bold tracking-wide ${isDark ? "text-[#FFC554]" : "text-[#B45309]"}`}>
            {profile.reg_no || "Student / Tag"}
          </p>
          <p className={`text-[11px] font-medium ${mutedText} truncate`}>
            {session.user.email}
          </p>

          {/* Edit Profile Button */}
          {!isEditingProfile && (
            <div className="pt-1.5 flex justify-center">
              <button
                onClick={() => setIsEditingProfile(true)}
                aria-label="Edit Profile"
                className={`text-[11px] font-black flex items-center gap-1.5 px-3.5 py-1 rounded-full active:scale-95 transition-transform ${isDark ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/30" : "text-[#B45309] bg-[#B45309]/10 border border-[#B45309]/30"}`}
              >
                <Edit2 size={11} />
                <span>Edit Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Edit Profile Form (Expanded When Editing) */}
      {isEditingProfile && (
        <div className={`p-4 ${cardBg} border ${border} rounded-[22px] space-y-3 shadow-sm animate-fade-in`}>
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-[#FFC554]">Edit Details</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-xs font-bold text-zinc-400 px-2.5 py-1 rounded-lg hover:bg-white/5 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="text-xs font-black text-black flex items-center gap-1 px-3.5 py-1 rounded-full bg-[#FFC554] active:scale-95 shadow-sm"
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
              className={`w-full h-10 px-3.5 rounded-xl ${isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"} border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
              {profile.is_student_verified
                ? (session.user.email?.includes("vitap") ? "VIT-AP Reg. No (Locked 🔒)" : "Student Roll No. (Locked 🔒)")
                : "Org / College / Roll No."}
            </label>
            <input
              type="text"
              value={tempRegNo}
              disabled={Boolean(profile.is_student_verified && profile.reg_no)}
              onChange={(e) => setTempRegNo(e.target.value)}
              placeholder="e.g. 24MIC7119"
              className={`w-full h-10 px-3.5 rounded-xl ${
                profile.is_student_verified && profile.reg_no
                  ? "bg-white/5 opacity-60 cursor-not-allowed"
                  : isDark ? "bg-white/5" : "bg-black/5"
              } border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
              WhatsApp / Mobile No. (10 Digits)
            </label>
            <div className="flex items-center gap-2">
              <span className={`h-10 px-3 flex items-center justify-center rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-bold text-zinc-400`}>
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="9876543210"
                className={`flex-1 h-10 px-3.5 rounded-xl ${isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"} border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
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
              className={`w-full p-3 rounded-xl ${isDark ? "bg-white/5 text-white" : "bg-black/[0.04] text-zinc-900"} border ${border} text-xs font-medium outline-none focus:border-[#FFC554] resize-none`}
            />
          </div>
        </div>
      )}

      {/* 3. Details Card (WhatsApp, Bio, Gender) */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[22px] space-y-3 shadow-sm`}>
        {/* Phone / WhatsApp */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${mutedText}`}>WhatsApp / Phone</span>
          {profile.phone_number ? (
            <span className={`text-xs font-black tracking-tight ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
              +91 {profile.phone_number}
            </span>
          ) : (
            <button
              onClick={() => setIsEditingProfile(true)}
              className={`text-xs font-bold hover:underline ${isDark ? "text-[#FFC554]" : "text-[#B45309]"}`}
            >
              + Add WhatsApp
            </button>
          )}
        </div>

        <div className={`h-px w-full ${isDark ? "bg-white/5" : "bg-black/5"}`} />

        {/* Bio */}
        <div className="flex items-start justify-between gap-3">
          <span className={`text-xs font-bold ${mutedText} shrink-0`}>Bio</span>
          <span className={`text-xs text-right leading-relaxed max-w-[240px] truncate ${
            profile.bio?.trim()
              ? isDark ? "text-zinc-200" : "text-zinc-800"
              : `${mutedText} italic opacity-50`
          }`}>
            {profile.bio?.trim() ? profile.bio : "No bio added yet"}
          </span>
        </div>

        <div className={`h-px w-full ${isDark ? "bg-white/5" : "bg-black/5"}`} />

        {/* Gender Selection */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${mutedText}`}>Gender</span>

          <div className={`flex items-center p-1 rounded-full border ${isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
            <button
              type="button"
              onClick={() => updateProfile({ gender: "male" })}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                profile.gender === "male"
                  ? "bg-[#FFC554] text-black font-black shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => updateProfile({ gender: "female" })}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                profile.gender === "female"
                  ? "bg-[#FFC554] text-black font-black shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Female
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions & Preferences Card */}
      <div className={`${cardBg} border ${border} rounded-[22px] overflow-hidden shadow-sm divide-y ${isDark ? "divide-white/5" : "divide-black/5"}`}>
        {/* Past Loops */}
        <button
          onClick={() => setView("past-loops")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
              <History size={16} strokeWidth={2.5} />
            </div>
            <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Past Loops (History)
            </span>
          </div>
          <ChevronRight size={15} className="opacity-40" />
        </button>

        {/* Trusted Drivers */}
        <button
          onClick={() => setView("trusted-vehicles")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
            <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Trusted Drivers
            </span>
          </div>
          <ChevronRight size={15} className="opacity-40" />
        </button>

        {/* Ride Notifications */}
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl ${
                notifEnabled
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/10 text-zinc-400"
              } flex items-center justify-center transition-colors shrink-0`}
            >
              <Bell size={16} strokeWidth={2.5} />
            </div>
            <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Ride Notifications
            </span>
          </div>

          <div className="flex items-center gap-2">
            {notifEnabled && (
              <button
                type="button"
                onClick={handleTestAlert}
                className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-white/10 text-[#FFC554] border border-white/15 active:scale-95 transition-all"
              >
                Test
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              onClick={handleToggleNotifications}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors ease-in-out flex items-center cursor-pointer ${
                notifEnabled
                  ? "bg-[#FFC554] justify-end"
                  : isDark
                  ? "bg-white/15 justify-start"
                  : "bg-black/15 justify-start"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-sm ${
                  notifEnabled ? "bg-black" : "bg-zinc-400"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Theme Appearance Toggle */}
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-[#FFC554] shrink-0">
              {isDark ? <Moon size={16} strokeWidth={2.5} /> : <Sun size={16} strokeWidth={2.5} />}
            </div>
            <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Appearance
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border ${border} ${cardBg} flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer`}
          >
            {isDark ? (
              <>
                <Moon size={12} className="text-[#FFC554]" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={12} className={isDark ? "text-[#FFC554]" : "text-[#B45309]"} />
                <span>Light</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Account Actions (Anchored at the Bottom) */}
      <div className="flex items-center gap-2.5 pt-1 shrink-0">
        <button
          onClick={handleSignOut}
          className={`flex-1 h-11 ${cardBg} border border-red-500/25 rounded-2xl text-red-500 font-black text-xs uppercase tracking-wider active:scale-[0.98] shadow-sm flex items-center justify-center hover:bg-red-500/10 transition-colors cursor-pointer`}
        >
          Sign Out
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className={`flex-1 h-11 ${cardBg} border ${border} rounded-2xl text-zinc-400 hover:text-red-400 font-bold text-xs uppercase tracking-wider active:scale-[0.98] shadow-sm flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer`}
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
