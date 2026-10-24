"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchRideWants,
  postRideWant,
  AUTH_REQUIRED_MESSAGE,
  RideWantRow,
  PostRideWantParams,
} from "@/lib/rideWants";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

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

  const loadBoard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchRideWants();
    if (error) {
      notifyError(error, "Failed to load ride wanted board");
    } else {
      setWants(data || []);
    }
    setLoading(false);
  }, [notifyError]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handlePost = async (params: PostRideWantParams): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await postRideWant(params);
      if (res.error) {
        notifyError(res.error, "Failed to post");
        return false;
      }
      triggerHaptic(10);
      toast.success(
        res.count >= 2
          ? `You're in! ${res.count} students going this way.`
          : "Saved! Your plan shows once another student joins."
      );
      await loadBoard();
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const handleMeToo = async (row: RideWantRow) => {
    if (row.has_mine) return;
    triggerHaptic(10);
    const res = await postRideWant({
      destination: row.destination_key,
      departDate: row.depart_date,
    });
    if (res.error) {
      notifyError(res.error, "Failed to join");
      return;
    }
    triggerHaptic(14);
    toast.success("You're in! Your plan is added.");
    setWants((prev) =>
      prev.map((item) =>
        item.destination_key === row.destination_key && item.depart_date === row.depart_date
          ? {
              ...item,
              has_mine: true,
              intent_count: res.count > 0 ? res.count : item.intent_count + 1,
            }
          : item
      )
    );
  };

  return {
    wants,
    loading,
    submitting,
    loadBoard,
    handlePost,
    handleMeToo,
  };
}
