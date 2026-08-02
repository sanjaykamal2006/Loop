"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { View, Loop, Profile, ThemeClasses } from "@/lib/types";

interface LoopContextValue {
  // Session
  session: Session;

  // Navigation
  view: View;
  setView: (v: View) => void;
  selectedLoop: Loop | null;
  setSelectedLoop: (l: Loop | null) => void;

  // Theme
  theme: ThemeClasses;
  themeTransition: { active: boolean, nextTheme: 'dark' | 'light' } | null;
  toggleTheme: () => void;

  // Profile
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  handleSignOut: () => Promise<void>;

  // Loops
  activeLoops: Loop[];
  fetchLoops: () => Promise<void>;
  userJoinedLoops: string[];
  userLoops: string[];
  fetchUserMemberships: () => Promise<void>;

  // Actions
  joinLoop: (loop: Loop) => Promise<void>;
  deleteLoop: (loopId: string) => Promise<void>;
  leaveLoop: (loopId: string) => Promise<void>;
  isJoining: boolean;

  // Gender guard
  showGenderSelect: boolean;
  setShowGenderSelect: (v: boolean) => void;
  pendingAction: { type: "create" | "join"; data?: Loop } | null;
  setPendingAction: (a: { type: "create" | "join"; data?: Loop } | null) => void;

  // Utility
  formatTime: (iso: string) => string;
}

const LoopContext = createContext<LoopContextValue | null>(null);

export function useLoop() {
  const ctx = useContext(LoopContext);
  if (!ctx) throw new Error("useLoop must be used within LoopProvider");
  return ctx;
}

