"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { ChevronLeft, Plus, Sun, Moon } from "lucide-react";

export default function AppHeader() {
  const { view, setView, selectedLoop, theme, toggleTheme } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  return (
    <header className="px-5 py-4 shrink-0 relative z-10 flex items-center justify-between">
      {view === "home" && (
        <div className="pt-2">
          <h1 className="text-3xl font-black tracking-tighter leading-none">LOOP</h1>
          <p className="text-xs font-medium opacity-50 mt-1">Rides go better in Loop.</p>
        </div>
      )}
      {(view === "create" || view === "ride-details" || view === "chat") && (
        <div className="flex items-center justify-between w-full pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView(view === "chat" ? "chat-list" : "home")}
              className={`w-10 h-10 rounded-full border ${border} flex items-center justify-center ${cardBg} active:scale-90 shadow-sm`}
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">
              {view === "create" ? "New Loop" : view === "chat" ? selectedLoop?.destination : "Ride Details"}
            </h1>
          </div>
          {view === "create" && (
            <button onClick={() => setView("home")} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 ">
              <Plus size={20} className="rotate-45" />
            </button>
          )}
        </div>
      )}
      {view === "chat-list" && (
        <div className="pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
          <p className="text-xs font-medium opacity-50 mt-1">Your active conversations</p>
        </div>
      )}
      {view === "profile" && (
        <div className="flex items-center justify-between w-full pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 ">
            {isDark ? <Sun size={18} className="text-[#FFC554]" /> : <Moon size={18} />}
          </button>
        </div>
      )}
    </header>
  );
}
