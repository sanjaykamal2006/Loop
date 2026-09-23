"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme, profile, setShowGenderSelect, setPendingAction, unreadLoopIds, liquidGlass } = useLoop();
  const { isDark } = theme;

  if (view === "chat" || view === "ride-details" || view === "changelog") return null;

  const handleNavClick = (v: View) => {
    triggerHaptic(14);
    if (v === "create") {
      const isProfileComplete = Boolean(
        profile.gender && 
        profile.display_name?.trim() && 
        profile.reg_no?.trim()
      );
      if (!isProfileComplete) {
        setPendingAction({ type: "create" });
        setShowGenderSelect(true);
        return;
      }
    }
    setView(v);
  };

  const items: {
    v: View;
    icon: (isActive: boolean) => React.ReactNode;
    label: string;
  }[] = [
    {
      v: "home",
      label: "Home",
      icon: (isActive) => (
        <MapPin
          size={22}
          strokeWidth={isActive ? 2.6 : 1.9}
          className={`transition-colors duration-200 ${
            isActive
              ? isDark ? "text-[#FFC554]" : "text-[#881337]"
              : isDark ? "text-zinc-500" : "text-zinc-400"
          }`}
        />
      ),
    },
    {
      v: "create",
      label: "Create",
      icon: (isActive) => (
        <Plus
          size={23}
          strokeWidth={isActive ? 3 : 2.1}
          className={`transition-colors duration-200 ${
            isActive
              ? isDark ? "text-[#FFC554]" : "text-[#881337]"
              : isDark ? "text-zinc-500" : "text-zinc-400"
          }`}
        />
      ),
    },
    {
      v: "chat-list",
      label: "Chat",
      icon: (isActive) => (
        <MessageSquare
          size={21}
          strokeWidth={isActive ? 2.6 : 1.9}
          className={`transition-colors duration-200 ${
            isActive
              ? isDark ? "text-[#FFC554]" : "text-[#881337]"
              : isDark ? "text-zinc-500" : "text-zinc-400"
          }`}
        />
      ),
    },
    {
      v: "profile",
      label: "Profile",
      icon: (isActive) => (
        <Users
          size={22}
          strokeWidth={isActive ? 2.6 : 1.9}
          className={`transition-colors duration-200 ${
            isActive
              ? isDark ? "text-[#FFC554]" : "text-[#881337]"
              : isDark ? "text-zinc-500" : "text-zinc-400"
          }`}
        />
      ),
    },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className={`absolute bottom-0 left-0 right-0 z-30 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 backdrop-blur-2xl transition-all duration-300 ${
        liquidGlass
          ? (isDark ? "liquid-glass-nav-dark" : "liquid-glass-nav-light")
          : (isDark
              ? "bg-black/90 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]"
              : "bg-white/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]")
      }`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map(({ v, icon, label }) => {
          const isActive =
            v === "profile"
              ? view === "profile" || view === "trusted-vehicles" || view === "past-loops"
              : view === v;

          return (
            <button
              key={v}
              onClick={() => handleNavClick(v)}
              aria-label={`${label} tab`}
              className="flex flex-col items-center justify-center flex-1 py-0.5 relative select-none cursor-pointer group active:scale-[0.91] transition-transform duration-100"
            >
              {/* Icon Container with refined micro-settle physics & active pill backdrop */}
              <div
                key={`${v}-${isActive}`}
                className={`relative px-3.5 py-1 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? liquidGlass
                      ? isDark
                        ? "liquid-glass-pill-dark shadow-[0_0_14px_rgba(255,197,84,0.22)] animate-tab-settle"
                        : "liquid-glass-pill-light shadow-[0_0_14px_rgba(136,19,55,0.15)] animate-tab-settle"
                      : isDark
                      ? "bg-[#FFC554]/15 shadow-[0_0_12px_rgba(255,197,84,0.15)] animate-tab-settle"
                      : "bg-[#881337]/10 shadow-[0_0_12px_rgba(136,19,55,0.1)] animate-tab-settle"
                    : "group-hover:bg-white/5"
                }`}
              >
                {icon(isActive)}

                {/* Unread Chat Radar Badge */}
                {v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isDark ? "bg-[#FFC554]" : "bg-[#881337]"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isDark
                          ? "bg-[#FFC554] border border-black shadow-[0_0_6px_#FFC554]"
                          : "bg-[#881337] border border-white"
                      }`}
                    />
                  </span>
                )}
              </div>

              {/* Title Case Label */}
              <span
                className={`text-[11px] sm:text-xs tracking-tight mt-0.5 transition-colors duration-200 ${
                  isActive
                    ? isDark
                      ? "text-white font-black"
                      : "text-zinc-950 font-black"
                    : isDark
                    ? "text-zinc-500 font-medium"
                    : "text-zinc-400 font-medium"
                }`}
              >
                {label}
              </span>

              {/* Dynamic Active Indicator Pill */}
              <span
                className={`h-0.5 rounded-full mt-0.5 transition-all duration-300 ${
                  isActive
                    ? isDark
                      ? "w-3.5 bg-[#FFC554] opacity-100 shadow-[0_0_6px_#FFC554]"
                      : "w-3.5 bg-[#881337] opacity-100 shadow-[0_0_6px_rgba(136,19,55,0.5)]"
                    : "w-0 opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
