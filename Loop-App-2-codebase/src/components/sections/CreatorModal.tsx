"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles, Code2, Heart, Quote } from "lucide-react";

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md ${cardBg} border ${border} rounded-[32px] p-6 flex flex-col relative shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 text-[#FFC554] flex items-center justify-center">
              <Sparkles size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#FFC554]">The Mind Behind LOOP</h2>
              <p className={`text-[10px] font-bold ${mutedText}`}>Creator Showcase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close creator modal"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="py-6 flex flex-col items-center text-center space-y-4">
          {/* Creator Profile Picture */}
          <div className="relative">
            <div className="w-24 h-24 rounded-[28px] bg-[#FFC554] p-1 shadow-2xl flex items-center justify-center overflow-hidden border-2 border-[#FFC554]/40">
              <img src="/creator.jpg" alt="Sanjay Kamal" className="w-full h-full object-cover rounded-[24px]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black border border-[#FFC554] text-[#FFC554] flex items-center justify-center shadow-md">
              <Code2 size={13} strokeWidth={2.5} />
            </div>
          </div>

          {/* Name & Tagline */}
          <div className="space-y-1">
            <h3 className="text-2xl font-black tracking-tight uppercase">Sanjay Kamal</h3>
            <p className="text-xs italic text-[#FFC554] font-medium tracking-wide">
              Crafted by one builder, for every rider.
            </p>
          </div>

          {/* Quote Block */}
          <div className={`p-4 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-xs leading-relaxed text-left relative space-y-2`}>
            <div className="flex items-center gap-1.5 text-[#FFC554]">
              <Quote size={14} className="rotate-180" />
              <span className="text-[9px] font-black uppercase tracking-wider">Vision</span>
            </div>
            <p className="italic opacity-90 leading-relaxed">
              "LOOP wasn't created to reinvent ride sharing—it was created to remove everything that slows it down. A fast, purpose-built platform where finding a ride takes seconds, not conversations."
            </p>
          </div>

          {/* Bottom Statement */}
          <p className="text-xs font-black uppercase tracking-wider text-gray-300">
            Designed for campuses. <span className="text-[#FFC554]">Built for communities.</span>
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
