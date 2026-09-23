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
import ChangelogView from "./ChangelogView";
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
  "changelog",
]);

function AppContent() {
  const { view, selectedLoop, theme } = useLoop();
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

  const [showTerms, setShowTerms] = React.useState(false);
  const [showTeluguGuide, setShowTeluguGuide] = React.useState(false);
  const [showCreator, setShowCreator] = React.useState(false);
  const [showBuyCoffee, setShowBuyCoffee] = React.useState(false);

  React.useEffect(() => {
    const handleTerms = () => setShowTerms(true);
    const handleTelugu = () => setShowTeluguGuide(true);
    const handleCreator = () => setShowCreator(true);
    const handleBuyCoffee = () => setShowBuyCoffee(true);
    window.addEventListener("open-terms-modal", handleTerms);
    window.addEventListener("open-telugu-guide-modal", handleTelugu);
    window.addEventListener("open-creator-modal", handleCreator);
    window.addEventListener("open-buy-coffee-modal", handleBuyCoffee);
    return () => {
      window.removeEventListener("open-terms-modal", handleTerms);
      window.removeEventListener("open-telugu-guide-modal", handleTelugu);
      window.removeEventListener("open-creator-modal", handleCreator);
      window.removeEventListener("open-buy-coffee-modal", handleBuyCoffee);
    };
  }, []);

  return (
    <div className={`flex flex-col h-[100dvh] max-w-md mx-auto ${bg} ${text} relative overflow-hidden font-sans`}>
      <div className={`dot-matrix-bg transition-colors duration-1000 ${isDark ? "text-white" : "text-black"}`} />

      {/* When in past-loops or changelog, the view manages its own top bar / back button, or header can adapt */}
      {view !== "past-loops" && view !== "changelog" && <AppHeader />}

      {/* Chat gets its own full-height container with native Apple push/pop physics */}
      {view === "chat" ? (
        <div key="view-chat" className={`flex-1 flex flex-col min-h-0 ${navState.animClass}`}>
          {selectedLoop ? <ChatView /> : <ChatListView />}
        </div>
      ) : (
        <main 
          key={`view-${view}`}
          className={`flex-1 relative z-0 px-4 sm:px-5 scrollbar-hide flex flex-col ${navState.animClass} ${
            view === "changelog" ? "overflow-y-auto pb-10 pt-5" : "overflow-y-auto pb-24"
          } ${view === "past-loops" ? "pt-5" : ""}`}
        >
          {view === "home" && <HomeView />}
          {view === "create" && <CreateView />}
          {view === "chat-list" && <ChatListView />}
          {view === "profile" && <ProfileView />}
          {view === "ride-details" && (selectedLoop ? <RideDetailsView /> : <HomeView />)}
          {view === "trusted-vehicles" && <TrustedVehiclesView />}
          {view === "past-loops" && <PastLoopsView />}
          {view === "changelog" && <ChangelogView />}
        </main>
      )}

      <BottomNav />
      <GenderModal />
      <EmergencyContactModal />
      <SosModal />
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <TeluguGuideModal isOpen={showTeluguGuide} onClose={() => setShowTeluguGuide(false)} />
      <CreatorModal isOpen={showCreator} onClose={() => setShowCreator(false)} />
      <BuyCoffeeModal isOpen={showBuyCoffee} onClose={() => setShowBuyCoffee(false)} />
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
