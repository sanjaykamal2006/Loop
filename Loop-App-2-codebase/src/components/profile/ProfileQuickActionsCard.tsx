"use client";

import React from "react";
import { History, ShieldCheck, Bell, ChevronRight, Moon, Sun } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface ProfileQuickActionsCardProps {
  onNavigate: (view: "past-loops" | "trusted-vehicles") => void;
  notifEnabled: boolean;
  onToggleNotifications: () => Promise<void>;
  onTestAlert: (e: React.MouseEvent) => Promise<void>;
  toggleTheme: () => void;
  cardBg: string;
  border: string;
  isDark: boolean;
}

export default function ProfileQuickActionsCard({
  onNavigate,
  notifEnabled,
  onToggleNotifications,
  onTestAlert,
  toggleTheme,
  cardBg,
  border,
  isDark,
}: ProfileQuickActionsCardProps) {
  return (
    <div
      className={`${cardBg} border ${border} rounded-[24px] overflow-hidden shadow-sm divide-y ${
        isDark ? "divide-white/5" : "divide-black/5"
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
                isDark
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
                ? isDark
                  ? "bg-[#FFC554] justify-end"
                  : "bg-[#881337] justify-end"
                : isDark
                ? "bg-white/15 justify-start"
                : "bg-black/15 justify-start"
            }`}
          >
            <div
              className={`w-5.5 h-5.5 rounded-full shadow-sm ${
                notifEnabled ? (isDark ? "bg-black" : "bg-white") : "bg-zinc-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Theme Appearance Toggle */}
      <div className="w-full px-4.5 py-3.5 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${
              isDark ? "bg-amber-500/15 text-[#FFC554]" : "bg-rose-500/15 text-[#881337]"
            } flex items-center justify-center shrink-0`}
          >
            {isDark ? <Moon size={18} strokeWidth={2.5} /> : <Sun size={18} strokeWidth={2.5} />}
          </div>
          <span className={`text-[13px] sm:text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Appearance
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${border} ${cardBg} flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer`}
        >
          {isDark ? (
            <>
              <Moon size={13} className="text-[#FFC554]" />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun size={13} className="text-[#881337]" />
              <span className="text-[#881337]">Light</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
