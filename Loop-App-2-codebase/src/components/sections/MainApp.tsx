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
import TrustedVehiclesView from "./TrustedVehiclesView";
import BottomNav from "./BottomNav";
import GenderModal from "./GenderModal";

function AppContent() {
  const { view, selectedLoop, theme, themeTransition } = useLoop();
  const { isDark, bg, text } = theme;

  return (
    <div className={`flex flex-col h-[100dvh] max-w-md mx-auto ${bg} ${text} relative overflow-hidden font-sans`}>
      <div className={`dot-matrix-bg transition-colors duration-1000 ${isDark ? "text-white" : "text-black"}`} />

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
          {view === "trusted-vehicles" && <TrustedVehiclesView />}
        </main>
      )}

      <BottomNav />
      <GenderModal />

      {/* The Theme Transition Overlay has been removed in favor of CSS transition-colors duration-1000 on theme tokens */}
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
