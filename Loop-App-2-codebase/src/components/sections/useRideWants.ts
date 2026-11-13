"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchRideWants,
  postRideWant,
  removeRideWant,
  AUTH_REQUIRED_MESSAGE,
  RideWantRow,
  PostRideWantParams,
} from "@/lib/rideWants";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";

interface UseRideWantsOptions {
  /** Called when the caller's auth session is dead: the provider signs the
   *  zombie state out so the user lands on the login screen. */
  onAuthDead?: () => void | Promise<void>;
}

export function useRideWants(options?: UseRideWantsOptions) {
  const onAuthDead = options?.onAuthDead;
  const [wants, setWants] = useState<RideWantRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const notifyError = useCallback(
    (error: { message: string } | null, fallback: string) => {
      if (error?.message === AUTH_REQUIRED_MESSAGE) {
        toast.error(AUTH_REQUIRED_MESSAGE);
        void onAuthDead?.();
        return;
      }
      toast.error(error?.message || fallback);
    },
    [onAuthDead]
  );

  const loadBoard = useCallback(
    async (opts?: { silent?: boolean }) => {
      const isSilent = opts?.silent ?? false;
      if (!isSilent) {
        setLoading(true);
      }
      const { data, error } = await fetchRideWants();
      if (error) {
        notifyError(error, "Failed to load ride wanted board");
      } else {
        setWants(data || []);
      }
      if (!isSilent) {
        setLoading(false);
      }
    },
    [notifyError]
  );

  const broadcastDemandUpdate = useCallback(() => {
    try {
      const ch = channelRef.current;
      // Only broadcast over live joined websocket channels
      if (ch && ch.state === "joined") {
        void ch.send({
          type: "broadcast",
          event: "demand-updated",
          payload: {},
        });
      }
    } catch {
      // non-blocking broadcast
    }
  }, []);

  useEffect(() => {
    void loadBoard();

    const channel = supabase.channel("ride-wants-realtime");
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "demand-updated" }, () => {
        void loadBoard({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_intents" }, () => {
        void loadBoard({ silent: true });
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [loadBoard]);

  const handlePost = async (params: PostRideWantParams): Promise<boolean> => {
    const destKey = params.destination?.trim().toLowerCase() ?? "";
    const departDate = params.departDate?.trim() ?? "";

    setSubmitting(true);
    triggerHaptic(10);

    // Save snapshot for rollback if network fails
    const snapshot = wants;

    // 1. Optimistic Update: card appears on screen in 0 ms
    if (destKey && departDate) {
      setWants((prev) => {
        const matchIdx = prev.findIndex(
          (r) => r.destination_key === destKey && r.depart_date === departDate
        );
        if (matchIdx >= 0) {
          return prev.map((item, idx) =>
            idx === matchIdx
              ? {
                  ...item,
                  has_mine: true,
                  intent_count: item.has_mine ? item.intent_count : item.intent_count + 1,
                }
              : item
          );
        }
        const newCard: RideWantRow = {
          destination_key: destKey,
          depart_date: departDate,
          intent_count: 1,
          has_mine: true,
          is_creator: true,
          first_depart_time: params.departTime ? `${params.departTime}:00` : null,
        };
        return [newCard, ...prev];
      });
    }

    try {
      const res = await postRideWant(params);
      if (res.error) {
        setWants(snapshot);
        notifyError(res.error, "Failed to post");
        return false;
      }
      toast.success(
        res.count >= 2
          ? `You're in! ${res.count} students going this way.`
          : "Saved! You're on the board — just you so far."
      );
      broadcastDemandUpdate();
      await loadBoard({ silent: true });
      return true;
    } catch {
      setWants(snapshot);
      notifyError({ message: "Network error occurred" }, "Failed to post");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleMeToo = async (row: RideWantRow) => {
    if (row.has_mine) return;
    triggerHaptic(10);

    // 1. Optimistic Update: count increments and button flips to "Undo" immediately
    const snapshot = wants;
    setWants((prev) =>
      prev.map((item) =>
        item.destination_key === row.destination_key && item.depart_date === row.depart_date
          ? {
              ...item,
              has_mine: true,
              intent_count: item.intent_count + 1,
            }
          : item
      )
    );

    const res = await postRideWant({
      destination: row.destination_key,
      departDate: row.depart_date,
    });
    if (res.error) {
      setWants(snapshot);
      notifyError(res.error, "Failed to join");
      return;
    }
    triggerHaptic(14);
    toast.success("You're in! Your plan is added.");
    broadcastDemandUpdate();
    await loadBoard({ silent: true });
  };

  const handleUndo = async (row: RideWantRow) => {
    if (!row.has_mine) return;
    triggerHaptic(10);

    // 1. Optimistic Update: removed immediately, count decrements
    const snapshot = wants;
    setWants((prev) =>
      prev
        .map((item) =>
          item.destination_key === row.destination_key && item.depart_date === row.depart_date
            ? {
                ...item,
                has_mine: false,
                is_creator: false,
                intent_count: Math.max(item.intent_count - 1, 0),
              }
            : item
        )
        .filter((item) => item.intent_count > 0)
    );

    const res = await removeRideWant({
      destination: row.destination_key,
      departDate: row.depart_date,
    });
    if (res.error) {
      setWants(snapshot);
      notifyError(res.error, "Failed to remove");
      return;
    }
    if (row.is_creator) {
      toast.success("Ride plan deleted");
    } else {
      toast.success("Removed from co-traveller group");
    }
    broadcastDemandUpdate();
    await loadBoard({ silent: true });
  };

  return {
    wants,
    loading,
    submitting,
    loadBoard,
    handlePost,
    handleMeToo,
    handleUndo,
  };
}
