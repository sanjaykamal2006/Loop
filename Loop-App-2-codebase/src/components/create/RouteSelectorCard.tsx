"use client";

import React from "react";
import { Flag, ArrowUpDown } from "lucide-react";
import { AutoRickshawIcon } from "@/components/ui/VehicleIcons";
import { formatLocation } from "@/lib/locationFormatter";

interface RouteSelectorCardProps {
  startPoint: string;
  setStartPoint: (val: string) => void;
  dest: string;
  setDest: (val: string) => void;
  onSwap: (e: React.MouseEvent) => void;
  cardBg: string;
  border: string;
  isDark: boolean;
}

export default function RouteSelectorCard({
  startPoint,
  setStartPoint,
  dest,
  setDest,
  onSwap,
  cardBg,
  border,
  isDark,
}: RouteSelectorCardProps) {
  return (
    <div className={`relative ${cardBg} border ${border} rounded-[24px] shadow-sm overflow-hidden`}>
      {/* Row 1: Starting Point */}
      <div className="relative px-4 sm:px-5 py-3.5 pr-14 flex items-center gap-3.5">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? "bg-white/5 text-zinc-300" : "bg-black/5 text-zinc-700"
          }`}
        >
          <AutoRickshawIcon size={22} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <label
            className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider block leading-tight ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}
          >
            Starting Point
          </label>
          <input
            value={startPoint}
            onChange={(e) => setStartPoint(e.target.value)}
            onBlur={() => setStartPoint(formatLocation(startPoint))}
            placeholder="Where from?"
            className={`w-full bg-transparent border-0 outline-none p-0 mt-0.5 text-[15px] sm:text-base font-bold ${
              isDark ? "text-white placeholder:text-zinc-400" : "text-zinc-900 placeholder:text-stone-500"
            }`}
          />
        </div>
      </div>

      {/* Divider with Circular Swap Button */}
      <div className="relative w-full border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap starting point and destination"
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm cursor-pointer ${
            isDark
              ? "bg-[#1c1c1e] border border-white/15 text-[#FFC554] hover:border-[#FFC554]/50"
              : "bg-white border border-black/10 text-[#881337] hover:border-[#881337]/50"
          }`}
        >
          <ArrowUpDown size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* Row 2: Destination */}
      <div className="relative px-4 sm:px-5 py-3.5 pr-14 flex items-center gap-3.5">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative ${
            isDark ? "bg-white/5 text-zinc-300" : "bg-black/5 text-zinc-700"
          }`}
        >
          <AutoRickshawIcon size={22} strokeWidth={1.8} />
          <Flag
            size={10}
            strokeWidth={2.6}
            className={`absolute bottom-1 right-1 ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <label
            className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider block leading-tight ${
              isDark ? "text-zinc-400" : "text-stone-600"
            }`}
          >
            Destination
          </label>
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            onBlur={() => setDest(formatLocation(dest))}
            placeholder="Where to?"
            className={`w-full bg-transparent border-0 outline-none p-0 mt-0.5 text-[15px] sm:text-base font-bold ${
              isDark ? "text-white placeholder:text-zinc-400" : "text-zinc-900 placeholder:text-stone-500"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
