"use client";

import React from "react";
import { History, ShieldCheck, Bell, ChevronRight } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { AppTheme } from "@/lib/types";

interface ProfileQuickActionsCardProps {
  onNavigate: (view: "past-loops" | "trusted-vehicles") => void;
  notifEnabled: boolean;
  onToggleNotifications: () => Promise<void>;
  onTestAlert: (e: React.MouseEvent) => Promise<void>;
  toggleTheme?: () => void;
  setTheme?: (theme: AppTheme) => void;
  activeTheme?: AppTheme;
  cardBg: string;
  border: string;
  isDark: boolean;
  isPaper?: boolean;
}

export default function ProfileQuickActionsCard({
  onNavigate,
  notifEnabled,
  onToggleNotifications,
  onTestAlert,
  cardBg,
  border,
  isDark,
  isPaper = false,
}: ProfileQuickActionsCardProps) {
  return (
    <div
      className={`${cardBg} ${
        isPaper
          ? "border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
          : `border ${border} shadow-sm`
      } rounded-[24px] overflow-hidden divide-y ${
        isPaper
          ? "divide-[#2A2420]/15"
          : isDark
          ? "divide-white/5"
          : "divide-black/5"
      }`}
    >
      {/* Past Loops */}
      <button
        onClick={() => onNavigate("past-loops")}
        className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
            <History size={18} strokeWidth={2.5} />
          </div>
          <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Past Loops (History)
          </span>
        </div>
        <ChevronRight size={16} className="opacity-40" />
      </button>

      {/* Trusted Drivers */}
      <button
        onClick={() => {
          triggerHaptic(10);
          onNavigate("trusted-vehicles");
        }}
        className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck size={18} strokeWidth={2.5} />
          </div>
          <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Trusted Drivers
          </span>
        </div>
        <ChevronRight size={16} className="opacity-40" />
      </button>

      {/* Ride Notifications */}
      <div className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${
              notifEnabled ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-zinc-400"
            } flex items-center justify-center transition-colors shrink-0`}
          >
            <Bell size={18} strokeWidth={2.5} />
          </div>
          <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Ride Notifications
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {notifEnabled && (
            <button
              type="button"
              onClick={onTestAlert}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border active:scale-95 transition-all ${
                isPaper
                  ? "bg-[#FFC554] text-[#2A2420] border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                  : isDark
                  ? "bg-white/10 text-[#FFC554] border-white/15"
                  : "bg-black/5 text-[#881337] border-black/10"
              }`}
            >
              Test
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={notifEnabled}
            aria-label="Enable notifications"
            onClick={onToggleNotifications}
            className={`w-11 h-6.5 rounded-full p-0.5 transition-colors ease-in-out flex items-center cursor-pointer ${
              notifEnabled
                ? isPaper
                  ? "bg-[#FFC554] border border-[#2A2420] justify-end"
                  : isDark
                  ? "bg-[#FFC554] justify-end"
                  : "bg-[#881337] justify-end"
                : isPaper
                ? "bg-[#EFE8D8] border border-[#2A2420]/30 justify-start"
                : isDark
                ? "bg-white/15 justify-start"
                : "bg-black/15 justify-start"
            }`}
          >
            <div
              className={`w-5.5 h-5.5 rounded-full shadow-sm ${
                notifEnabled
                  ? isPaper
                    ? "bg-[#2A2420]"
                    : isDark ? "bg-black" : "bg-white"
                  : isPaper
                  ? "bg-[#8E887F]"
                  : "bg-zinc-400"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
