"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchRideWants, postRideWant, RideWantRow, PostRideWantParams } from "@/lib/rideWants";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

export function useRideWants() {
  const [wants, setWants] = useState<RideWantRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchRideWants();
    if (error) {
      toast.error(error.message || "Failed to load ride wanted board");
    } else {
      setWants(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handlePost = async (params: PostRideWantParams): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await postRideWant(params);
      if (res.error) {
        toast.error(res.error.message);
        return false;
      }
      triggerHaptic(10);
      toast.success(
        res.count >= 2
          ? `Demand recorded! Now ${res.count} students want this ride.`
          : "Demand recorded! We'll show it once another student wants it too."
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
      toast.error(res.error.message);
      return;
    }
    triggerHaptic(14);
    toast.success("Added! You signaled demand for this ride.");
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
