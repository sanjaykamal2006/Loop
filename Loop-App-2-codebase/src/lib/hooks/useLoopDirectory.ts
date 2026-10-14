"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { toast } from "@/components/ui/NativeToast";
import type { Session } from "@supabase/supabase-js";
import type { View, Loop, Profile } from "@/lib/types";
import { preloadAvatars } from "@/lib/imageOptimization";
import { registerServiceWorker, sendLocalNotification } from "@/lib/notifications";
import type { Database } from "@/lib/database.types";

type LoopRow = Database["public"]["Tables"]["loops"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type LoopQueryResult = LoopRow & {
  creator?: { display_name?: string | null; avatar_url?: string | null; reg_no?: string | null } | null;
  loop_members?: { count: number }[];
};

interface UseLoopDirectoryOptions {
  session: Session;
  profile: Profile;
  profileRef: React.MutableRefObject<Profile>;
  fetchProfile: () => Promise<void>;
  view: View;
  setView: (v: View) => void;
  selectedLoop: Loop | null;
  setSelectedLoop: (l: Loop | null) => void;
  setSelectedLoopState: React.Dispatch<React.SetStateAction<Loop | null>>;
  setChatSource: (s: "ride-details" | "chat-list") => void;
  setUnreadLoopIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useLoopDirectory({
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
}: UseLoopDirectoryOptions) {
  const [activeLoops, setActiveLoops] = useState<Loop[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("loop_active_loops_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

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

  // Gender guard & pending actions
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "create" | "join"; data?: Loop } | null>(null);

  // Sync refs to prevent stale closures in realtime listeners
  const userJoinedLoopsRef = useRef(userJoinedLoops);
  useEffect(() => {
    userJoinedLoopsRef.current = userJoinedLoops;
    if (typeof window !== "undefined" && session?.user?.id) {
      try {
        localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(userJoinedLoops));
      } catch {}
    }
  }, [userJoinedLoops, session?.user?.id]);

  const userLoopsRef = useRef(userLoops);
  useEffect(() => {
    userLoopsRef.current = userLoops;
    if (typeof window !== "undefined" && session?.user?.id) {
      try {
        localStorage.setItem(`loop_created_loops_${session.user.id}`, JSON.stringify(userLoops));
      } catch {}
    }
  }, [userLoops, session?.user?.id]);

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
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("loop_active_loops_cache", JSON.stringify(activeLoops));
      } catch {}
    }
  }, [activeLoops]);

  const registerCreatedLoop = useCallback(
    (newLoop: Loop) => {
      setActiveLoops((prev) => {
        const next = prev.some((l) => l.id === newLoop.id)
          ? prev.map((l) => (l.id === newLoop.id ? newLoop : l))
          : [newLoop, ...prev];
        const sorted = [...next].sort(
          (a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
        );
        activeLoopsRef.current = sorted;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("loop_active_loops_cache", JSON.stringify(sorted));
          } catch {}
        }
        return sorted;
      });
      setUserLoops((prev) => {
        const next = Array.from(new Set([...prev, newLoop.id]));
        userLoopsRef.current = next;
        if (typeof window !== "undefined" && session?.user?.id) {
          try {
            localStorage.setItem(`loop_created_loops_${session.user.id}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
      setUserJoinedLoops((prev) => {
        const next = Array.from(new Set([...prev, newLoop.id]));
        userJoinedLoopsRef.current = next;
        if (typeof window !== "undefined" && session?.user?.id) {
          try {
            localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
      setSelectedLoop(newLoop);
    },
    [session?.user?.id, setSelectedLoop]
  );

  // --- Fetch loops (supports advance rides; keeps rides active until 2 hrs after departure) ---
  const lastFetchLoopsTimeRef = useRef<number>(0);
  const isFetchingLoopsRef = useRef<boolean>(false);

  const fetchLoops = useCallback(
    async (force = false) => {
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
          const filtered = (data as unknown as LoopQueryResult[]).filter((l) => {
            // Keep rides active until 2 hours after their departure time
            const depTime = new Date(l.departure_time || "");
            if (nowDate.getTime() - depTime.getTime() > 2 * 60 * 60 * 1000) return false;

            if (l.expires_at && new Date(l.expires_at) < nowDate) return false;

            if (l.creator_id === session.user.id) return true;
            if (l.is_female_only && userGender !== "female") return false;
            return true;
          });
          const formatted: Loop[] = filtered.map(
            (l) =>
              ({
                ...l,
                creator_id: l.creator_id || "",
                departure_time: l.departure_time || "",
                created_at: l.created_at || "",
                is_female_only: Boolean(l.is_female_only),
                member_count: l.loop_members?.[0]?.count || 0,
              } as Loop)
          );
          setActiveLoops(formatted);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("loop_active_loops_cache", JSON.stringify(formatted));
            } catch {}
          }
          const creatorAvatars = formatted
            .map((l) => l.creator?.avatar_url)
            .filter((url): url is string => Boolean(url));
          if (creatorAvatars.length > 0) {
            preloadAvatars(creatorAvatars);
          }
        }
      } catch (err) {
        logger.warn("Error fetching loops:", err);
      } finally {
        isFetchingLoopsRef.current = false;
      }
    },
    [session.user.id, profileRef]
  );

  // --- Fetch memberships concurrently ---
  const lastFetchMembershipsTimeRef = useRef<number>(0);
  const isFetchingMembershipsRef = useRef<boolean>(false);

  const fetchUserMemberships = useCallback(
    async (force = false) => {
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
          const joinedIds = (joinedData as { loop_id: string }[]).map((m) => m.loop_id);
          setUserJoinedLoops(joinedIds);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(joinedIds));
            } catch {}
          }
        }
        if (creatorData) {
          const creatorIds = (creatorData as { id: string }[]).map((l) => l.id);
          setUserLoops(creatorIds);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_created_loops_${session.user.id}`, JSON.stringify(creatorIds));
            } catch {}
          }
        }
      } catch (err) {
        logger.warn("Error fetching memberships:", err);
      } finally {
        isFetchingMembershipsRef.current = false;
      }
    },
    [session.user.id]
  );

  // --- Join loop (Optimistic UI for 0ms transition) ---
  const joinLoop = useCallback(
    async (loop: Loop, profileOverride?: Partial<Profile>) => {
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
          logger.error("Failed to insert loop membership:", error);
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
        logger.error("joinLoop error:", err);
        toast.error("Failed to join loop. Please try again.");
      } finally {
        setIsJoining(false);
      }
    },
    [profile, session.user.id, isJoining, fetchLoops, fetchUserMemberships, setSelectedLoop, setView, setChatSource]
  );

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
  const deleteLoop = useCallback(
    async (loopId: string) => {
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
          const rpcResult = rpcData as { success?: boolean; error?: string } | null;
          if (rpcResult && typeof rpcResult === "object" && rpcResult.success === false) {
            toast.error(rpcResult.error || "Failed to delete loop");
            setIsDeleting(false);
            return;
          }
          isSuccess = true;
        } else {
          logger.warn("delete_loop RPC failed, falling back to direct table update:", rpcError);
          // 2. Fallback: Direct table update
          const { error: updateError } = await supabase
            .from("loops")
            .update({ status: "cancelled" })
            .eq("id", loopId);

          if (updateError) {
            logger.error("Error deleting loop:", updateError);
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
      } catch (err: unknown) {
        logger.error("Unexpected error deleting loop:", err);
        toast.error("Failed to delete loop");
      } finally {
        setIsDeleting(false);
      }
    },
    [isDeleting, setView, fetchLoops, fetchUserMemberships, setSelectedLoop]
  );

  // --- Leave loop (Optimistic UI for 0ms transition) ---
  const leaveLoop = useCallback(
    async (loopId: string) => {
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
    },
    [session.user.id, setSelectedLoop, setView, fetchLoops, fetchUserMemberships]
  );

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
              const formatted: Loop = {
                ...loopData,
                creator_id: loopData.creator_id || "",
                departure_time: loopData.departure_time || "",
                created_at: loopData.created_at || "",
                is_female_only: Boolean(loopData.is_female_only),
                member_count: (loopData.loop_members as unknown as { count: number }[])?.[0]?.count || 0,
              } as Loop;
              setActiveLoops((prev) => {
                const list = prev.some((l) => l.id === formatted.id)
                  ? prev.map((l) => (l.id === formatted.id ? formatted : l))
                  : [...prev, formatted];
                return list.sort(
                  (a, b) => new Date(a.departure_time || "").getTime() - new Date(b.departure_time || "").getTime()
                );
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "loops" },
          (payload) => {
            const updated = payload.new as Partial<LoopRow>;
            if (!updated?.id) return;

            const inactiveStatuses = ["cancelled", "completed", "ended", "expired"];
            if (updated.status && inactiveStatuses.includes(updated.status)) {
              setActiveLoops((prev) => prev.filter((l) => l.id !== updated.id));
              setSelectedLoopState((prev) => {
                if (!prev) return null;
                if (prev.id === updated.id) {
                  return { ...prev, ...updated, creator_id: updated.creator_id || prev.creator_id } as Loop;
                }
                return prev;
              });
            } else {
              setActiveLoops((prev) =>
                prev.map((l) =>
                  l.id === updated.id
                    ? ({ ...l, ...updated, creator_id: updated.creator_id || l.creator_id, creator: l.creator, member_count: l.member_count } as Loop)
                    : l
                )
              );
              setSelectedLoopState((prev) => {
                if (prev && prev.id === updated.id) {
                  return { ...prev, ...updated, creator_id: updated.creator_id || prev.creator_id, creator: prev.creator, member_count: prev.member_count } as Loop;
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
            const newMsg = payload.new as Partial<MessageRow>;
            if (!newMsg?.id || !newMsg.loop_id) return;
            if (newMsg.user_id === session.user.id) return;

            const isUserInLoop =
              userJoinedLoopsRef.current.includes(newMsg.loop_id) ||
              userLoopsRef.current.includes(newMsg.loop_id);

            if (!isUserInLoop) return;

            const isCurrentlyInThisChat =
              viewRef.current === "chat" &&
              selectedLoopRef.current?.id === newMsg.loop_id;

            if (!isCurrentlyInThisChat && newMsg.loop_id) {
              const targetId = newMsg.loop_id;
              setUnreadLoopIds((prev) => Array.from(new Set([...prev, targetId])));

              try {
                const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
              } catch {}

              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try {
                  navigator.vibrate([100, 50, 100]);
                } catch {}
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
  }, [fetchProfile, fetchLoops, fetchUserMemberships, session.user.id, profileRef, setSelectedLoopState, setUnreadLoopIds]);

  return {
    activeLoops,
    setActiveLoops,
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
  };
}
