"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles } from "lucide-react";

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, border, mutedText } = theme;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`w-full max-w-sm max-h-[85vh] ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-6 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FFC554]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFC554]">
              The Mind Behind LOOP
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 flex flex-col items-center text-center space-y-3.5">
          {/* Photo */}
          <div className="w-20 h-20 rounded-[24px] overflow-hidden border border-white/10 shadow-xl shrink-0">
            <img src="/creator.jpg" alt="Sanjay Kamal" className="w-full h-full object-cover" />
          </div>

          {/* Name & Subtitle */}
          <div className="space-y-0.5">
            <h3 className="text-lg font-black uppercase tracking-tight">{profileName || "Sanjay Kamal"}</h3>
            <p className="text-xs font-medium opacity-60 tracking-wide">
              Crafted by one builder, for every rider.
            </p>
          </div>

          {/* Core Statement */}
          <div className={`p-3.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-xs font-medium leading-relaxed opacity-90 text-left`}>
            "LOOP wasn't created to reinvent ride sharing—it was created to remove everything that slows it down. A fast, purpose-built platform where finding a ride takes seconds, not conversations."
          </div>

          {/* Tagline */}
          <p className="text-[10px] font-black uppercase tracking-wider text-[#FFC554]">
            Designed for campuses. Built for communities.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const profileName = "Sanjay Kamal";
