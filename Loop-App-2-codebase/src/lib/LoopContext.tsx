"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/NativeToast";
import type { View, Loop, Profile, ThemeClasses } from "@/lib/types";
import { registerServiceWorker, sendLocalNotification } from "./notifications";
import { parseStudentEmail } from "./studentParser";

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
  fetchLoops: () => Promise<void>;
  userJoinedLoops: string[];
  userLoops: string[];
  fetchUserMemberships: () => Promise<void>;

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
  const [userJoinedLoops, setUserJoinedLoops] = useState<string[]>([]);
  const [userLoops, setUserLoops] = useState<string[]>([]);

  // Profile
  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_profile_${session.user.id}`);
        if (cached) return JSON.parse(cached);
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
        setViewState(e.state.view);
      } else {
        setViewState("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setSelectedLoop]);

  // --- Theme ---
  const isDark = profile.theme === "dark";
  const theme: ThemeClasses = {
    isDark,
    bg: isDark ? "bg-[#000000]" : "bg-[#F4EFE6]",
    text: isDark ? "text-white" : "text-[#18181B]",
    border: isDark ? "border-[#27272A]" : "border-[#DCD5C8]",
    cardBg: isDark ? "bg-[#121212]" : "bg-[#FFFFFF]",
    mutedText: isDark ? "text-[#A1A1AA]" : "text-[#52525B]",
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
      .select("display_name, theme, gender, reg_no, avatar_url, bio, phone_number, is_student_verified")
      .eq("id", session.user.id)
      .single();

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
        phone_number: data.phone_number || "",
        is_student_verified: Boolean(isStudent),
      };
      setProfile(newProf);
      try {
        localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(newProf));
      } catch {}
    }
    setIsProfileLoaded(true);
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
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem(`loop_profile_${session.user.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });
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
  const fetchLoops = useCallback(async () => {
    const userGender = profileRef.current.gender;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("loops")
      .select("*, loop_members(count), creator:profiles!fk_loops_creator_id(display_name, avatar_url, reg_no)")
      .in("status", ["open", "started", "active", "in_progress"])
      .gte("departure_time", twoHoursAgo)
      .order("departure_time", { ascending: true });

    if (!error && data) {
      const now = new Date();
      const filtered = data.filter((l: any) => {
        // Keep rides active until 2 hours after their departure time
        const depTime = new Date(l.departure_time);
        if (now.getTime() - depTime.getTime() > 2 * 60 * 60 * 1000) return false;

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
        console.warn("delete_loop RPC failed, falling back to direct table update:", rpcError);
        // 2. Fallback: Direct table update
        const { error: updateError } = await supabase
          .from("loops")
          .update({ status: "cancelled" })
          .eq("id", loopId);

        if (updateError) {
          console.error("Error deleting loop:", updateError);
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
        fetchLoops();
        fetchUserMemberships();
      }
    } catch (err: any) {
      console.error("Unexpected error deleting loop:", err);
      toast.error("Failed to delete loop");
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, setView, fetchLoops, fetchUserMemberships, setSelectedLoop]);

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
    registerServiceWorker();
    fetchProfile();
    fetchLoops();
    fetchUserMemberships();

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
                  toast.success("A passenger just joined your loop! 🚗");
                  sendLocalNotification("LOOP: Passenger Joined! 🚗", {
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
                const audio = new Audio("https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3");
                audio.volume = 0.6;
                audio.play().catch(() => {});
              } catch (e) {}

              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try {
                  navigator.vibrate([100, 50, 100]);
                } catch (e) {}
              }

              const targetLoop = activeLoopsRef.current.find((l) => l.id === newMsg.loop_id);
              const destName = targetLoop ? targetLoop.destination : "Ride Chat";
              toast.info(`💬 ${destName}: ${newMsg.content?.slice(0, 45) || "New message"}`);

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
  };

  return <LoopContext.Provider value={value}>{children}</LoopContext.Provider>;
}
