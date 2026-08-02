"use client";

import React from "react";
import { Session } from "@supabase/supabase-js";
import { LoopProvider, useLoop } from "@/lib/LoopContext";

import AppHeader from "./AppHeader";
import HomeView from "./HomeView";
import CreateView from "./CreateView";
import ChatListView from "./ChatListView";
import ChatView from "./ChatView";
import ProfileView from "./ProfileView";
import RideDetailsView from "./RideDetailsView";
import BottomNav from "./BottomNav";
import GenderModal from "./GenderModal";

function AppContent() {
  const { view, selectedLoop, theme, themeTransition } = useLoop();
  const { isDark, bg, text } = theme;

  return (
    <div className={`flex flex-col h-[100dvh] max-w-md mx-auto ${bg} ${text} relative overflow-hidden font-sans`}>
      <div className={`dot-matrix-bg ${isDark ? "text-white" : "text-black"}`} />

      <AppHeader />

      {/* Chat gets its own full-height container */}
      {view === "chat" && selectedLoop ? (
        <ChatView />
      ) : (
        <main className="flex-1 overflow-y-auto relative z-10 px-5 scrollbar-hide pb-28">
          {view === "home" && <HomeView />}
          {view === "create" && <CreateView />}
          {view === "chat-list" && <ChatListView />}
          {view === "profile" && <ProfileView />}
          {view === "ride-details" && selectedLoop && <RideDetailsView />}
        </main>
      )}

      <BottomNav />
      <GenderModal />

      {/* Theme Transition Overlay */}
      {themeTransition && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
          <div 
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.85,0,0.15,1)] ${
              themeTransition.nextTheme === "dark" ? "bg-black" : "bg-[#EFE9DF]"
            }`}
            style={{
              transform: themeTransition.active ? 'translateY(0)' : 'translateY(-100%)',
              transitionDelay: themeTransition.active ? '0ms' : '0ms'
            }}
          >
            {/* The initial off-screen state when mounting is handled by starting at translateY(100%) if we use an initial state, 
                but React might jump. To fix this, we can rely on a CSS animation instead. Let's use a standard scale/fade for simplicity and absolute beauty. */}
          </div>
          
          <div 
             className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-400 ease-out ${
               themeTransition.nextTheme === "dark" ? "bg-black text-white" : "bg-[#EFE9DF] text-[#3D3B38]"
             } ${themeTransition.active ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
          >
            <h1 className="text-6xl font-black tracking-tighter">LOOP</h1>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MainApp({ session }: { session: Session }) {
  return (
    <LoopProvider session={session}>
      <AppContent />
    </LoopProvider>
  );
}
