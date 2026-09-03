"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/NativeToast";
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
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  handleSignOut: () => Promise<void>;

  // Loops
  activeLoops: Loop[];
  fetchLoops: () => Promise<void>;
  userJoinedLoops: string[];
  userLoops: string[];
  fetchUserMemberships: () => Promise<void>;

  // Actions
  joinLoop: (loop: Loop, profileOverride?: Partial<Profile>) => Promise<void>;
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
  chatSource: "ride-details" | "chat-list";
  setChatSource: (s: "ride-details" | "chat-list") => void;
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
  const [chatSource, setChatSource] = useState<"ride-details" | "chat-list">("ride-details");

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
    bg: isDark ? "bg-[#000000]" : "bg-[#EFE9DF]",
    text: isDark ? "text-white" : "text-[#3D3B38]",
    border: isDark ? "border-[#27272A]" : "border-[#DED8CE]",
    cardBg: isDark ? "bg-[#121212]" : "bg-[#F8F6F0]",
    mutedText: isDark ? "text-[#A1A1AA]" : "text-[#7C7872]",
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
      .select("display_name, theme, gender, reg_no, avatar_url, bio")
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
      setProfile({ display_name: defaultName, theme: "dark", gender: undefined, reg_no: "", avatar_url: undefined, bio: "" });
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
        bio: data.bio || "",
      });
    }
  }, [session.user.id, session.user.email]);

  // --- Update profile ---
  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<boolean> => {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "id" });

    if (error) {
      toast.error("Failed to update profile. Please try again.");
      return false;
    } else {
      setProfile((prev) => ({ ...prev, ...updates }));
      if (updates.display_name !== undefined || updates.reg_no !== undefined || updates.bio !== undefined) {
        toast.success("Profile updated!");
      }
      return true;
    }
  }, [session.user.id]);

  // --- Fetch loops ---
  const fetchLoops = useCallback(async () => {
    try {
      // Automatically trigger database expiration for old loops (> 5 hours)
      await supabase.rpc("expire_old_loops");
    } catch {
      // Ignore background RPC errors
    }

    const { data: profileData } = await supabase
      .from("profiles").select("gender").eq("id", session.user.id).single();
    const userGender = profileData?.gender;

    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("loops")
      .select("*, loop_members(count)")
      .in("status", ["open", "started", "active", "in_progress"])
      .gte("created_at", fiveHoursAgo)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const now = new Date();
      const filtered = data.filter((l: any) => {
        // Enforce 5-hour cutoff on created_at and departure_time
        const createdAt = new Date(l.created_at);
        if (now.getTime() - createdAt.getTime() > 5 * 60 * 60 * 1000) return false;

        if (l.expires_at && new Date(l.expires_at) < now) return false;

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
  const joinLoop = useCallback(async (loop: Loop, profileOverride?: Partial<Profile>) => {
    const currentGender = profileOverride?.gender || profile.gender;
    const currentName = profileOverride?.display_name || profile.display_name;
    const currentReg = profileOverride?.reg_no || profile.reg_no;

    if (!currentGender || !currentName || !currentReg) {
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
      if (error.code === "23505") { // Unique constraint violation = already in loop
        setUserJoinedLoops((prev) => Array.from(new Set([...prev, loop.id])));
        setSelectedLoop(loop);
        setView("chat");
      } else {
        toast.error("Failed to join loop. Please try again.");
      }
    } else {
      toast.success("Joined loop!");
      setUserJoinedLoops((prev) => Array.from(new Set([...prev, loop.id])));
      const newCount = (loop.member_count || 0) + 1;
      const updatedLoop = { ...loop, member_count: newCount };
      setSelectedLoop(updatedLoop);
      setActiveLoops(prev => prev.map(l => l.id === loop.id ? updatedLoop : l));
      fetchLoops();
      setView("chat");
    }
    setIsJoining(false);
  }, [profile, session.user.id, fetchLoops]);

  // Resume joining after profile is set
  useEffect(() => {
    if (pendingAction?.type === "join" && profile.gender && profile.display_name && profile.reg_no && !showGenderSelect) {
      if (pendingAction.data) {
        joinLoop(pendingAction.data);
      }
      setPendingAction(null);
    }
  }, [profile.gender, profile.display_name, profile.reg_no, showGenderSelect, pendingAction, joinLoop]);

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
      if (selectedLoop && selectedLoop.id === loopId) {
        const newCount = Math.max(0, (selectedLoop.member_count || 1) - 1);
        setSelectedLoop({ ...selectedLoop, member_count: newCount });
        setActiveLoops(prev => prev.map(l => l.id === loopId ? { ...l, member_count: newCount } : l));
      }
      setView("home");
      fetchLoops();
    }
  }, [session.user.id, selectedLoop, fetchLoops]);

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

    const globalRealtimeChannel = supabase
      .channel("global-app-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loops" }, () => {
        fetchLoops();
        fetchUserMemberships();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "loop_members" }, () => {
        fetchLoops();
        fetchUserMemberships();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalRealtimeChannel);
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
    chatSource,
    setChatSource,
  };

  return <LoopContext.Provider value={value}>{children}</LoopContext.Provider>;
}
