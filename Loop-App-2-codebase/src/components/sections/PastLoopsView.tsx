"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { History, MapPin, Clock, Users, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { VehicleTypeIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";
import type { Loop } from "@/lib/types";

export default function PastLoopsView() {
  const { session, setView, setSelectedLoop, formatTime, theme } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  // 1. Instant 0ms SWR Local Storage Cache Initialization
  const [pastLoops, setPastLoops] = useState<Loop[]>(() => {
    if (typeof window !== "undefined" && session?.user?.id) {
      try {
        const cached = localStorage.getItem(`loop_past_loops_cache_${session.user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Error parsing past loops cache:", e);
        }
      }
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined" && session?.user?.id) {
      try {
        const cached = localStorage.getItem(`loop_past_loops_cache_${session.user.id}`);
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch (e) {}
    }
    return true;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 2. High-Performance Parallel Queries (Promise.all)
  const fetchPastLoops = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh || pastLoops.length === 0) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }

      try {
        const [createdRes, memberRes] = await Promise.all([
          supabase
            .from("loops")
            .select("*")
            .eq("creator_id", session.user.id)
            .in("status", ["ended", "cancelled"])
            .order("created_at", { ascending: false }),
          supabase
            .from("loop_members")
            .select("loop_id, loops(*)")
            .eq("user_id", session.user.id),
        ]);

        const createdLoops = createdRes.data || [];
        const memberRows = memberRes.data || [];

        const memberLoops = memberRows
          .map((r: any) => r.loops)
          .filter((l: any) => l && (l.status === "ended" || l.status === "cancelled"));

        // Combine and deduplicate
        const allLoopsMap = new Map<string, Loop>();
        createdLoops.forEach((l: any) => allLoopsMap.set(l.id, l));
        memberLoops.forEach((l: any) => allLoopsMap.set(l.id, l));

        const sorted = Array.from(allLoopsMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setPastLoops(sorted);

        // Update local storage cache for instant next-time load
        if (typeof window !== "undefined" && session?.user?.id) {
          try {
            localStorage.setItem(`loop_past_loops_cache_${session.user.id}`, JSON.stringify(sorted));
          } catch (e) {}
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Error fetching past loops:", err);
        }
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    },
    [session.user.id, pastLoops.length]
  );

  useEffect(() => {
    fetchPastLoops();
  }, [fetchPastLoops]);

  const handleSelectLoop = (loop: Loop) => {
    triggerHaptic(12);
    setSelectedLoop(loop);
    setView("ride-details");
  };

  return (
    <div className="space-y-4 pt-1 pb-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic(10);
              setView("profile");
            }}
            aria-label="Back to profile"
            className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shadow-sm cursor-pointer`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Ride History</h2>
            <p className={`text-[11px] font-bold ${mutedText}`}>Your completed & previous rides</p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic(10);
            fetchPastLoops(true);
          }}
          disabled={loading || isSyncing}
          aria-label="Refresh history"
          className={`w-9 h-9 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shrink-0 cursor-pointer`}
        >
          <RefreshCw size={14} className={loading || isSyncing ? "animate-spin text-[#FFC554]" : "opacity-70"} />
        </button>
      </div>

      {/* Sleek Skeleton Placeholder Loader (Zero-Jank Shimmer) */}
      {loading && pastLoops.length === 0 && (
        <div className="space-y-3 pt-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-3 animate-pulse`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-11 h-11 rounded-[16px] ${isDark ? "bg-white/10" : "bg-black/10"} shrink-0`} />
                  <div className="space-y-2 flex-1">
                    <div className={`h-3 w-28 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
                    <div className={`h-4.5 w-44 rounded-md ${isDark ? "bg-white/15" : "bg-black/15"}`} />
                  </div>
                </div>
                <div className={`h-6 w-20 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"} shrink-0`} />
              </div>
              <div className={`pt-2.5 border-t ${isDark ? "border-white/5" : "border-black/5"} flex justify-between items-center`}>
                <div className={`h-3 w-24 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
                <div className={`h-3 w-16 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && pastLoops.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 px-4 animate-card-enter">
          <div className="w-20 h-20 rounded-[28px] bg-[#FFC554]/10 border border-[#FFC554]/20 flex items-center justify-center text-[#FFC554] shadow-lg">
            <History size={36} strokeWidth={2.2} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase tracking-tight">No Past Loops Found</h3>
            <p className={`text-xs font-medium ${mutedText} max-w-[240px] leading-relaxed`}>
              Once you finish or complete a ride in LOOP, it will be safely archived here for your records.
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic(12);
              setView("home");
            }}
            className="mt-2 px-6 py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-full active:scale-95 shadow-xl shadow-[#FFC554]/10 transition-transform cursor-pointer"
          >
            Find Active Loops
          </button>
        </div>
      )}

      {/* Past Loops List with Staggered Fluid Card Entrance */}
      {pastLoops.length > 0 && (
        <div className="space-y-3">
          {pastLoops.map((loop, idx) => {
            const isCompleted = loop.status === "ended";
            const dateStr = loop.departure_time || loop.created_at
              ? new Date(loop.departure_time || loop.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Past Date";

            return (
              <div
                key={loop.id}
                style={{ "--stagger-delay": `${Math.min(idx, 8) * 45}ms` } as React.CSSProperties}
                onClick={() => handleSelectLoop(loop)}
                className={`p-3.5 sm:p-4 ${cardBg} border ${border} rounded-[24px] space-y-3 shadow-sm hover:border-[#FFC554]/40 transition-all duration-150 cursor-pointer active:scale-[0.965] animate-card-enter`}
              >
                {/* Route Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Vehicle Type Icon Container */}
                    <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 ${
                      isDark ? "bg-white/[0.04] border border-white/10" : "bg-black/[0.04] border border-black/10"
                    }`}>
                      <VehicleTypeIcon vehicleType={loop.vehicle_type} size={20} className={isDark ? "text-[#FFC554]" : "text-[#881337]"} strokeWidth={2} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold opacity-60">
                        <MapPin size={12} className="text-[#FFC554] shrink-0" />
                        <span className="truncate">{loop.start_point || "Campus"}</span>
                        <ArrowRight size={11} className="shrink-0 opacity-40" />
                      </div>
                      <h3 className={`text-sm sm:text-base font-black uppercase tracking-tight line-clamp-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                        {loop.destination}
                      </h3>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={11} /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        <XCircle size={11} /> Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Footer */}
                <div className={`flex items-center justify-between pt-2.5 border-t ${isDark ? "border-white/5" : "border-black/5"} text-[11px] font-bold opacity-75`}>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#FFC554]" />
                    <span>{dateStr}</span>
                    {loop.departure_time && (
                      <span className="opacity-60">• {formatTime(loop.departure_time)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {loop.total_fare ? (
                      <span className="text-[#FFC554] font-black">₹{loop.total_fare}</span>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      <span>{loop.participants_limit || 8} max</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
