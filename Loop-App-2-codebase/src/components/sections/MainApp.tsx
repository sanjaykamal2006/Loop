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
import TermsModal from "./TermsModal";
import CreatorModal from "./CreatorModal";
import TeluguGuideModal from "./TeluguGuideModal";
import BuyCoffeeModal from "./BuyCoffeeModal";

function AppContent() {
  const { view, selectedLoop, theme } = useLoop();
  const { isDark, bg, text } = theme;

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

      {/* When in past-loops or trusted-vehicles, the view manages its own top bar / back button, or header can adapt */}
      {view !== "past-loops" && <AppHeader />}

      {/* Chat gets its own full-height container */}
      {view === "chat" ? (
        selectedLoop ? <ChatView /> : <ChatListView />
      ) : (
        <main className={`flex-1 relative z-0 px-5 scrollbar-hide flex flex-col ${
          "overflow-y-auto pb-28"
        } ${view === "past-loops" ? "pt-5" : ""}`}>
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