export function LoopProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [view, setViewState] = useState<View>("home");
  const [activeLoops, setActiveLoops] = useState<Loop[]>([]);
  const [selectedLoop, setSelectedLoop] = useState<Loop | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [userJoinedLoops, setUserJoinedLoops] = useState<string[]>([]);
  const [userLoops, setUserLoops] = useState<string[]>([]);

  // Profile
  const [profile, setProfile] = useState<Profile>({ display_name: "", theme: "dark" });

  // Gender guard
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "create" | "join"; data?: Loop } | null>(null);

  // --- Browser back button support ---
  const setView = useCallback((v: View) => {
    setViewState(v);
    window.history.pushState({ view: v }, "", "");
  }, []);

  useEffect(() => {
    // Set initial history state
    window.history.replaceState({ view: "home" }, "", "");

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view) {
        setViewState(e.state.view);
      } else {
        setViewState("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // --- Theme ---
  const isDark = profile.theme === "dark";
  const theme: ThemeClasses = {
    isDark,
    bg: isDark ? "bg-[#000000] transition-colors duration-1000" : "bg-[#EFE9DF] transition-colors duration-1000",
    text: isDark ? "text-white transition-colors duration-1000" : "text-[#3D3B38] transition-colors duration-1000",
    border: isDark ? "border-[#27272A] transition-colors duration-1000" : "border-[#DED8CE] transition-colors duration-1000",
    cardBg: isDark ? "bg-[#121212] transition-colors duration-1000" : "bg-[#F8F6F0] transition-colors duration-1000",
    mutedText: isDark ? "text-[#A1A1AA] transition-colors duration-1000" : "text-[#7C7872] transition-colors duration-1000",
  };

  const [themeTransition, setThemeTransition] = useState<{ active: boolean, nextTheme: 'dark' | 'light' } | null>(null);

  const toggleTheme = () => {
    const nextTheme = profile.theme === "dark" ? "light" : "dark";
    updateProfile({ theme: nextTheme });
  };

  // --- Fetch profile ---
  const fetchProfile = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, theme, gender, reg_no, avatar_url")
      .eq("id", session.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      const defaultName = session.user.email?.split("@")[0] || "User";
      await supabase.from("profiles").upsert({
        id: session.user.id,
        display_name: defaultName,
        theme: "dark",
        updated_at: new Date().toISOString(),
      });
      setProfile({ display_name: defaultName, theme: "dark", gender: undefined, reg_no: "", avatar_url: undefined });
      return;
    }

    if (!error && data) {
      const name = data.display_name || session.user.email?.split("@")[0] || "User";
      setProfile({
        display_name: name,
        theme: (data.theme as "dark" | "light") || "dark",
        gender: data.gender,
        reg_no: data.reg_no || "",
        avatar_url: data.avatar_url,
      });
    }
  }, [session.user.id, session.user.email]);

  // --- Update profile ---
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "id" });

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      setProfile((prev) => ({ ...prev, ...updates }));
      if (updates.display_name !== undefined || updates.reg_no !== undefined) {
        toast.success("Profile updated!");
      }

      if (updates.gender && pendingAction) {
        if (pendingAction.type === "create") {
          // The CreateView will handle creation after gender is set
        } else if (pendingAction.type === "join" && pendingAction.data) {
          joinLoop(pendingAction.data);
        }
        setPendingAction(null);
        setShowGenderSelect(false);
      }
    }
  }, [session.user.id, pendingAction]);

  // --- Fetch loops ---
  const fetchLoops = useCallback(async () => {
    const { data: profileData } = await supabase
      .from("profiles").select("gender").eq("id", session.user.id).single();
    const userGender = profileData?.gender;

    const { data, error } = await supabase
      .from("loops")
      .select("*, loop_members(count)")
      .in("status", ["active", "in_progress"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      const filtered = data.filter((l: any) => {
        if (l.creator_id === session.user.id) return true;
        if (l.is_female_only && userGender !== "female") return false;
        return true;
      });
      setActiveLoops(filtered.map((l: any) => ({ ...l, member_count: l.loop_members?.[0]?.count || 0 })));
    }
  }, [session.user.id]);

  // --- Fetch memberships ---
  const fetchUserMemberships = useCallback(async () => {
    const { data } = await supabase.from("loop_members").select("loop_id").eq("user_id", session.user.id);
    if (data) setUserJoinedLoops(data.map((m: any) => m.loop_id));

    const { data: creatorData } = await supabase.from("loops").select("id").eq("creator_id", session.user.id);
    if (creatorData) setUserLoops(creatorData.map((l: any) => l.id));
  }, [session.user.id]);

  // --- Join loop ---
  const joinLoop = useCallback(async (loop: Loop) => {
    if (!profile.gender) {
      setPendingAction({ type: "join", data: loop });
      setShowGenderSelect(true);
      return;
    }
    if ((loop.member_count || 0) >= loop.participants_limit) {
      toast.error("Loop is full!");
      return;
    }
    setIsJoining(true);
    const { error } = await supabase.from("loop_members").insert({ loop_id: loop.id, user_id: session.user.id });
    if (error) {
      toast.error("Failed to join loop");
    } else {
      toast.success("Joined loop!");
      setUserJoinedLoops((prev) => [...prev, loop.id]);
      fetchLoops();
      setSelectedLoop(loop);
      setView("chat");
    }
    setIsJoining(false);
  }, [profile.gender, session.user.id, fetchLoops]);

  // --- Delete loop ---
  const deleteLoop = useCallback(async (loopId: string) => {
    const { error } = await supabase.from("loops").update({ status: "cancelled" }).eq("id", loopId);
    if (error) toast.error("Failed to delete loop");
    else {
      toast.success("Loop deleted");
      setView("home");
      fetchLoops();
    }
  }, [fetchLoops]);

  // --- Leave loop ---
  const leaveLoop = useCallback(async (loopId: string) => {
    const { error } = await supabase.from("loop_members").delete().eq("loop_id", loopId).eq("user_id", session.user.id);
    if (error) toast.error("Failed to leave loop");
    else {
      toast.success("Left loop");
      setUserJoinedLoops((prev) => prev.filter((id) => id !== loopId));
      setView("home");
      fetchLoops();
    }
  }, [session.user.id, fetchLoops]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: "global" });
    // Force reload as fallback — some desktop browsers don't fire the auth state change
    window.location.reload();
  }, []);

  const formatTime = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }, []);

  // --- Initial data load + realtime subscription ---
  useEffect(() => {
    fetchProfile();
    fetchLoops();
    fetchUserMemberships();

    const loopsSubscription = supabase
      .channel("loops-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "loops" }, () => {
        fetchLoops();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(loopsSubscription);
    };
  }, [fetchProfile, fetchLoops, fetchUserMemberships]);

  const value: LoopContextValue = {
    session,
    view,
    setView,
    selectedLoop,
    setSelectedLoop,
    theme,
    themeTransition,
    toggleTheme,
    profile,
    updateProfile,
    handleSignOut,
    activeLoops,
    fetchLoops,
    userJoinedLoops,
    userLoops,
    fetchUserMemberships,
    joinLoop,
    deleteLoop,
    leaveLoop,
    isJoining,
    showGenderSelect,
    setShowGenderSelect,
    pendingAction,
    setPendingAction,
    formatTime,
  };

  return <LoopContext.Provider value={value}>{children}</LoopContext.Provider>;
}
