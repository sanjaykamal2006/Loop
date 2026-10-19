"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { toast } from "@/components/ui/NativeToast";
import type { Session } from "@supabase/supabase-js";
import type { Loop, Profile, View } from "@/lib/types";

interface UseLoopMembershipsOptions {
  session: Session;
  profile: Profile;
  setView: (v: View) => void;
  selectedLoop: Loop | null;
  setSelectedLoop: (l: Loop | null) => void;
  setActiveLoops: React.Dispatch<React.SetStateAction<Loop[]>>;
  setChatSource: (s: "ride-details" | "chat-list") => void;
  setShowGenderSelect: (v: boolean) => void;
  setPendingAction: (a: { type: "create" | "join"; data?: Loop } | null) => void;
  fetchLoops: (force?: boolean) => Promise<void>;
}

export function useLoopMemberships({
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
}: UseLoopMembershipsOptions) {
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [userJoinedLoops, setUserJoinedLoops] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_joined_loops_${session.user.id}`);
        if (cached) return JSON.parse(cached);
      } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
    }
    return [];
  });

  const [userLoops, setUserLoops] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`loop_created_loops_${session.user.id}`);
        if (cached) return JSON.parse(cached);
      } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
    }
    return [];
  });

  const userJoinedLoopsRef = useRef(userJoinedLoops);
  useEffect(() => {
    userJoinedLoopsRef.current = userJoinedLoops;
    if (typeof window !== "undefined" && session?.user?.id) {
      try {
        localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(userJoinedLoops));
      } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
    }
  }, [userJoinedLoops, session?.user?.id]);

  const userLoopsRef = useRef(userLoops);
  useEffect(() => {
    userLoopsRef.current = userLoops;
    if (typeof window !== "undefined" && session?.user?.id) {
      try {
        localStorage.setItem(`loop_created_loops_${session.user.id}`, JSON.stringify(userLoops));
      } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
    }
  }, [userLoops, session?.user?.id]);

  const selectedLoopRef = useRef(selectedLoop);
  useEffect(() => {
    selectedLoopRef.current = selectedLoop;
  }, [selectedLoop]);

  const lastFetchMembershipsTimeRef = useRef<number>(0);
  const isFetchingMembershipsRef = useRef<boolean>(false);

  const fetchUserMemberships = useCallback(
    async (force = false) => {
      const now = Date.now();
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
            } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
          }
        }
        if (creatorData) {
          const creatorIds = (creatorData as { id: string }[]).map((l) => l.id);
          setUserLoops(creatorIds);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_created_loops_${session.user.id}`, JSON.stringify(creatorIds));
            } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
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
        const { error } = await supabase.from("loop_members").insert({
          loop_id: loop.id,
          user_id: session.user.id,
        });

        if (error && error.code !== "23505") {
          logger.error("Failed to insert loop membership:", error);
          toast.error("Failed to join loop. Please try again.");
          return;
        }

        const previousJoined = userJoinedLoopsRef.current;
        const isAlreadyMember = previousJoined.includes(loop.id);
        const newCount = (loop.member_count || 0) + (isAlreadyMember ? 0 : 1);
        const updatedLoop = { ...loop, member_count: newCount };

        const nextJoined = Array.from(new Set([...previousJoined, loop.id]));
        userJoinedLoopsRef.current = nextJoined;
        setUserJoinedLoops(nextJoined);
        try {
          localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(nextJoined));
        } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }

        setSelectedLoop(updatedLoop);
        setActiveLoops((prev) => prev.map((l) => (l.id === loop.id ? updatedLoop : l)));
        setChatSource("ride-details");
        setView("chat");
        toast.success("Joined loop!");

        fetchLoops(true);
        fetchUserMemberships(true);
      } catch (err) {
        logger.error("joinLoop error:", err);
        toast.error("Failed to join loop. Please try again.");
      } finally {
        setIsJoining(false);
      }
    },
    [profile, session.user.id, isJoining, fetchLoops, fetchUserMemberships, setSelectedLoop, setView, setChatSource, setActiveLoops, setPendingAction, setShowGenderSelect]
  );

  const deleteLoop = useCallback(
    async (loopId: string) => {
      if (!loopId) {
        toast.error("Invalid loop reference");
        return;
      }
      if (isDeleting) return;

      setIsDeleting(true);
      try {
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
    [isDeleting, setView, fetchLoops, fetchUserMemberships, setSelectedLoop, setActiveLoops]
  );

  const leaveLoop = useCallback(
    async (loopId: string) => {
      const previousJoined = userJoinedLoopsRef.current;
      const previousLoop = selectedLoopRef.current;

      setUserJoinedLoops((prev) => {
        const next = prev.filter((id) => id !== loopId);
        try {
          localStorage.setItem(`loop_joined_loops_${session.user.id}`, JSON.stringify(next));
        } catch (err) { logger.error("src/lib/hooks/useLoopMemberships.ts: swallowed non-fatal error", err); }
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
        setUserJoinedLoops(previousJoined);
        if (previousLoop) setSelectedLoop(previousLoop);
        toast.error("Failed to leave loop");
      } else {
        fetchLoops(true);
        fetchUserMemberships(true);
      }
    },
    [session.user.id, setSelectedLoop, setView, fetchLoops, fetchUserMemberships, setActiveLoops]
  );

  return {
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
  };
}
