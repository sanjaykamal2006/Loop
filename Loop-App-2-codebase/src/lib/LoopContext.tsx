"use client";

import { logger } from "@/lib/logger";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/NativeToast";
import type { View, Loop, Profile, ThemeClasses, EmergencyContact } from "@/lib/types";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { useEmergencySos } from "@/lib/hooks/useEmergencySos";
import { useLoopDirectory } from "@/lib/hooks/useLoopDirectory";

export interface LoopContextValue {
  // Session
  session: Session;

  // Navigation
  view: View;
  setView: (v: View) => void;
  selectedLoop: Loop | null;
  setSelectedLoop: (l: Loop | null) => void;

  // Theme
  theme: ThemeClasses;
  themeTransition: { active: boolean; nextTheme: "dark" | "light" } | null;
  toggleTheme: () => void;

  // Profile
  profile: Profile;
  isProfileLoaded: boolean;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  handleSignOut: () => Promise<void>;

  // Loops
  activeLoops: Loop[];
  fetchLoops: (force?: boolean) => Promise<void>;
  userJoinedLoops: string[];
  userLoops: string[];
  fetchUserMemberships: (force?: boolean) => Promise<void>;

  // Actions
  registerCreatedLoop: (loop: Loop) => void;
  joinLoop: (loop: Loop, profileOverride?: Partial<Profile>) => Promise<void>;
  deleteLoop: (loopId: string) => Promise<void>;
  leaveLoop: (loopId: string) => Promise<void>;
  isJoining: boolean;
  isDeleting: boolean;

  // Gender guard
  showGenderSelect: boolean;
  setShowGenderSelect: (v: boolean) => void;
  pendingAction: { type: "create" | "join"; data?: Loop } | null;
  setPendingAction: (a: { type: "create" | "join"; data?: Loop } | null) => void;

  // Utility
  formatTime: (iso: string) => string;
  chatSource: "ride-details" | "chat-list";
  setChatSource: (s: "ride-details" | "chat-list") => void;

  // Messages & notifications
  unreadLoopIds: string[];
  markLoopAsRead: (loopId: string) => void;

  // Return trip prefill
  createPrefill: { startPoint?: string; destination?: string; isReturn?: boolean } | null;
  setCreatePrefill: (p: { startPoint?: string; destination?: string; isReturn?: boolean } | null) => void;

  // Emergency SOS & Safety
  emergencyContact: EmergencyContact | null;
  emergencyContacts: EmergencyContact[];
  saveEmergencyContact: (contact: EmergencyContact | null) => void;
  saveEmergencyContacts: (contacts: EmergencyContact[]) => void;
  showSosModal: boolean;
  setShowSosModal: (show: boolean) => void;
  showEmergencyContactModal: boolean;
  setShowEmergencyContactModal: (show: boolean) => void;
  triggerSos: () => void;

  // Declarative Modals & Search Controls
  showTermsModal: boolean;
  setShowTermsModal: (show: boolean) => void;
  showTeluguGuideModal: boolean;
  setShowTeluguGuideModal: (show: boolean) => void;
  showCreatorModal: boolean;
  setShowCreatorModal: (show: boolean) => void;
  showBuyCoffeeModal: boolean;
  setShowBuyCoffeeModal: (show: boolean) => void;
  isMessageSearchOpen: boolean;
  setIsMessageSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMessageSearch: () => void;
  isChatSearchOpen: boolean;
  setIsChatSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleChatSearch: () => void;
}

const LoopContext = createContext<LoopContextValue | null>(null);

export function useLoop() {
  const ctx = useContext(LoopContext);
  if (!ctx) throw new Error("useLoop must be used within LoopProvider");
  return ctx;
}

