"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme, profile, setShowGenderSelect, setPendingAction, unreadLoopIds } = useLoop();
  const { isDark } = theme;

  if (view === "chat" || view === "ride-details") return null;

  const handleNavClick = (v: View) => {
    triggerHaptic(12);
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
    animClass: string;
  }[] = [
    {
      v: "home",
      label: "Home",
      animClass: "animate-pin-bounce",
      icon: (isActive) => (
        <MapPin
          size={23}
          strokeWidth={isActive ? 2.5 : 1.9}
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
      animClass: "animate-plus-pop",
      icon: (isActive) => (
        <Plus
          size={24}
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
      animClass: "animate-chat-wiggle",
      icon: (isActive) => (
        <MessageSquare
          size={22}
          strokeWidth={isActive ? 2.5 : 1.9}
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
      animClass: "animate-profile-pop",
      icon: (isActive) => (
        <Users
          size={23}
          strokeWidth={isActive ? 2.5 : 1.9}
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
      className={`absolute bottom-0 left-0 right-0 z-30 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 backdrop-blur-2xl transition-colors duration-300 ${
        isDark
          ? "bg-black/90 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]"
          : "bg-white/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map(({ v, icon, label, animClass }) => {
          const isActive =
            v === "profile"
              ? view === "profile" || view === "trusted-vehicles" || view === "past-loops" || view === "changelog"
              : view === v;

          return (
            <button
              key={v}
              onClick={() => handleNavClick(v)}
              aria-label={`${label} tab`}
              className="flex flex-col items-center justify-center flex-1 py-1 relative select-none cursor-pointer group active:scale-95 transition-transform"
            >
              {/* Icon Container with Zomato V14 spring animation */}
              <div
                key={`${v}-${isActive}`}
                className={`relative flex items-center justify-center ${
                  isActive ? animClass : "group-hover:scale-105"
                }`}
              >
                {icon(isActive)}

                {/* Unread Chat Radar Badge */}
                {v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-1 flex h-2.5 w-2.5">
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
                className={`text-[11px] sm:text-xs tracking-tight mt-1 transition-colors duration-200 ${
                  isActive
                    ? isDark
                      ? "text-white font-bold"
                      : "text-zinc-950 font-bold"
                    : isDark
                    ? "text-zinc-500 font-medium"
                    : "text-zinc-400 font-medium"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Native Home Indicator Pill Bar */}
      <div
        className={`w-28 h-1 rounded-full mx-auto mt-2 transition-colors ${
          isDark ? "bg-white/15" : "bg-black/10"
        }`}
      />
    </nav>
  );
}
