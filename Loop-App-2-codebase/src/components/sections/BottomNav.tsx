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

  const activeIndex = items.findIndex(({ v }) =>
    v === "profile"
      ? view === "profile" || view === "trusted-vehicles" || view === "past-loops"
      : view === v
  );

  return (
    <nav
      aria-label="Main Navigation"
      className={`absolute bottom-2.5 left-3 right-3 max-w-md mx-auto z-30 py-1.5 px-2 rounded-[28px] border backdrop-blur-2xl transition-all duration-300 shadow-2xl ${
        isDark
          ? "bg-black/85 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          : "bg-white/90 border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      }`}
    >
      <div className="relative flex items-center justify-around w-full">
        {/* Fluid Sliding Active Pill */}
        {activeIndex !== -1 && (
          <div
            className="absolute top-0.5 bottom-0.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-none p-1"
            style={{
              left: `${activeIndex * 25}%`,
              width: "25%",
            }}
          >
            <div
              className={`w-full h-full rounded-2xl transition-colors duration-300 ${
                isDark
                  ? "bg-[#FFC554]/15 shadow-[0_0_16px_rgba(255,197,84,0.18)]"
                  : "bg-[#881337]/10 shadow-[0_0_16px_rgba(136,19,55,0.12)]"
              }`}
            />
          </div>
        )}

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
              className="flex flex-col items-center justify-center flex-1 py-1 relative z-10 select-none cursor-pointer group active:scale-[0.91] transition-transform duration-100"
            >
              <div className="relative flex items-center justify-center">
                {icon(isActive)}

                {/* Unread Chat Radar Badge */}
                {v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
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
                className={`text-[10px] tracking-tight mt-1 transition-colors duration-200 ${
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
            </button>
          );
        })}
      </div>
    </nav>
  );
}
