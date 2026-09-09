"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme, profile, setShowGenderSelect, setPendingAction, unreadLoopIds } = useLoop();
  const { isDark, mutedText } = theme;

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

  const activeIndex =
    view === "home"
      ? 0
      : view === "create"
      ? 1
      : view === "chat-list"
      ? 2
      : view === "profile" || view === "trusted-vehicles" || view === "past-loops"
      ? 3
      : -1;

  const items: { v: View; icon: (isActive: boolean) => React.ReactNode; label: string }[] = [
    {
      v: "home",
      icon: (isActive) => (
        <MapPin
          size={20}
          className={
            isActive
              ? isDark ? "fill-[#FFC554]/25 text-[#FFC554]" : "fill-[#B45309]/20 text-[#B45309]"
              : "text-current"
          }
          strokeWidth={isActive ? 2.8 : 2}
        />
      ),
      label: "Home",
    },
    {
      v: "create",
      icon: (isActive) => (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          isActive
            ? isDark
              ? "bg-[#FFC554] text-black shadow-[0_2px_10px_rgba(255,197,84,0.5)] scale-105"
              : "bg-[#FFC554] text-black shadow-[0_2px_10px_rgba(180,83,9,0.35)] scale-105"
            : isDark
            ? "bg-white/10 text-white"
            : "bg-black/5 text-black"
        }`}>
          <Plus size={16} strokeWidth={isActive ? 3.5 : 2.5} />
        </div>
      ),
      label: "Create",
    },
    {
      v: "chat-list",
      icon: (isActive) => (
        <MessageSquare
          size={19}
          className={
            isActive
              ? isDark ? "fill-[#FFC554]/25 text-[#FFC554]" : "fill-[#B45309]/20 text-[#B45309]"
              : "text-current"
          }
          strokeWidth={isActive ? 2.8 : 2}
        />
      ),
      label: "Chat",
    },
    {
      v: "profile",
      icon: (isActive) => (
        <Users
          size={20}
          className={
            isActive
              ? isDark ? "fill-[#FFC554]/25 text-[#FFC554]" : "fill-[#B45309]/20 text-[#B45309]"
              : "text-current"
          }
          strokeWidth={isActive ? 2.8 : 2}
        />
      ),
      label: "Profile",
    },
  ];

  return (
    <div className="absolute bottom-3 left-3.5 right-3.5 z-30 pointer-events-none flex justify-center">
      <nav
        aria-label="Main Navigation"
        className={`w-full max-w-[420px] pointer-events-auto h-[62px] rounded-[28px] p-1.5 flex items-center justify-between relative transition-all duration-300 ${
          isDark
            ? "bg-black/85 backdrop-blur-2xl border border-white/[0.14] shadow-[0_16px_36px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_-1px_1px_0_rgba(0,0,0,0.6)]"
            : "bg-[#FAF8F5]/90 backdrop-blur-2xl border border-black/[0.08] shadow-[0_16px_36px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1px_0_rgba(0,0,0,0.05)]"
        }`}
      >
        {/* Interactive 3D Sliding Active Pill (Spring Glide) */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-1.5 bottom-1.5 rounded-[22px] pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              left: `calc(${activeIndex * 25}% + 3px)`,
              width: "calc(25% - 6px)",
            }}
          >
            <div
              className={`w-full h-full rounded-[22px] ${
                isDark
                  ? "bg-gradient-to-b from-[#FFC554]/25 to-[#FFC554]/10 border border-[#FFC554]/40 shadow-[0_0_20px_rgba(255,197,84,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                  : "bg-gradient-to-b from-[#FFC554]/35 to-[#FFC554]/15 border border-[#FFC554]/60 shadow-[0_4px_16px_rgba(255,197,84,0.3),inset_0_1px_1px_rgba(255,255,255,0.8)]"
              }`}
            />
          </div>
        )}

        {/* Tab Buttons */}
        {items.map(({ v, icon, label }, index) => {
          const isActive = activeIndex === index;

          return (
            <button
              key={v}
              onClick={() => handleNavClick(v)}
              aria-label={`${label} navigation tab`}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative z-10 select-none cursor-pointer transition-transform duration-200 active:scale-90 active:translate-y-0.5 ${
                isActive ? (isDark ? "text-[#FFC554]" : "text-[#B45309]") : mutedText
              }`}
            >
              {/* Icon with 3D elevation */}
              <div className={`relative flex items-center justify-center transition-transform duration-300 ${
                isActive ? "-translate-y-0.5 scale-105" : "opacity-70 hover:opacity-100"
              }`}>
                {icon(isActive)}

                {/* Unread Chat Badge */}
                {v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isDark ? "bg-[#FFC554]" : "bg-[#B45309]"
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isDark
                        ? "bg-[#FFC554] border border-black shadow-[0_0_6px_#FFC554]"
                        : "bg-[#B45309] border border-white shadow-[0_0_6px_rgba(180,83,9,0.4)]"
                    }`} />
                  </span>
                )}
              </div>

              {/* Text Label */}
              <span
                className={`text-[9px] font-black uppercase tracking-wider mt-1 transition-all duration-200 ${
                  isActive ? (isDark ? "opacity-100 text-[#FFC554]" : "opacity-100 text-[#B45309]") : "opacity-50"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
