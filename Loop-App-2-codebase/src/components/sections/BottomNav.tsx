"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme, profile, setShowGenderSelect, setPendingAction, unreadLoopIds } = useLoop();
  const { bg, border, mutedText, isDark } = theme;

  if (view === "chat" || view === "ride-details") return null;

  const handleNavClick = (v: View) => {
    triggerHaptic(10);
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

  const items: { v: View; icon: (isActive: boolean) => React.ReactNode; label: string }[] = [
    {
      v: "home",
      icon: (isActive) => (
        <MapPin
          size={22}
          className={isActive ? "fill-[#FFC554]/15 text-[#FFC554]" : "text-current"}
          strokeWidth={isActive ? 2.8 : 2}
        />
      ),
      label: "Home",
    },
    {
      v: "create",
      icon: (isActive) => (
        <Plus
          size={24}
          className={isActive ? "text-[#FFC554]" : "text-current"}
          strokeWidth={isActive ? 3.5 : 2.2}
        />
      ),
      label: "Create",
    },
    {
      v: "chat-list",
      icon: (isActive) => (
        <MessageSquare
          size={21}
          className={isActive ? "fill-[#FFC554]/15 text-[#FFC554]" : "text-current"}
          strokeWidth={isActive ? 2.8 : 2}
        />
      ),
      label: "Chat",
    },
    {
      v: "profile",
      icon: (isActive) => (
        <Users
          size={22}
          className={isActive ? "fill-[#FFC554]/15 text-[#FFC554]" : "text-current"}
          strokeWidth={isActive ? 2.8 : 2}
        />
      ),
      label: "Profile",
    },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className={`absolute bottom-0 left-0 right-0 ${bg} border-t ${border} flex items-center justify-around px-2 z-20 pb-5 pt-2.5 backdrop-blur-xl ${
        isDark ? "bg-black/95" : "bg-white/95"
      }`}
    >
      {items.map(({ v, icon, label }) => {
        const isActive =
          v === "profile"
            ? view === "profile" || view === "trusted-vehicles" || view === "past-loops"
            : view === v;

        return (
          <button
            key={v}
            onClick={() => handleNavClick(v)}
            aria-label={`${label} navigation tab`}
            className={`flex flex-col items-center justify-center gap-1 active:scale-90 flex-1 py-1 relative transition-all duration-200 cursor-pointer ${
              isActive ? "text-[#FFC554]" : mutedText
            }`}
          >
            <div className="relative flex items-center justify-center">
              {icon(isActive)}

              {/* Unread Chat Badge */}
              {v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFC554] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFC554] border border-black shadow-[0_0_6px_#FFC554]" />
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] font-black uppercase tracking-wider transition-all ${
                isActive ? "opacity-100 text-[#FFC554]" : "opacity-50"
              }`}
            >
              {label}
            </span>

            {/* Subtle Minimal Active Indicator Dot */}
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-[#FFC554] absolute -bottom-1 shadow-[0_0_4px_#FFC554]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