export function LoopProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [view, setViewState] = useState<View>("home");
  const [selectedLoop, setSelectedLoopState] = useState<Loop | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("loop_selected_loop");
        if (cached) return JSON.parse(cached);
      } catch (err) { logger.error("src/lib/LoopContext.tsx: swallowed non-fatal error", err); }
    }
    return null;
  });

  const [unreadLoopIds, setUnreadLoopIds] = useState<string[]>([]);
  const [chatSource, setChatSource] = useState<"ride-details" | "chat-list">("ride-details");
  const [createPrefill, setCreatePrefill] = useState<{ startPoint?: string; destination?: string; isReturn?: boolean } | null>(null);

  // Declarative Modals & Search Controls State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTeluguGuideModal, setShowTeluguGuideModal] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showBuyCoffeeModal, setShowBuyCoffeeModal] = useState(false);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);

  const toggleMessageSearch = useCallback(() => {
    setIsMessageSearchOpen((prev) => !prev);
  }, []);

  const toggleChatSearch = useCallback(() => {
    setIsChatSearchOpen((prev) => !prev);
  }, []);

  const setSelectedLoop = useCallback((loop: Loop | null) => {
    setSelectedLoopState(loop);
    if (loop?.id) {
      setUnreadLoopIds((prev) => prev.filter((id) => id !== loop.id));
    }
    if (typeof window !== "undefined") {
      try {
        if (loop) {
          localStorage.setItem("loop_selected_loop", JSON.stringify(loop));
        } else {
          localStorage.removeItem("loop_selected_loop");
        }
      } catch (err) { logger.error("src/lib/LoopContext.tsx: swallowed non-fatal error", err); }
    }
  }, []);

  const markLoopAsRead = useCallback((loopId: string) => {
    setUnreadLoopIds((prev) => prev.filter((id) => id !== loopId));
  }, []);

  // Auth & Profile & Theme hook
  const {
    profile,
    profileRef,
    isProfileLoaded,
    fetchProfile,
    updateProfile,
    theme,
    themeTransition,
    toggleTheme,
    handleSignOut,
  } = useAuthSession({ session });

  // Browser navigation & Deep link handler
  const setView = useCallback((v: View) => {
    setViewState(v);
    window.history.pushState({ view: v }, "", "");
  }, []);

  const selectedLoopRef = useRef(selectedLoop);
  useEffect(() => {
    selectedLoopRef.current = selectedLoop;
  }, [selectedLoop]);

  useEffect(() => {
    // Check for deep-linked loop (?loop=<id>)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const deepLoopId = params.get("loop");

      if (deepLoopId) {
        (async () => {
          const { data, error } = await supabase
            .from("loops")
            .select("*, loop_members(count), creator:profiles!fk_loops_creator_id(display_name, avatar_url, reg_no)")
            .eq("id", deepLoopId)
            .single();

          if (data && !error) {
            // Check if ride has ended, cancelled, or expired
            const isEnded = ["cancelled", "ended", "expired"].includes(data.status || "");
            const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
            const isOld = Date.now() - new Date(data.departure_time || "").getTime() > 2 * 60 * 60 * 1000;
            if (isEnded || isExpired || isOld) {
              toast.info("This ride has already ended or expired.");
              setViewState("home");
              window.history.replaceState({ view: "home" }, "", window.location.pathname);
              return;
            }

            // Check female-only restriction
            if (data.is_female_only && data.creator_id !== session.user.id) {
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("gender")
                .eq("id", session.user.id)
                .maybeSingle();

              if (userProfile && userProfile.gender && userProfile.gender !== "female") {
                toast.error("This ride is restricted to female students only.");
                setViewState("home");
                window.history.replaceState({ view: "home" }, "", window.location.pathname);
                return;
              }
            }

            const formatted: Loop = {
              ...data,
              creator_id: data.creator_id || "",
              departure_time: data.departure_time || "",
              created_at: data.created_at || "",
              is_female_only: Boolean(data.is_female_only),
              member_count: (data.loop_members as unknown as { count: number }[])?.[0]?.count || 0,
            } as Loop;
            setSelectedLoop(formatted);
            setViewState("ride-details");
            window.history.replaceState({ view: "ride-details" }, "", window.location.pathname);
            return;
          }
          window.history.replaceState({ view: "home" }, "", window.location.pathname);
        })();
      } else {
        window.history.replaceState({ view: "home" }, "", "");
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view) {
        if ((e.state.view === "chat" || e.state.view === "ride-details") && !selectedLoopRef.current) {
          setViewState("home");
          return;
        }
        setViewState(e.state.view);
      } else {
        setViewState("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setSelectedLoop, session.user.id]);

  // Loop directory & memberships hook
  const {
    activeLoops,
    userJoinedLoops,
    userLoops,
    isJoining,
    isDeleting,
    showGenderSelect,
    setShowGenderSelect,
    pendingAction,
    setPendingAction,
    fetchLoops,
    fetchUserMemberships,
    registerCreatedLoop,
    joinLoop,
    deleteLoop,
    leaveLoop,
  } = useLoopDirectory({
    session,
    profile,
    profileRef,
    fetchProfile,
    view,
    setView,
    selectedLoop,
    setSelectedLoop,
    setSelectedLoopState,
    setChatSource,
    setUnreadLoopIds,
  });

  // Emergency SOS hook
  const {
    emergencyContact,
    emergencyContacts,
    saveEmergencyContact,
    saveEmergencyContacts,
    showSosModal,
    setShowSosModal,
    showEmergencyContactModal,
    setShowEmergencyContactModal,
    triggerSos,
  } = useEmergencySos({
    session,
    activeLoops,
    userJoinedLoops,
    userLoops,
    selectedLoop,
  });

  const formatTime = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }, []);

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
    isProfileLoaded,
    updateProfile,
    handleSignOut,
    activeLoops,
    fetchLoops,
    userJoinedLoops,
    userLoops,
    fetchUserMemberships,
    registerCreatedLoop,
    joinLoop,
    deleteLoop,
    leaveLoop,
    isJoining,
    isDeleting,
    showGenderSelect,
    setShowGenderSelect,
    pendingAction,
    setPendingAction,
    formatTime,
    chatSource,
    setChatSource,
    unreadLoopIds,
    markLoopAsRead,
    createPrefill,
    setCreatePrefill,
    emergencyContact,
    emergencyContacts,
    saveEmergencyContact,
    saveEmergencyContacts,
    showSosModal,
    setShowSosModal,
    showEmergencyContactModal,
    setShowEmergencyContactModal,
    triggerSos,
    showTermsModal,
    setShowTermsModal,
    showTeluguGuideModal,
    setShowTeluguGuideModal,
    showCreatorModal,
    setShowCreatorModal,
    showBuyCoffeeModal,
    setShowBuyCoffeeModal,
    isMessageSearchOpen,
    setIsMessageSearchOpen,
    toggleMessageSearch,
    isChatSearchOpen,
    setIsChatSearchOpen,
    toggleChatSearch,
  };

  return <LoopContext.Provider value={value}>{children}</LoopContext.Provider>;
}
