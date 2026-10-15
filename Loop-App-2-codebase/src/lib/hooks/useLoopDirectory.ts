"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { Session } from "@supabase/supabase-js";
import type { View, Loop, Profile } from "@/lib/types";
import { preloadAvatars } from "@/lib/imageOptimization";
import { registerServiceWorker, sendLocalNotification } from "@/lib/notifications";
import type { Database } from "@/lib/database.types";
import { useLoopMemberships } from "./useLoopMemberships";

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

  // Gender guard & pending actions
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "create" | "join"; data?: Loop } | null>(null);

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

  // --- Fetch loops (supports advance rides; keeps rides active until 2 hrs after departure) ---
  const lastFetchLoopsTimeRef = useRef<number>(0);
  const isFetchingLoopsRef = useRef<boolean>(false);

  const fetchLoops = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchLoopsTimeRef.current < 15000 && activeLoopsRef.current.length > 0) {
        return;
      }
      if (isFetchingLoopsRef.current) return;
      isFetchingLoopsRef.current = true;
      lastFetchLoopsTimeRef.current = now;

      try {
        const userGender = profileRef.current.gender;
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

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

  // Sub-hook: Memberships & Actions (join, leave, delete, cache)
  const {
    userJoinedLoops,
    setUserJoinedLoops,
    userLoops,
    setUserLoops,
    isJoining,
    isDeleting,
    fetchUserMemberships,
    joinLoop,
    deleteLoop,
    leaveLoop,
    userJoinedLoopsRef,
    userLoopsRef,
  } = useLoopMemberships({
    session,
    profile,
    setView,
    selectedLoop,
    setSelectedLoop,
    setActiveLoops,
    setChatSource,
    setShowGenderSelect,
    setPendingAction,
    fetchLoops,
  });

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
    [session?.user?.id, setSelectedLoop, setUserLoops, setUserJoinedLoops, userLoopsRef, userJoinedLoopsRef]
  );

  // Resume joining after profile completion modal
  useEffect(() => {
    if (pendingAction?.type === "join" && profile.gender && profile.display_name && profile.reg_no && !showGenderSelect) {
      if (pendingAction.data) {
        joinLoop(pendingAction.data);
      }
      setPendingAction(null);
    }
  }, [profile.gender, profile.display_name, profile.reg_no, showGenderSelect, pendingAction, joinLoop]);

  // Initial data load + Realtime subscriptions
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
                return { ...prev, member_count: Math.max(0, (prev.member_count || 1) - 1) };
              }
              return prev;
            });

            if (oldMember.user_id === session.user.id) {
              setUserJoinedLoops((prev) => prev.filter((id) => id !== oldMember.loop_id));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const newMsg = payload.new as MessageRow;
            if (!newMsg || !newMsg.loop_id || newMsg.user_id === session.user.id) return;

            const loopId = newMsg.loop_id;
            const isUserInLoop =
              userJoinedLoopsRef.current.includes(loopId) ||
              userLoopsRef.current.includes(loopId);

            if (!isUserInLoop) return;

            const isCurrentlyInThisChat =
              viewRef.current === "chat" && selectedLoopRef.current?.id === loopId;

            if (!isCurrentlyInThisChat) {
              setUnreadLoopIds((prev) => Array.from(new Set([...prev, loopId])));

              let senderName = "New message";
              if (newMsg.user_id) {
                try {
                  const { data: prof } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("id", newMsg.user_id)
                    .single();
                  if (prof?.display_name) senderName = prof.display_name;
                } catch {}
              }

              const matchedLoop = activeLoopsRef.current.find((l) => l.id === loopId);
              const destination = matchedLoop?.destination || "your ride";

              sendLocalNotification(`${senderName} (to ${destination})`, {
                body: newMsg.content || "Sent a message",
                tag: `loop-msg-${loopId}`,
              });
            }
          }
        )
        .subscribe();
    };

    subscribeChannel();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideTimer = setTimeout(() => {
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
        }, 30000);
      } else {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        subscribeChannel();
        fetchLoops(true);
        fetchUserMemberships(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLoops();
        fetchUserMemberships();
      }
    }, 45000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (hideTimer) clearTimeout(hideTimer);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    session.user.id,
    profileRef,
    fetchProfile,
    fetchLoops,
    fetchUserMemberships,
    setSelectedLoopState,
    setUnreadLoopIds,
    setUserLoops,
    setUserJoinedLoops,
    userJoinedLoopsRef,
    userLoopsRef,
  ]);

  return {
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
  };
}
