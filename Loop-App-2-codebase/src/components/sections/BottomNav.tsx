"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, User } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme, profile, setShowGenderSelect, setPendingAction, unreadLoopIds } = useLoop();
  const { isDark } = theme;

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
          size={20}
          className={isActive ? "text-black" : "text-current"}
          strokeWidth={isActive ? 2.6 : 2}
        />
      ),
      label: "Home",
    },
    {
      v: "create",
      icon: (isActive) => (
        <Plus
          size={22}
          className={isActive ? "text-black" : "text-current"}
          strokeWidth={isActive ? 3.2 : 2.2}
        />
      ),
      label: "Create",
    },
    {
      v: "chat-list",
      icon: (isActive) => (
        <MessageSquare
          size={19}
          className={isActive ? "text-black" : "text-current"}
          strokeWidth={isActive ? 2.6 : 2}
        />
      ),
      label: "Chat",
    },
    {
      v: "profile",
      icon: (isActive) => (
        <User
          size={20}
          className={isActive ? "text-black" : "text-current"}
          strokeWidth={isActive ? 2.6 : 2}
        />
      ),
      label: "Profile",
    },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className={`absolute bottom-5 left-4 right-4 max-w-[390px] mx-auto rounded-full p-1.5 flex items-center justify-between z-30 backdrop-blur-2xl transition-all duration-300 ${
        isDark
          ? "bg-[#121214]/90 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
          : "bg-white/90 border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
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
            className={`relative h-11 flex items-center justify-center rounded-full transition-all duration-300 ease-out cursor-pointer active:scale-95 select-none ${
              isActive
                ? "bg-[#FFC554] text-black font-black px-4 shadow-lg shadow-[#FFC554]/20"
                : `${
                    isDark
                      ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-black/5"
                  } px-3`
            }`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              {icon(isActive)}

              {/* Unread Chat Badge when inactive */}
              {!isActive && v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isDark ? "bg-[#FFC554]" : "bg-[#B45309]"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isDark ? "bg-[#FFC554] border border-black" : "bg-[#B45309] border border-white"
                  }`} />
                </span>
              )}
            </div>

            {/* Expanding Label for active tab */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out flex items-center ${
                isActive ? "max-w-24 opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
              }`}
            >
              <span className="text-xs font-black tracking-wider uppercase whitespace-nowrap">
                {label}
              </span>

              {/* Unread Chat Badge when active */}
              {isActive && v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-black ml-1.5 shrink-0 animate-pulse" />
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
