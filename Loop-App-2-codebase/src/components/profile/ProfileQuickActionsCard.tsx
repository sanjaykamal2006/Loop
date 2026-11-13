"use client";

import React from "react";
import { History, ShieldCheck, Bell, ChevronRight, Moon, Sun, FileText } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { AppTheme } from "@/lib/types";

interface ProfileQuickActionsCardProps {
  onNavigate: (view: "past-loops" | "trusted-vehicles") => void;
  notifEnabled: boolean;
  onToggleNotifications: () => Promise<void>;
  onTestAlert: (e: React.MouseEvent) => Promise<void>;
  toggleTheme?: () => void;
  setTheme?: (theme: AppTheme) => void;
  currentTheme?: AppTheme;
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
  toggleTheme,
  setTheme,
  currentTheme,
  cardBg,
  border,
  isDark,
  isPaper,
}: ProfileQuickActionsCardProps) {
  const activeTheme: AppTheme = currentTheme || (isDark ? "dark" : isPaper ? "paper" : "light");

  const handleSelectTheme = (theme: AppTheme) => {
    triggerHaptic(14);
    if (setTheme) {
      setTheme(theme);
    } else if (toggleTheme) {
      toggleTheme();
    }
  };
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

      {/* 3-Way Theme Appearance Slider */}
      <div className="w-full px-4.5 py-3.5 sm:py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${
                activeTheme === "dark"
                  ? "bg-amber-500/15 text-[#FFC554]"
                  : activeTheme === "paper"
                  ? "bg-amber-400/20 text-[#DF6B3C]"
                  : "bg-rose-500/15 text-[#881337]"
              } flex items-center justify-center shrink-0`}
            >
              {activeTheme === "dark" ? (
                <Moon size={18} strokeWidth={2.5} />
              ) : activeTheme === "paper" ? (
                <FileText size={18} strokeWidth={2.5} />
              ) : (
                <Sun size={18} strokeWidth={2.5} />
              )}
            </div>
            <div>
              <span className={`text-[13px] sm:text-sm font-bold block ${isDark ? "text-white" : isPaper ? "text-[#2A2420]" : "text-zinc-900"}`}>
                Appearance
              </span>
              <span className={`text-[10px] font-medium block ${isDark ? "text-zinc-400" : isPaper ? "text-[#6B6660]" : "text-zinc-500"}`}>
                {activeTheme === "dark" ? "Dark mode" : activeTheme === "paper" ? "Looseleaf notebook" : "Light mode"}
              </span>
            </div>
          </div>
        </div>

        {/* The 3-way sliding track */}
        <div
          role="radiogroup"
          aria-label="Theme mode"
          className={`relative p-1 rounded-2xl flex items-center justify-between transition-all select-none ${
            isDark
              ? "bg-zinc-900/90 border border-zinc-800"
              : isPaper
              ? "bg-[#EFE8D8] border-[1.5px] border-[#2A2420] shadow-[inset_0_2px_4px_rgba(42,36,32,0.12)]"
              : "bg-zinc-200/80 border border-zinc-300"
          }`}
        >
          {/* Animated sliding thumb indicator */}
          <div
            aria-hidden="true"
            className={`absolute top-1 bottom-1 w-[calc(33.333%-2px)] rounded-xl transition-transform duration-200 ease-out pointer-events-none ${
              activeTheme === "dark"
                ? "translate-x-0 bg-[#FFC554] shadow-sm"
                : activeTheme === "light"
                ? "translate-x-[calc(100%+3px)] bg-[#881337] shadow-sm"
                : "translate-x-[calc(200%+6px)] bg-[#F8DC4C] border-[1.5px] border-[#2A2420] shadow-[1.5px_2px_0px_#2A2420]"
            }`}
          />

          {/* Option 1: Dark */}
          <button
            type="button"
            role="radio"
            aria-checked={activeTheme === "dark"}
            onClick={() => handleSelectTheme("dark")}
            className={`relative z-10 flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
              activeTheme === "dark"
                ? "text-black"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Moon size={13} strokeWidth={activeTheme === "dark" ? 3 : 2} />
            <span>Dark</span>
          </button>

          {/* Option 2: Light */}
          <button
            type="button"
            role="radio"
            aria-checked={activeTheme === "light"}
            onClick={() => handleSelectTheme("light")}
            className={`relative z-10 flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
              activeTheme === "light"
                ? "text-white"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Sun size={13} strokeWidth={activeTheme === "light" ? 3 : 2} />
            <span>Light</span>
          </button>

          {/* Option 3: Paper */}
          <button
            type="button"
            role="radio"
            aria-checked={activeTheme === "paper"}
            onClick={() => handleSelectTheme("paper")}
            className={`relative z-10 flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
              activeTheme === "paper"
                ? "text-[#2A2420]"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : isPaper
                ? "text-[#6B6660] hover:text-[#2A2420]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <FileText size={13} strokeWidth={activeTheme === "paper" ? 3 : 2} />
            <span>Paper</span>
          </button>
        </div>
      </div>
    </div>
  );
}
