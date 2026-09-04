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
import PastLoopsView from "./PastLoopsView";
import BottomNav from "./BottomNav";
import GenderModal from "./GenderModal";

function AppContent() {
  const { view, selectedLoop, theme } = useLoop();
  const { isDark, bg, text } = theme;

  return (
    <div className={`flex flex-col h-[100dvh] max-w-md mx-auto ${bg} ${text} relative overflow-hidden font-sans`}>
      <div className={`dot-matrix-bg transition-colors duration-1000 ${isDark ? "text-white" : "text-black"}`} />

      {/* When in past-loops or trusted-vehicles, the view manages its own top bar / back button, or header can adapt */}
      {view !== "past-loops" && <AppHeader />}

      {/* Chat gets its own full-height container */}
      {view === "chat" ? (
        selectedLoop ? <ChatView /> : <ChatListView />
      ) : (
        <main className={`flex-1 overflow-y-auto relative z-0 px-5 scrollbar-hide pb-28 ${view === "past-loops" ? "pt-5" : ""}`}>
          {view === "home" && <HomeView />}
          {view === "create" && <CreateView />}
          {view === "chat-list" && <ChatListView />}
          {view === "profile" && <ProfileView />}
          {view === "ride-details" && (selectedLoop ? <RideDetailsView /> : <HomeView />)}
          {view === "trusted-vehicles" && <TrustedVehiclesView />}
          {view === "past-loops" && <PastLoopsView />}
        </main>
      )}

      <BottomNav />
      <GenderModal />
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
