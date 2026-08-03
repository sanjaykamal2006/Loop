"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { ChevronLeft, Plus, Sun, Moon, Download, Settings, History, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AppHeader() {
  const { view, setView, selectedLoop, theme, toggleTheme } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      toast.info("To install: Tap browser menu (⋮ on Android or Share ⎋ on iPhone) -> 'Add to Home Screen'");
    }
  };

  return (
    <header className="px-5 py-4 shrink-0 relative z-50 flex items-center justify-between">
      {view === "home" && (
        <div className="flex items-center justify-between w-full pt-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="LOOP App Logo" width="40" height="40" className="w-10 h-10 object-contain rounded-xl" loading="eager" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter leading-none">LOOP</h1>
              <p className="text-xs font-medium opacity-50 mt-1">Rides go better in Loop.</p>
            </div>
          </div>
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              aria-label="Install LOOP App"
              className="h-9 px-3.5 rounded-full bg-[#FFC554] text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow-md shrink-0"
            >
              <Download size={13} strokeWidth={2.5} />
              Install App
            </button>
          )}
        </div>
      )}
      {(view === "create" || view === "ride-details" || view === "chat") && (
        <div className="flex items-center justify-between w-full pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView(view === "chat" ? "chat-list" : "home")}
              aria-label="Go back"
              className={`w-10 h-10 rounded-full border ${border} flex items-center justify-center ${cardBg} active:scale-90 shadow-sm`}
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">
              {view === "create" ? "New Loop" : view === "chat" ? selectedLoop?.destination : "Ride Details"}
            </h1>
          </div>
          {view === "create" && (
            <button onClick={() => setView("home")} aria-label="Cancel creation" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 ">
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
        <div className="flex items-center justify-between w-full pt-2 relative">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              aria-label="Open settings menu"
              className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 shadow-sm`}
            >
              <Settings size={18} className={`transition-transform duration-300 ${showSettingsMenu ? "text-[#FFC554] rotate-90" : ""}`} />
            </button>

            {showSettingsMenu && (
              <div className={`absolute right-0 top-12 w-52 p-2 ${cardBg} border ${border} rounded-2xl shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-xl animate-fade-in`}>
                <button
                  onClick={() => { toggleTheme(); setShowSettingsMenu(false); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold w-full text-left transition-colors"
                >
                  {isDark ? <Sun size={15} className="text-[#FFC554]" /> : <Moon size={15} />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    window.dispatchEvent(new CustomEvent("open-past-loops"));
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold w-full text-left transition-colors"
                >
                  <History size={15} className="text-purple-400" />
                  <span>Past Loops (History)</span>
                </button>

                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    window.dispatchEvent(new CustomEvent("open-terms-modal"));
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold w-full text-left transition-colors"
                >
                  <ShieldCheck size={15} className="text-[#FFC554]" />
                  <span>Terms & Privacy Policy</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
