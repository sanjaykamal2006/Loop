"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import { compressAvatarImage } from "@/lib/imageOptimization";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
import {
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  requestNotificationPermission,
  sendLocalNotification,
} from "@/lib/notifications";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileEditCard from "@/components/profile/ProfileEditCard";
import ProfileDetailsCard from "@/components/profile/ProfileDetailsCard";
import ProfileQuickActionsCard from "@/components/profile/ProfileQuickActionsCard";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";

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
  const { isDark, border, cardBg, mutedText } = theme;

  const [tempName, setTempName] = useState(profile.display_name);
  const [tempRegNo, setTempRegNo] = useState(profile.reg_no || "");
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempPhone, setTempPhone] = useState(profile.phone_number || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [, setNotifPermission] = useState<NotificationPermission>("default");
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
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
    } catch (err: unknown) {
      logger.error("Avatar upload error:", err);
      setOptimisticAvatarUrl(null); // Revert optimistic preview on error
      const message = err instanceof Error ? err.message : "Failed to upload image. Please try again.";
      toast.error(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const activeAvatar = optimisticAvatarUrl || profile.avatar_url;

  return (
    <div className="flex-1 flex flex-col space-y-3.5 sm:space-y-4 pt-1.5 pb-2 min-w-0">
      {/* 1. Centered Profile Hero */}
      <ProfileHero
        profile={profile}
        email={session.user.email}
        activeAvatar={activeAvatar}
        isUploading={isUploading}
        onAvatarUpload={handleAvatarUpload}
        isEditingProfile={isEditingProfile}
        onStartEdit={() => setIsEditingProfile(true)}
        isDark={isDark}
        mutedText={mutedText}
      />

      {/* 2. Edit Profile Form (Expanded When Editing) */}
      {isEditingProfile && (
        <ProfileEditCard
          profile={profile}
          tempName={tempName}
          setTempName={setTempName}
          tempRegNo={tempRegNo}
          setTempRegNo={setTempRegNo}
          tempPhone={tempPhone}
          setTempPhone={setTempPhone}
          tempBio={tempBio}
          setTempBio={setTempBio}
          onCancel={() => setIsEditingProfile(false)}
          onSave={handleSaveProfile}
          email={session.user.email}
          cardBg={cardBg}
          border={border}
          mutedText={mutedText}
          isDark={isDark}
        />
      )}

      {/* 3. Details Card (WhatsApp, Bio, Gender) */}
      <ProfileDetailsCard
        profile={profile}
        onAddPhone={() => setIsEditingProfile(true)}
        onSelectGender={(gender) => updateProfile({ gender })}
        cardBg={cardBg}
        border={border}
        mutedText={mutedText}
        isDark={isDark}
      />

      {/* 4. Quick Actions & Preferences Card */}
      <ProfileQuickActionsCard
        onNavigate={(targetView) => setView(targetView)}
        notifEnabled={notifEnabled}
        onToggleNotifications={handleToggleNotifications}
        onTestAlert={handleTestAlert}
        toggleTheme={toggleTheme}
        cardBg={cardBg}
        border={border}
        isDark={isDark}
      />

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
      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        cardBg={cardBg}
        border={border}
        mutedText={mutedText}
        isDark={isDark}
      />
    </div>
  );
}
