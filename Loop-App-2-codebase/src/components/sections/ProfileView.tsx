"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { LogOut, Users, Edit2, Check, Camera, ShieldCheck, Sparkles, AlertTriangle, History, Languages, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import CreatorModal from "./CreatorModal";
import { getNotificationPermission, isNotificationEnabled, setNotificationEnabled, requestNotificationPermission, sendLocalNotification } from "@/lib/notifications";

export default function ProfileView() {
  const { session, profile, updateProfile, handleSignOut, theme, setView } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempPhone, setTempPhone] = useState(profile.phone_number || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
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

  React.useEffect(() => {
    const handlePastLoops = () => {
      setView("past-loops");
    };
    const handleCreator = () => {
      setShowCreator(true);
    };

    window.addEventListener("open-past-loops", handlePastLoops);
    window.addEventListener("open-creator-modal", handleCreator);
    return () => {
      window.removeEventListener("open-past-loops", handlePastLoops);
      window.removeEventListener("open-creator-modal", handleCreator);
    };
  }, [setView]);

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
            {/* 1. Display Name & Student Reg. No */}
            <div className="grid grid-cols-2 gap-3 pb-1 border-b border-white/5">
              <div>
                <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Display Name</p>
                <p className="font-bold text-sm truncate mt-1">{profile.display_name || "Not Set"}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Student Reg. No</p>
                  {profile.is_student_verified && (
                    <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                      {session.user.email?.includes("vitap") ? "VIT-AP 🎓" : "Verified 🎓"}
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm truncate mt-1">{profile.reg_no || "Not Set"}</p>
              </div>
            </div>

            {/* 2. Direct Contact (WhatsApp / Mobile) */}
            <div className="pb-1 border-b border-white/5">
              <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Phone / WhatsApp (For Confirmed Rides)</p>
              <div className="flex items-center gap-2 mt-1">
                {profile.phone_number ? (
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    +91 {profile.phone_number}
                  </span>
                ) : (
                  <span className={`text-xs ${mutedText} italic opacity-60`}>
                    Not added yet — tap Edit to add WhatsApp for easy pickup coordination
                  </span>
                )}
              </div>
            </div>

            {/* 3. Bio */}
            <div className="pb-1 border-b border-white/5">
              <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Bio</p>
              <p className={`text-xs font-medium mt-1 leading-relaxed ${profile.bio?.trim() ? "opacity-80" : `${mutedText} opacity-40 italic`}`}>
                {profile.bio?.trim() ? profile.bio : "No bio added yet."}
              </p>
            </div>

            {/* 4. Account (Email) at the very LAST */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>College Email</p>
                <p className="font-bold text-xs truncate mt-1 opacity-90">{session.user.email}</p>
              </div>
              {profile.is_student_verified && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  {session.user.email?.includes("vitap") ? "VIT-AP ID Verified" : "Campus ID Verified"}
                </span>
              )}
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
              <div className="flex items-center justify-between">
                <label className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>
                  {profile.is_student_verified
                    ? (session.user.email?.includes("vitap") ? "VIT-AP Reg. No (Locked 🔒)" : "Student Roll No. (Locked 🔒)")
                    : "Org / College / Roll No."}
                </label>
              </div>
              <input
                type="text"
                value={tempRegNo}
                disabled={Boolean(profile.is_student_verified && profile.reg_no)}
                onChange={(e) => setTempRegNo(e.target.value)}
                placeholder="e.g. 24MIC7119, 21BCE1234"
                className={`w-full h-10 px-3.5 rounded-xl ${
                  profile.is_student_verified && profile.reg_no
                    ? "bg-white/5 opacity-60 cursor-not-allowed"
                    : isDark ? "bg-white/5" : "bg-black/5"
                } border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>
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
                  className={`flex-1 h-10 px-3.5 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-bold outline-none focus:border-[#FFC554]`}
                />
              </div>
              <p className={`text-[9px] font-medium ${mutedText} opacity-70`}>
                Only shared with confirmed co-passengers in your rides for pickups.
              </p>
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

        {/* Notifications Setting */}
        <div
          className={`p-3.5 ${cardBg} border ${border} rounded-[24px] flex items-center justify-between w-full shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl ${
                notifEnabled
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-white/5 text-zinc-400"
              } flex items-center justify-center transition-colors`}
            >
              <Bell size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Alerts</p>
              <p className={`text-xs font-bold ${text}`}>Ride Notifications</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifEnabled && (
              <button
                type="button"
                onClick={handleTestAlert}
                aria-label="Test Notification"
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-white/5 hover:bg-white/10 text-[#FFC554] border border-white/10 active:scale-95 transition-all cursor-pointer"
              >
                Test 🔔
              </button>
            )}

            {/* iOS/Android Style Pill Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              aria-label="Toggle Ride Notifications"
              onClick={handleToggleNotifications}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none flex items-center cursor-pointer ${
                notifEnabled
                  ? "bg-[#FFC554] justify-end"
                  : isDark
                  ? "bg-white/15 justify-start"
                  : "bg-black/15 justify-start"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full transition-all shadow-sm ${
                  notifEnabled ? "bg-black" : "bg-zinc-400"
                }`}
              />
            </button>
          </div>
        </div>

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
