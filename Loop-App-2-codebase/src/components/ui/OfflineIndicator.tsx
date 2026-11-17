"use client";

import React, { useState, useEffect, useRef } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useLoop } from "@/lib/LoopContext";

interface OfflineIndicatorProps {
  isDark: boolean;
  isPaper?: boolean;
}

export default function OfflineIndicator({ isDark, isPaper = false }: OfflineIndicatorProps) {
  const { fetchLoops, fetchUserMemberships } = useLoop();
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
      haptic.warning();
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      haptic.success();

      // Silently re-sync rides and memberships upon reconnection
      fetchLoops?.(true);
      fetchUserMemberships?.(true);

      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }
      reconnectedTimeoutRef.current = setTimeout(() => {
        setShowReconnected(false);
      }, 2600);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }
    };
  }, [fetchLoops, fetchUserMemberships]);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full px-4 pt-1 pb-1 z-30 animate-fade-in flex justify-center shrink-0"
    >
      <div
        className={`px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-2 select-none shadow-sm transition-all duration-300 ${
          isOffline
            ? isPaper
              ? "bg-[#FFE8A3] border-2 border-[#2A2420] text-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
              : isDark
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
              : "bg-amber-100 border border-amber-300 text-amber-900"
            : isPaper
            ? "bg-[#D1F2D9] border-2 border-[#2A2420] text-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
            : isDark
            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
            : "bg-emerald-100 border border-emerald-300 text-emerald-900"
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff size={13} strokeWidth={2.6} className="animate-pulse shrink-0" />
            <span className="tracking-tight text-[11px]">
              Offline Mode • Showing cached rides
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={13} strokeWidth={2.6} className="shrink-0 text-emerald-500" />
            <span className="tracking-tight text-[11px]">
              Back Online • Synced
            </span>
          </>
        )}
      </div>
    </div>
  );
}
