"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Profile, ThemeClasses, AppTheme } from "@/lib/types";
import { preloadAvatars } from "@/lib/imageOptimization";
import { parseStudentEmail } from "@/lib/studentParser";
import { toast } from "@/components/ui/NativeToast";
import { clearUserStorage } from "@/lib/storage";

interface UseAuthSessionOptions {
  session: Session;
}

export function useAuthSession({ session }: UseAuthSessionOptions) {
  // Profile state
  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_profile_${session.user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.avatar_url) preloadAvatars([parsed.avatar_url]);
          return parsed;
        }
      } catch (err) { logger.error("src/lib/hooks/useAuthSession.ts: swallowed non-fatal error", err); }
    }
    return { display_name: "", theme: "dark" };
  });

  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Theme calculations
  const isPaper = profile.theme === "paper";
  const isDark = profile.theme === "dark";
  const activeTheme: AppTheme = profile.theme || "dark";

  const theme: ThemeClasses = {
    isDark,
    isPaper,
    activeTheme,
    bg: isPaper ? "bg-[#F8F5EE]" : isDark ? "bg-[#000000]" : "bg-[#F2EFE9]",
    text: isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-[#1C1917]",
    border: isPaper ? "border-[#8E887F]/40" : isDark ? "border-[#27272A]" : "border-[#DFD9CE]",
    cardBg: isPaper ? "bg-[#FBF6E9]" : isDark ? "bg-[#121212]" : "bg-[#FAF8F5]",
    mutedText: isPaper ? "text-[#6B6660]" : isDark ? "text-[#A1A1AA]" : "text-[#57534E]",
    accentText: isPaper ? "text-[#B48208]" : isDark ? "text-[#FFC554]" : "text-[#881337]",
    accentBg: isPaper ? "bg-[#FFC554]" : isDark ? "bg-[#FFC554]" : "bg-[#881337]",
    accentBgSubtle: isPaper ? "bg-[#F8DC4C]/35" : isDark ? "bg-[#FFC554]/15" : "bg-[#881337]/10",
    accentBorder: isPaper ? "border-[#2A2420]" : isDark ? "border-[#FFC554]" : "border-[#881337]",
    accentBorderSubtle: isPaper ? "border-[#8E887F]/50" : isDark ? "border-[#FFC554]/30" : "border-[#881337]/30",
    primaryBtn: isPaper
      ? "bg-[#FFC554] text-[#2A2420] border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
      : isDark
      ? "bg-[#FFC554] text-black"
      : "bg-[#881337] text-white",
    accentColor: isPaper ? "#FFC554" : isDark ? "#FFC554" : "#881337",
  };

  const [themeTransition, setThemeTransition] = useState<{ active: boolean; nextTheme: "dark" | "light" | "paper" } | null>(null);

  // Synchronize mobile notification/status bar theme-color & html/body class
  useEffect(() => {
    if (typeof document === "undefined") return;
    const targetColor = isPaper ? "#F8F5EE" : isDark ? "#000000" : "#ffffff";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", targetColor);

    document.documentElement.classList.remove("theme-dark", "theme-light", "theme-paper");
    document.body.classList.remove("theme-dark", "theme-light", "theme-paper");
    document.documentElement.classList.add(`theme-${activeTheme}`);
    document.body.classList.add(`theme-${activeTheme}`);
  }, [activeTheme, isDark, isPaper]);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    const [profRes, contactRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, theme, gender, reg_no, avatar_url, bio, is_student_verified")
        .eq("id", session.user.id)
        .single(),
      supabase
        .from("profile_contacts")
        .select("phone_number")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);

    const { data, error } = profRes;
    const userPhone = contactRes.data?.phone_number || "";

    if (error && error.code === "PGRST116") {
      const parsed = parseStudentEmail(session.user.email || "");
      const defaultName = parsed.displayName || session.user.email?.split("@")[0] || "User";
      const defaultRegNo = parsed.regNo || "";
      const isStudent = parsed.isStudentDomain;

      await supabase.from("profiles").upsert({
        id: session.user.id,
        display_name: defaultName,
        reg_no: defaultRegNo,
        is_student_verified: isStudent,
        theme: "dark",
        updated_at: new Date().toISOString(),
      });
      const newProf: Profile = {
        display_name: defaultName,
        theme: "dark",
        gender: undefined,
        reg_no: defaultRegNo,
        avatar_url: undefined,
        bio: "",
        phone_number: "",
        is_student_verified: isStudent,
      };
      setProfile(newProf);
      try {
        localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(newProf));
      } catch (err) { logger.error("src/lib/hooks/useAuthSession.ts: swallowed non-fatal error", err); }
      setIsProfileLoaded(true);
      return;
    }

    if (!error && data) {
      let name = data.display_name;
      let regNo = data.reg_no || "";
      let isStudent = data.is_student_verified;

      // If user signed up with college email but reg_no or clean name isn't set yet, auto-populate it
      if ((!regNo || !name || name.includes("@")) && session.user.email) {
        const parsed = parseStudentEmail(session.user.email);
        if (!regNo && parsed.regNo) regNo = parsed.regNo;
        if ((!name || name.includes("@")) && parsed.displayName) name = parsed.displayName;
        if (isStudent === undefined || isStudent === null) isStudent = parsed.isStudentDomain;

        supabase
          .from("profiles")
          .update({
            display_name: name,
            reg_no: regNo,
            is_student_verified: isStudent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id)
          .then();
      }

      const newProf: Profile = {
        display_name: name || session.user.email?.split("@")[0] || "User",
        theme: (data.theme as "dark" | "light") || "dark",
        gender: data.gender,
        reg_no: regNo,
        avatar_url: data.avatar_url,
        bio: data.bio || "",
        phone_number: userPhone,
        is_student_verified: Boolean(isStudent),
      };
      setProfile(newProf);
      if (newProf.avatar_url) {
        preloadAvatars([newProf.avatar_url]);
      }
      try {
        localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(newProf));
      } catch (err) { logger.error("src/lib/hooks/useAuthSession.ts: swallowed non-fatal error", err); }
    }
    setIsProfileLoaded(true);
  }, [session.user.id, session.user.email]);

  // Update profile
  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<boolean> => {
      // Optimistically update local state & cache instantly
      const prevProfile = profileRef.current;
      const nextProfile = { ...prevProfile, ...updates };
      setProfile(nextProfile);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(nextProfile));
        } catch (err) { logger.error("src/lib/hooks/useAuthSession.ts: swallowed non-fatal error", err); }
      }

      const phone_number = updates.phone_number;
      const profileUpdates: Partial<Database["public"]["Tables"]["profiles"]["Insert"]> = {};
      if (updates.display_name !== undefined) profileUpdates.display_name = updates.display_name;
      if (updates.theme !== undefined) profileUpdates.theme = updates.theme;
      if (updates.gender !== undefined) profileUpdates.gender = updates.gender;
      if (updates.reg_no !== undefined) profileUpdates.reg_no = updates.reg_no;
      if (updates.avatar_url !== undefined) profileUpdates.avatar_url = updates.avatar_url;
      if (updates.bio !== undefined) profileUpdates.bio = updates.bio;
      if (updates.is_student_verified !== undefined) profileUpdates.is_student_verified = updates.is_student_verified;

      const promises: PromiseLike<{ error?: unknown }>[] = [];

      if (Object.keys(profileUpdates).length > 0) {
        promises.push(
          supabase
            .from("profiles")
            .upsert({ id: session.user.id, ...profileUpdates, updated_at: new Date().toISOString() }, { onConflict: "id" })
        );
      }

      if (phone_number !== undefined) {
        const digits = (phone_number || "").replace(/\D/g, "");
        const cleanPhone =
          digits.length === 12 && digits.startsWith("91")
            ? digits.slice(2)
            : digits.length === 11 && digits.startsWith("0")
              ? digits.slice(1)
              : digits.slice(0, 10);
        if (cleanPhone) {
          promises.push(
            supabase
              .from("profile_contacts")
              .upsert(
                { user_id: session.user.id, phone_number: cleanPhone, updated_at: new Date().toISOString() },
                { onConflict: "user_id" }
              )
          );
        } else {
          promises.push(
            supabase.from("profile_contacts").delete().eq("user_id", session.user.id)
          );
        }
      }

      const results = await Promise.all(promises);
      const dbError = (results as { error?: unknown }[]).find((r) => r?.error)?.error;

      if (dbError) {
        // Revert on error
        setProfile(prevProfile);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(prevProfile));
          } catch (err) { logger.error("src/lib/hooks/useAuthSession.ts: swallowed non-fatal error", err); }
        }
        toast.error("Failed to update profile. Please try again.");
        return false;
      } else {
        if (
          updates.display_name !== undefined ||
          updates.reg_no !== undefined ||
          updates.bio !== undefined ||
          updates.phone_number !== undefined
        ) {
          toast.success("Profile updated!");
        }
        return true;
      }
    },
    [session.user.id]
  );

  const toggleTheme = useCallback(() => {
    const current = profileRef.current.theme;
    const nextTheme: AppTheme = current === "dark" ? "light" : current === "light" ? "paper" : "dark";
    updateProfile({ theme: nextTheme });
  }, [updateProfile]);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    updateProfile({ theme: nextTheme });
  }, [updateProfile]);

  const handleSignOut = useCallback(async () => {
    // Remove every app-owned cache (profile, messages, members, emergency
    // contacts, legacy offline session, …) so a shared device cannot leak the
    // signed-out user's data to the next account that logs in.
    clearUserStorage();
    await supabase.auth.signOut({ scope: "global" });
    // Force reload as fallback — some desktop browsers don't fire the auth state change
    window.location.reload();
  }, []);

  return {
    profile,
    profileRef,
    isProfileLoaded,
    fetchProfile,
    updateProfile,
    theme,
    themeTransition,
    setThemeTransition,
    toggleTheme,
    setTheme,
    handleSignOut,
  };
}
