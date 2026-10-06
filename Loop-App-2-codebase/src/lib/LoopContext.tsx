"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/NativeToast";
import type { View, Loop, Profile, ThemeClasses, EmergencyContact } from "@/lib/types";
import { registerServiceWorker, sendLocalNotification } from "./notifications";
import { parseStudentEmail } from "./studentParser";
import { preloadAvatars } from "./imageOptimization";
import { triggerHaptic } from "./haptics";
import { sanitizeIndianPhoneNumber } from "./utils";

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
  const [activeLoops, setActiveLoops] = useState<Loop[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("loop_active_loops_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [selectedLoop, setSelectedLoopState] = useState<Loop | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("loop_selected_loop");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

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
      } catch {}
    }
  }, []);
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userJoinedLoops, setUserJoinedLoops] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_joined_loops_${session.user.id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [userLoops, setUserLoops] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_created_loops_${session.user.id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  // Profile
  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_profile_${session.user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.avatar_url) preloadAvatars([parsed.avatar_url]);
          return parsed;
        }
      } catch {}
    }
    return { display_name: "", theme: "dark" };
  });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Gender guard
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "create" | "join"; data?: Loop } | null>(null);
  const [chatSource, setChatSource] = useState<"ride-details" | "chat-list">("ride-details");
  const [unreadLoopIds, setUnreadLoopIds] = useState<string[]>([]);
  const markLoopAsRead = useCallback((loopId: string) => {
    setUnreadLoopIds((prev) => prev.filter((id) => id !== loopId));
  }, []);
  const [createPrefill, setCreatePrefill] = useState<{ startPoint?: string; destination?: string; isReturn?: boolean } | null>(null);

  // Emergency SOS & Safety (Up to 3 Contacts)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedList = localStorage.getItem(`loop_emergency_contacts_${session.user.id}`);
        if (cachedList) {
          const parsed = JSON.parse(cachedList);
          if (Array.isArray(parsed)) return parsed.slice(0, 3);
        }
        // Backward compatibility migration from single contact
        const singleCached = localStorage.getItem(`loop_emergency_contact_${session.user.id}`);
        if (singleCached) {
          const parsedSingle = JSON.parse(singleCached);
          if (parsedSingle && parsedSingle.phone) {
            return [{ ...parsedSingle, id: parsedSingle.id || "c-1" }];
          }
        }
      } catch {}
    }
    return [];
  });
  const [showSosModal, setShowSosModal] = useState(false);
  const [showEmergencyContactModal, setShowEmergencyContactModal] = useState(false);

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

  const fetchEmergencyContacts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("id, name, phone, relation")
        .order("created_at", { ascending: true })
        .limit(3);

      if (!error) {
        if (data && data.length > 0) {
          setEmergencyContacts(data);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(data));
            } catch {}
          }
        } else if (typeof window !== "undefined") {
          // If cloud table was just created, sync any existing local contacts up to the database
          const cached = localStorage.getItem(`loop_emergency_contacts_${session.user.id}`);
          if (cached) {
            try {
              const localList: EmergencyContact[] = JSON.parse(cached);
              if (Array.isArray(localList) && localList.length > 0) {
                const payload = localList.slice(0, 3).map((c) => ({
                  user_id: session.user.id,
                  name: c.name.trim(),
                  phone: c.phone.trim(),
                  relation: c.relation || "Parent",
                }));
                const { data: inserted, error: insertError } = await supabase
                  .from("emergency_contacts")
                  .insert(payload)
                  .select("id, name, phone, relation");

                if (!insertError && inserted && inserted.length > 0) {
                  setEmergencyContacts(inserted);
                  localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(inserted));
                }
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      // Offline fallback: continue with localStorage
    }
  }, [session.user.id]);

  useEffect(() => {
    fetchEmergencyContacts();
  }, [fetchEmergencyContacts]);

  const saveEmergencyContacts = useCallback(async (contacts: EmergencyContact[]) => {
    const trimmed = contacts.slice(0, 3);
    setEmergencyContacts(trimmed);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(trimmed));
        if (trimmed.length > 0) {
          localStorage.setItem(`loop_emergency_contact_${session.user.id}`, JSON.stringify(trimmed[0]));
        } else {
          localStorage.removeItem(`loop_emergency_contact_${session.user.id}`);
        }
      } catch {}
    }

    // Safe Cloud Synchronization (Atomic RPC with safe non-destructive fallback)
    try {
      const payload = trimmed.map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        relation: c.relation || "Parent",
      }));

      // 1. Attempt atomic stored procedure (executes within single DB transaction)
      const { data: rpcData, error: rpcError } = await supabase.rpc("sync_emergency_contacts", {
        contacts_payload: payload,
      });

      if (!rpcError && rpcData) {
        setEmergencyContacts(rpcData);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(rpcData));
          } catch {}
        }
        return;
      }

      // 2. Fallback: Safe differential sync (inserts before deleting old IDs)
      const { data: existing } = await supabase
        .from("emergency_contacts")
        .select("id")
        .eq("user_id", session.user.id);

      const existingIds = (existing || []).map((e: any) => e.id);

      if (trimmed.length > 0) {
        const insertPayload = trimmed.map((c) => ({
          user_id: session.user.id,
          name: c.name.trim(),
          phone: c.phone.trim(),
          relation: c.relation || "Parent",
        }));
        const { data: inserted, error: insertError } = await supabase
          .from("emergency_contacts")
          .insert(insertPayload)
          .select("id, name, phone, relation");

        if (!insertError && inserted && inserted.length > 0) {
          if (existingIds.length > 0) {
            await supabase.from("emergency_contacts").delete().in("id", existingIds);
          }
          setEmergencyContacts(inserted);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(inserted));
            } catch {}
          }
        }
      } else if (existingIds.length > 0) {
        await supabase.from("emergency_contacts").delete().in("id", existingIds);
      }
    } catch (dbErr) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Emergency contacts database sync notice:", dbErr);
      }
    }
  }, [session.user.id]);

  const saveEmergencyContact = useCallback((contact: EmergencyContact | null) => {
    if (contact) {
      saveEmergencyContacts([contact]);
    } else {
      saveEmergencyContacts([]);
    }
  }, [saveEmergencyContacts]);

  const emergencyContact = emergencyContacts[0] || null;

  const triggerSos = useCallback(() => {
    triggerHaptic(20);
    const validContacts = emergencyContacts.filter((c) => /^[6-9]\d{9}$/.test(sanitizeIndianPhoneNumber(c.phone)));
    if (validContacts.length === 0) {
      toast.error("No emergency contact saved! Please add a trusted contact first.");
      setShowEmergencyContactModal(true);
      return;
    }
    setShowSosModal(true);
  }, [emergencyContacts]);

  const userJoinedLoopsRef = useRef(userJoinedLoops);
  useEffect(() => {
    userJoinedLoopsRef.current = userJoinedLoops;
  }, [userJoinedLoops]);

  const userLoopsRef = useRef(userLoops);
  useEffect(() => {
    userLoopsRef.current = userLoops;
  }, [userLoops]);

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const selectedLoopRef = useRef(selectedLoop);
  useEffect(() => {
    selectedLoopRef.current = selectedLoop;
  }, [selectedLoop]);

  const activeLoopsRef = useRef(activeLoops);
  useEffect(() => {
    activeLoopsRef.current = activeLoops;
  }, [activeLoops]);

  // --- Browser back button support ---
  const setView = useCallback((v: View) => {
    setViewState(v);
    window.history.pushState({ view: v }, "", "");
  }, []);

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
            const isEnded = ['cancelled', 'ended', 'expired'].includes(data.status);
            const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
            const isOld = (Date.now() - new Date(data.departure_time).getTime()) > 2 * 60 * 60 * 1000;
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

            const formatted = {
              ...data,
              member_count: data.loop_members?.[0]?.count || 0,
            };
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

  // --- Theme ---
  const isDark = profile.theme === "dark";
  const theme: ThemeClasses = {
    isDark,
    bg: isDark ? "bg-[#000000]" : "bg-[#F2EFE9]",
    text: isDark ? "text-white" : "text-[#1C1917]",
    border: isDark ? "border-[#27272A]" : "border-[#DFD9CE]",
    cardBg: isDark ? "bg-[#121212]" : "bg-[#FAF8F5]",
    mutedText: isDark ? "text-[#A1A1AA]" : "text-[#57534E]",
    accentText: isDark ? "text-[#FFC554]" : "text-[#881337]",
    accentBg: isDark ? "bg-[#FFC554]" : "bg-[#881337]",
    accentBgSubtle: isDark ? "bg-[#FFC554]/15" : "bg-[#881337]/10",
    accentBorder: isDark ? "border-[#FFC554]" : "border-[#881337]",
    accentBorderSubtle: isDark ? "border-[#FFC554]/30" : "border-[#881337]/30",
    primaryBtn: isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white",
    accentColor: isDark ? "#FFC554" : "#881337",
  };

  const [themeTransition, setThemeTransition] = useState<{ active: boolean, nextTheme: 'dark' | 'light' } | null>(null);

  // Synchronize mobile notification/status bar theme-color
  useEffect(() => {
    if (typeof document === "undefined") return;
    const targetColor = isDark ? "#000000" : "#ffffff";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", targetColor);
  }, [isDark]);

  const toggleTheme = () => {
    const nextTheme = profile.theme === "dark" ? "light" : "dark";
    updateProfile({ theme: nextTheme });
  };

  // --- Fetch profile ---
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
      } catch {}
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

        supabase.from("profiles").update({
          display_name: name,
          reg_no: regNo,
          is_student_verified: isStudent,
          updated_at: new Date().toISOString(),
        }).eq("id", session.user.id).then();
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
      } catch {}
    }
    setIsProfileLoaded(true);
  }, [session.user.id, session.user.email]);

  // --- Update profile ---
  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<boolean> => {
    // Optimistically update local state & cache instantly
    const prevProfile = profileRef.current;
    const nextProfile = { ...prevProfile, ...updates };
    setProfile(nextProfile);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(nextProfile));
      } catch {}
    }

    const { phone_number, ...profileUpdates } = updates;
    const promises: PromiseLike<any>[] = [];

    if (Object.keys(profileUpdates).length > 0) {
      promises.push(
        supabase
          .from("profiles")
          .upsert({ id: session.user.id, ...profileUpdates, updated_at: new Date().toISOString() }, { onConflict: "id" })
      );
    }

    if (phone_number !== undefined) {
      const cleanPhone = (phone_number || "").replace(/\D/g, "").slice(0, 10);
      if (cleanPhone) {
        promises.push(
          supabase
            .from("profile_contacts")
            .upsert({ user_id: session.user.id, phone_number: cleanPhone, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        );
      } else {
        promises.push(
          supabase
            .from("profile_contacts")
            .delete()
            .eq("user_id", session.user.id)
        );
      }
    }

    const results = await Promise.all(promises);
    const dbError = results.find((r) => r?.error)?.error;

    if (dbError) {
      // Revert on error
      setProfile(prevProfile);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(prevProfile));
        } catch {}
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
  }, [session.user.id]);

  // --- Fetch loops (supports advance rides; keeps rides active until 2 hrs after departure) ---
  const lastFetchLoopsTimeRef = useRef<number>(0);
  const isFetchingLoopsRef = useRef<boolean>(false);

  const fetchLoops = useCallback(async (force = false) => {
    const now = Date.now();
    // 15-second SWR cache: Skip redundant DB roundtrip if fetched recently and cache is present
    if (!force && now - lastFetchLoopsTimeRef.current < 15000 && activeLoopsRef.current.length > 0) {
      return;
    }
    if (isFetchingLoopsRef.current) return;
    isFetchingLoopsRef.current = true;
    lastFetchLoopsTimeRef.current = now;

    try {
      const userGender = profileRef.current.gender;
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Free tier optimization: limit initial fetch to 30 active rides to reduce connection overhead
      const { data, error } = await supabase
        .from("loops")
        .select("*, loop_members(count), creator:profiles!fk_loops_creator_id(display_name, avatar_url, reg_no)")
        .in("status", ["open", "started", "active", "in_progress"])
        .gte("departure_time", twoHoursAgo)
        .order("departure_time", { ascending: true })
        .limit(30);

      if (!error && data) {
        const nowDate = new Date();
        const filtered = data.filter((l: any) => {
          // Keep rides active until 2 hours after their departure time
          const depTime = new Date(l.departure_time);
          if (nowDate.getTime() - depTime.getTime() > 2 * 60 * 60 * 1000) return false;

          if (l.expires_at && new Date(l.expires_at) < nowDate) return false;

          if (l.creator_id === session.user.id) return true;
          if (l.is_female_only && userGender !== "female") return false;
          return true;
        });
        const formatted = filtered.map((l: any) => ({ ...l, member_count: l.loop_members?.[0]?.count || 0 }));
        setActiveLoops(formatted);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("loop_active_loops_cache", JSON.stringify(formatted));
          } catch {}
        }
        const creatorAvatars = formatted
          .map((l: any) => l.creator?.avatar_url)
          .filter(Boolean);
        if (creatorAvatars.length > 0) {
          preloadAvatars(creatorAvatars);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Error fetching loops:", err);
      }
    } finally {
      isFetchingLoopsRef.current = false;
    }
  }, [session.user.id]);

  // --- Fetch memberships concurrently ---
  const lastFetchMembershipsTimeRef = useRef<number>(0);
  const isFetchingMembershipsRef = useRef<boolean>(false);

  const fetchUserMemberships = useCallback(async (force = false) => {
    const now = Date.now();
    // 15-second SWR cache: Skip redundant DB roundtrip if fetched recently
    if (!force && now - lastFetchMembershipsTimeRef.current < 15000) {
      return;
    }
    if (isFetchingMembershipsRef.current) return;
    isFetchingMembershipsRef.current = true;
    lastFetchMembershipsTimeRef.current = now;

    try {
      const [{ data: joinedData }, { data: creatorData }] = await Promise.all([
        supabase.from("loop_members").select("loop_id").eq("user_id", session.user.id),
        supabase.from("loops").select("id").eq("creator_id", session.user.id),
      ]);

      if (joinedData) {
        const joinedIds = joinedData.map((m: any) => m.loop_id);
        setUserJoinedLoops(joinedIds);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(joinedIds));
          } catch {}
        }
      }
      if (creatorData) {
        const creatorIds = creatorData.map((l: any) => l.id);
        setUserLoops(creatorIds);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`loop_created_loops_${session.user.id}`, JSON.stringify(creatorIds));
          } catch {}
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Error fetching memberships:", err);
      }
    } finally {
      isFetchingMembershipsRef.current = false;
    }
  }, [session.user.id]);

  // --- Join loop (Optimistic UI for 0ms transition) ---
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

    if (loop.is_female_only && currentGender !== "female" && loop.creator_id !== session.user.id) {
      toast.error("This ride is restricted to female students only.");
      return;
    }

    if (isJoining) return;
    setIsJoining(true);

    try {
      // 1. Insert membership into database first to eliminate race condition with ChatView
      const { error } = await supabase.from("loop_members").insert({
        loop_id: loop.id,
        user_id: session.user.id,
      });

      // Error code 23505 is PostgreSQL unique_violation (already a member), safe to proceed
      if (error && error.code !== "23505") {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to insert loop membership:", error);
        }
        toast.error("Failed to join loop. Please try again.");
        return;
      }

      // 2. Confirmed in DB: update joined loops & active loops state
      const previousJoined = userJoinedLoopsRef.current;
      const isAlreadyMember = previousJoined.includes(loop.id);
      const newCount = (loop.member_count || 0) + (isAlreadyMember ? 0 : 1);
      const updatedLoop = { ...loop, member_count: newCount };

      const nextJoined = Array.from(new Set([...previousJoined, loop.id]));
      userJoinedLoopsRef.current = nextJoined;
      setUserJoinedLoops(nextJoined);
      try {
        localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(nextJoined));
      } catch {}

      setSelectedLoop(updatedLoop);
      setActiveLoops((prev) => prev.map((l) => (l.id === loop.id ? updatedLoop : l)));
      setChatSource("ride-details");
      setView("chat");
      toast.success("Joined loop!");

      // 3. Background refresh
      fetchLoops(true);
      fetchUserMemberships(true);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("joinLoop error:", err);
      }
      toast.error("Failed to join loop. Please try again.");
    } finally {
      setIsJoining(false);
    }
  }, [profile, session.user.id, isJoining, fetchLoops, fetchUserMemberships, setSelectedLoop, setView, setChatSource]);

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
    if (!loopId) {
      toast.error("Invalid loop reference");
      return;
    }
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      // 1. First attempt: Use security definer RPC which verifies creator and updates cleanly
      const { data: rpcData, error: rpcError } = await supabase.rpc("delete_loop", {
        target_loop_id: loopId,
      });

      let isSuccess = false;

      if (!rpcError) {
        if (rpcData && typeof rpcData === "object" && (rpcData as any).success === false) {
          toast.error((rpcData as any).error || "Failed to delete loop");
          setIsDeleting(false);
          return;
        }
        isSuccess = true;
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn("delete_loop RPC failed, falling back to direct table update:", rpcError);
        }
        // 2. Fallback: Direct table update
        const { error: updateError } = await supabase
          .from("loops")
          .update({ status: "cancelled" })
          .eq("id", loopId);

        if (updateError) {
          if (process.env.NODE_ENV !== "production") {
            console.error("Error deleting loop:", updateError);
          }
          toast.error(updateError.message || "Failed to delete loop");
          setIsDeleting(false);
          return;
        }
        isSuccess = true;
      }

      if (isSuccess) {
        toast.success("Loop deleted");
        // Optimistically clean up local state
        setActiveLoops((prev) => prev.filter((l) => l.id !== loopId));
        setUserLoops((prev) => prev.filter((id) => id !== loopId));
        setSelectedLoop(null);
        setView("home");
        fetchLoops(true);
        fetchUserMemberships(true);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Unexpected error deleting loop:", err);
      }
      toast.error("Failed to delete loop");
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, setView, fetchLoops, fetchUserMemberships, setSelectedLoop]);

  // --- Leave loop (Optimistic UI for 0ms transition) ---
  const leaveLoop = useCallback(async (loopId: string) => {
    const previousJoined = userJoinedLoopsRef.current;
    const previousLoop = selectedLoopRef.current;

    // Instant optimistic leave
    setUserJoinedLoops((prev) => {
      const next = prev.filter((id) => id !== loopId);
      try {
        localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (previousLoop && previousLoop.id === loopId) {
      const newCount = Math.max(0, (previousLoop.member_count || 1) - 1);
      const updatedLoop = { ...previousLoop, member_count: newCount };
      setSelectedLoop(updatedLoop);
      setActiveLoops((prev) => prev.map((l) => (l.id === loopId ? updatedLoop : l)));
    }
    setView("home");
    toast.success("Left loop");

    const { error } = await supabase.from("loop_members").delete().eq("loop_id", loopId).eq("user_id", session.user.id);
    if (error) {
      // Rollback
      setUserJoinedLoops(previousJoined);
      if (previousLoop) setSelectedLoop(previousLoop);
      toast.error("Failed to leave loop");
    } else {
      fetchLoops(true);
      fetchUserMemberships(true);
    }
  }, [session.user.id, setSelectedLoop, setView, fetchLoops, fetchUserMemberships]);

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
    registerServiceWorker();
    fetchProfile();
    Promise.all([fetchLoops(), fetchUserMemberships()]);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let hideTimer: NodeJS.Timeout | null = null;

    const subscribeChannel = () => {
      if (channel) return;
      channel = supabase
        .channel("global-app-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "loops" },
          async (payload) => {
            const newLoopId = payload.new?.id;
            if (!newLoopId) return;

            if (payload.new.creator_id === session.user.id) {
              setUserLoops((prev) => Array.from(new Set([...prev, newLoopId])));
            }

            const userGender = profileRef.current.gender;
            if (
              payload.new.is_female_only &&
              userGender !== "female" &&
              payload.new.creator_id !== session.user.id
            ) {
              return;
            }

            const { data: loopData, error } = await supabase
              .from("loops")
              .select("*, loop_members(count), creator:profiles!fk_loops_creator_id(display_name, avatar_url, reg_no)")
              .eq("id", newLoopId)
              .single();

            if (!error && loopData) {
              const formatted = {
                ...loopData,
                member_count: loopData.loop_members?.[0]?.count || 0,
              };
              setActiveLoops((prev) => {
                const list = prev.some((l) => l.id === formatted.id)
                  ? prev.map((l) => (l.id === formatted.id ? formatted : l))
                  : [...prev, formatted];
                return list.sort(
                  (a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
                );
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "loops" },
          (payload) => {
            const updated = payload.new as any;
            if (!updated?.id) return;

            const inactiveStatuses = ["cancelled", "completed", "ended", "expired"];
            if (inactiveStatuses.includes(updated.status)) {
              setActiveLoops((prev) => prev.filter((l) => l.id !== updated.id));
              setSelectedLoopState((prev) => {
                if (prev?.id === updated.id) {
                  return { ...prev, ...updated };
                }
                return prev;
              });
            } else {
              setActiveLoops((prev) =>
                prev.map((l) =>
                  l.id === updated.id
                    ? { ...l, ...updated, creator: l.creator, member_count: l.member_count }
                    : l
                )
              );
              setSelectedLoopState((prev) => {
                if (prev && prev.id === updated.id) {
                  return { ...prev, ...updated, creator: prev.creator, member_count: prev.member_count };
                }
                return prev;
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "loops" },
          (payload) => {
            const deletedId = payload.old?.id;
            if (!deletedId) return;
            setActiveLoops((prev) => prev.filter((l) => l.id !== deletedId));
            setUserLoops((prev) => prev.filter((id) => id !== deletedId));
            setUserJoinedLoops((prev) => prev.filter((id) => id !== deletedId));
            setSelectedLoopState((prev) => (prev?.id === deletedId ? null : prev));
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "loop_members" },
          (payload) => {
            const newMember = payload.new as { loop_id?: string; user_id?: string };
            if (!newMember?.loop_id) return;

            setActiveLoops((prev) =>
              prev.map((l) =>
                l.id === newMember.loop_id
                  ? { ...l, member_count: (l.member_count || 0) + 1 }
                  : l
              )
            );
            setSelectedLoopState((prev) => {
              if (prev && prev.id === newMember.loop_id) {
                return { ...prev, member_count: (prev.member_count || 0) + 1 };
              }
              return prev;
            });

            if (newMember.user_id === session.user.id) {
              setUserJoinedLoops((prev) =>
                Array.from(new Set([...prev, newMember.loop_id!]))
              );
            } else {
              // Trigger notification if current user created this loop
              setUserLoops((currentCreatorLoops) => {
                if (currentCreatorLoops.includes(newMember.loop_id!)) {
                  toast.success("A passenger just joined your loop");
                  sendLocalNotification("LOOP: Passenger Joined", {
                    body: "A new passenger just joined your ride. Tap to view your loop.",
                    data: { url: `/?loop=${newMember.loop_id}` },
                    tag: `loop-join-${newMember.loop_id}`,
                  });
                }
                return currentCreatorLoops;
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "loop_members" },
          (payload) => {
            const oldMember = payload.old as { loop_id?: string; user_id?: string };
            if (!oldMember?.loop_id) return;

            setActiveLoops((prev) =>
              prev.map((l) =>
                l.id === oldMember.loop_id
                  ? { ...l, member_count: Math.max(0, (l.member_count || 1) - 1) }
                  : l
              )
            );
            setSelectedLoopState((prev) => {
              if (prev && prev.id === oldMember.loop_id) {
                return {
                  ...prev,
                  member_count: Math.max(0, (prev.member_count || 1) - 1),
                };
              }
              return prev;
            });

            if (oldMember.user_id === session.user.id) {
              setUserJoinedLoops((prev) =>
                prev.filter((id) => id !== oldMember.loop_id)
              );
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const newMsg = payload.new as any;
            if (!newMsg?.id || !newMsg.loop_id) return;
            if (newMsg.user_id === session.user.id) return;

            const isUserInLoop =
              userJoinedLoopsRef.current.includes(newMsg.loop_id) ||
              userLoopsRef.current.includes(newMsg.loop_id);

            if (!isUserInLoop) return;

            const isCurrentlyInThisChat =
              viewRef.current === "chat" &&
              selectedLoopRef.current?.id === newMsg.loop_id;

            if (!isCurrentlyInThisChat) {
              setUnreadLoopIds((prev) => Array.from(new Set([...prev, newMsg.loop_id])));

              try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtx) {
                  const ctx = new AudioCtx();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = "sine";
                  osc.frequency.setValueAtTime(880, ctx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.08);
                  gain.gain.setValueAtTime(0.12, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.22);
                }
              } catch (e) {}

              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try {
                  navigator.vibrate([100, 50, 100]);
                } catch (e) {}
              }

              const targetLoop = activeLoopsRef.current.find((l) => l.id === newMsg.loop_id);
              const destName = targetLoop ? targetLoop.destination : "Ride Chat";
              toast.info(`${destName}: ${newMsg.content?.slice(0, 45) || "New message"}`);

              sendLocalNotification(`LOOP: ${destName}`, {
                body: newMsg.content || "New message in your ride",
                data: { url: `/?loop=${newMsg.loop_id}` },
                tag: `loop-chat-${newMsg.loop_id}`,
              });
            }
          }
        )
        .subscribe();
    };

    const unsubscribeChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    // Initial subscribe
    subscribeChannel();

    // Visibility change handler: disconnect after 15s in background, reconnect on foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hideTimer = setTimeout(() => {
          unsubscribeChannel();
        }, 15000); // 15s grace period
      } else {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        if (!channel) {
          subscribeChannel();
          // Fresh sync of feeds after reconnecting
          fetchLoops();
          fetchUserMemberships();
        }
      }
    };

    // Online handler: when mobile device reconnects to Wi-Fi/cellular
    const handleOnline = () => {
      if (!channel && document.visibilityState === "visible") {
        subscribeChannel();
      }
      fetchLoops();
      fetchUserMemberships();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      unsubscribeChannel();
    };
  }, [fetchProfile, fetchLoops, fetchUserMemberships, session.user.id]);

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
