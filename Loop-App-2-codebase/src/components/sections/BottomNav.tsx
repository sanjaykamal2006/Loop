"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Plus, MessageSquare, Users } from "lucide-react";
import type { View } from "@/lib/types";

export default function BottomNav() {
  const { view, setView, theme } = useLoop();
  const { bg, border, mutedText } = theme;

  if (view === "chat" || view === "ride-details") return null;

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
          onClick={() => setView(v)}
          className={`flex flex-col items-center gap-1.5 active:scale-90  flex-1 py-1 ${view === v ? "text-[#FFC554]" : mutedText}`}
        >
          {icon}
          <span className={`text-[11px] font-bold tracking-tight ${view === v ? "opacity-100" : "opacity-50"}`}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
