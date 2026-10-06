"use client";

import React from "react";
import { Session } from "@supabase/supabase-js";
import { LoopProvider, useLoop } from "@/lib/LoopContext";
import type { View } from "@/lib/types";

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
import TermsModal from "./TermsModal";
import CreatorModal from "./CreatorModal";
import TeluguGuideModal from "./TeluguGuideModal";
import BuyCoffeeModal from "./BuyCoffeeModal";
import EmergencyContactModal from "./EmergencyContactModal";
import SosModal from "./SosModal";

const TAB_ORDER: Record<string, number> = {
  home: 0,
  create: 1,
  "chat-list": 2,
  profile: 3,
};

const DETAIL_VIEWS = new Set<View>([
  "ride-details",
  "chat",
  "trusted-vehicles",
  "past-loops",
]);

function AppContent() {
  const {
    view,
    selectedLoop,
    theme,
    showTermsModal,
    setShowTermsModal,
    showTeluguGuideModal,
    setShowTeluguGuideModal,
    showCreatorModal,
    setShowCreatorModal,
    showBuyCoffeeModal,
    setShowBuyCoffeeModal,
  } = useLoop();
  const { isDark, bg, text } = theme;

  // Apple iOS Directional Navigation State Controller
  const [navState, setNavState] = React.useState<{
    currentView: View;
    prevView: View | null;
    animClass: string;
  }>({
    currentView: view,
    prevView: null,
    animClass: "animate-ios-fade",
  });

  if (navState.currentView !== view) {
    const prev = navState.currentView;
    let nextAnim = "animate-ios-fade";

    if (DETAIL_VIEWS.has(view) && !DETAIL_VIEWS.has(prev)) {
      // Pushing forward into detail screen from root tab (e.g. Home -> Ride Details)
      nextAnim = "animate-ios-push";
    } else if (!DETAIL_VIEWS.has(view) && DETAIL_VIEWS.has(prev)) {
      // Popping backward returning to root tab from detail screen (e.g. Ride Details -> Home)
      nextAnim = "animate-ios-pop";
    } else if (DETAIL_VIEWS.has(view) && DETAIL_VIEWS.has(prev)) {
      // Transitioning between detail screens (e.g. Ride Details -> Chat)
      nextAnim = view === "chat" ? "animate-ios-push" : "animate-ios-pop";
    } else if (TAB_ORDER[view] !== undefined && TAB_ORDER[prev] !== undefined) {
      // Directional sliding between peer root tabs
      nextAnim = TAB_ORDER[view] > TAB_ORDER[prev] ? "animate-ios-tab-right" : "animate-ios-tab-left";
    }

    setNavState({
      currentView: view,
      prevView: prev,
      animClass: nextAnim,
    });
  }

  React.useEffect(() => {
    document.body.style.backgroundColor = isDark ? "#000000" : "#F2EFE9";
  }, [isDark]);

  return (
    <div className={`flex flex-col h-[100dvh] max-w-md mx-auto ${bg} ${text} relative overflow-hidden font-sans`}>
      <div className={`dot-matrix-bg transition-colors duration-1000 ${isDark ? "text-white" : "text-black"}`} />

      {/* When in past-loops, the view manages its own top bar / back button, or header can adapt */}
      {view !== "past-loops" && <AppHeader />}

      {/* Chat gets its own full-height container with native Apple push/pop physics */}
      {view === "chat" ? (
        <div key="view-chat" className={`flex-1 flex flex-col min-h-0 ${navState.animClass}`}>
          {selectedLoop ? <ChatView /> : <ChatListView />}
        </div>
      ) : (
        <main
          key={`view-${view}`}
          className={`flex-1 relative z-0 px-4 sm:px-5 scrollbar-hide flex flex-col ${navState.animClass} overflow-y-auto pb-24 ${view === "past-loops" ? "pt-5" : ""}`}
        >
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
      <EmergencyContactModal />
      <SosModal />
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <TeluguGuideModal isOpen={showTeluguGuideModal} onClose={() => setShowTeluguGuideModal(false)} />
      <CreatorModal isOpen={showCreatorModal} onClose={() => setShowCreatorModal(false)} />
      <BuyCoffeeModal isOpen={showBuyCoffeeModal} onClose={() => setShowBuyCoffeeModal(false)} />
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
