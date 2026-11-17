"use client";

import React, { useState, useEffect, useRef } from "react";
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
      }, 1800);
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
      className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-300 animate-ios-fade"
    >
      <div
        className={`h-6 px-3 rounded-full flex items-center gap-1.5 select-none text-[10px] font-black uppercase tracking-widest ${
          isOffline
            ? isPaper
              ? "bg-[#FAF7EE] border-2 border-[#2A2420] text-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
              : isDark
              ? "bg-black/90 border border-[#FFC554]/40 text-[#FFC554] shadow-lg shadow-black/80 backdrop-blur-md"
              : "bg-white/95 border border-zinc-300 text-zinc-900 shadow-sm backdrop-blur-md"
            : isPaper
            ? "bg-[#FAF7EE] border-2 border-[#2A2420] text-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
            : isDark
            ? "bg-black/90 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-black/80 backdrop-blur-md"
            : "bg-white/95 border border-emerald-500/30 text-emerald-700 shadow-sm backdrop-blur-md"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isOffline
              ? isPaper
                ? "bg-[#2A2420] animate-pulse"
                : isDark
                ? "bg-[#FFC554] animate-pulse"
                : "bg-zinc-800 animate-pulse"
              : "bg-emerald-500"
          }`}
        />
        <span>{isOffline ? "Offline" : "Synced"}</span>
      </div>
    </div>
  );
}
