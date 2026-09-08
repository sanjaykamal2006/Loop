"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, Users } from "lucide-react";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme, profile, setShowGenderSelect, setPendingAction, unreadLoopIds } = useLoop();
  const { bg, border, mutedText } = theme;

  if (view === "chat" || view === "ride-details") return null;

  const handleNavClick = (v: View) => {
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

  const items: { v: View; icon: React.ReactNode; label: string }[] = [
    {
      v: "home",
      icon: <MapPin size={24} className={view === "home" ? "fill-[#FFC554]/20" : ""} strokeWidth={view === "home" ? 3 : 2} />,
      label: "Home",
    },
    {
      v: "create",
      icon: <Plus size={24} strokeWidth={view === "create" ? 4 : 2.5} />,
      label: "Create",
    },
    {
      v: "chat-list",
      icon: <MessageSquare size={24} className={view === "chat-list" ? "fill-[#FFC554]/20" : ""} strokeWidth={view === "chat-list" ? 3 : 2} />,
      label: "Chat",
    },
    {
      v: "profile",
      icon: <Users size={24} className={view === "profile" ? "fill-[#FFC554]/20" : ""} strokeWidth={view === "profile" ? 3 : 2} />,
      label: "Profile",
    },
  ];

  return (
    <nav className={`absolute bottom-0 left-0 right-0 ${bg} border-t ${border} flex items-center justify-around px-2 z-20 pb-5 pt-3`}>
      {items.map(({ v, icon, label }) => (
        <button
          key={v}
          onClick={() => handleNavClick(v)}
          aria-label={`${label} navigation tab`}
          className={`flex flex-col items-center gap-1.5 active:scale-90 flex-1 py-1 relative ${view === v ? "text-[#FFC554]" : mutedText}`}
        >
          <div className="relative">
            {icon}
            {v === "chat-list" && unreadLoopIds && unreadLoopIds.length > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFC554] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFC554] border border-black shadow-[0_0_6px_#FFC554]"></span>
              </span>
            )}
          </div>
          <span className={`text-[11px] font-bold tracking-tight ${view === v ? "opacity-100" : "opacity-50"}`}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
