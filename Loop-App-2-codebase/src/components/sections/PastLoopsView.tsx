"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { History, MapPin, Clock, Users, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { Loop } from "@/lib/types";

export default function PastLoopsView() {
  const { session, setView, setSelectedLoop, formatTime, theme } = useLoop();
  const { isDark, cardBg, border, mutedText, text } = theme;

  const [pastLoops, setPastLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPastLoops = async () => {
    setLoading(true);
    try {
      // 1. Get loops where user is creator
      const { data: createdLoops } = await supabase
        .from("loops")
        .select("*")
        .eq("creator_id", session.user.id)
        .in("status", ["ended", "cancelled"]);

      // 2. Get loops where user was a member
      const { data: memberRows } = await supabase
        .from("loop_members")
        .select("loop_id, loops(*)")
        .eq("user_id", session.user.id);

      const memberLoops = (memberRows || [])
        .map((r: any) => r.loops)
        .filter((l: any) => l && (l.status === "ended" || l.status === "cancelled"));

      // Combine and deduplicate
      const allLoopsMap = new Map<string, Loop>();
      (createdLoops || []).forEach((l: any) => allLoopsMap.set(l.id, l));
      memberLoops.forEach((l: any) => allLoopsMap.set(l.id, l));

      const sorted = Array.from(allLoopsMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPastLoops(sorted);
    } catch (err) {
      console.error("Error fetching past loops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastLoops();
  }, [session.user.id]);

  const handleSelectLoop = (loop: Loop) => {
    setSelectedLoop(loop);
    setView("ride-details");
  };

  return (
    <div className="space-y-4 pt-1 pb-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("profile")}
            aria-label="Back to profile"
            className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shadow-sm`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Ride History</h2>
            <p className={`text-[11px] font-bold ${mutedText}`}>Your completed & previous rides</p>
          </div>
        </div>

        <button
          onClick={fetchPastLoops}
          disabled={loading}
          aria-label="Refresh history"
          className={`w-9 h-9 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shrink-0`}
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-[#FFC554]" : "opacity-70"} />
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FFC554] border-t-transparent rounded-full animate-spin" />
          <p className={`text-xs font-bold ${mutedText}`}>Loading your ride history...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && pastLoops.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 px-4">
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
            onClick={() => setView("home")}
            className="mt-2 px-6 py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-full active:scale-95 shadow-xl shadow-[#FFC554]/10 transition-transform"
          >
            Find Active Loops
          </button>
        </div>
      )}

      {/* Past Loops List */}
      {!loading && pastLoops.length > 0 && (
        <div className="space-y-3">
          {pastLoops.map((loop) => {
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
                onClick={() => handleSelectLoop(loop)}
                className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-3 shadow-sm hover:border-[#FFC554]/40 transition-all cursor-pointer active:scale-[0.99]`}
              >
                {/* Route Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold opacity-60">
                      <MapPin size={13} className="text-[#FFC554] shrink-0" />
                      <span className="truncate">{loop.start_point || "Campus"}</span>
                      <ArrowRight size={12} className="shrink-0 opacity-40" />
                    </div>
                    <h3 className="text-base font-black uppercase tracking-tight text-white line-clamp-1">
                      {loop.destination}
                    </h3>
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
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-bold opacity-70">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#FFC554]" />
                    <span>{dateStr}</span>
                    {loop.departure_time && (
                      <span className="opacity-50">• {formatTime(loop.departure_time)}</span>
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
