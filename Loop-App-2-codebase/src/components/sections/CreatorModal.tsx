"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles, Code2, Heart } from "lucide-react";

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md ${cardBg} border ${border} rounded-[32px] p-6 flex flex-col relative shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFC554]/10 text-[#FFC554] flex items-center justify-center">
              <Sparkles size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">About Creator</h2>
              <p className={`text-[10px] font-bold ${mutedText}`}>The Mind Behind LOOP</p>
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
          <div className="relative">
            <div className="w-20 h-20 rounded-[24px] bg-[#FFC554] p-1 shadow-xl flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="LOOP Logo" className="w-full h-full object-cover rounded-[20px]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black border border-[#FFC554] text-[#FFC554] flex items-center justify-center">
              <Code2 size={14} strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight uppercase">Sanjay Kamal</h3>
            <p className="text-xs font-black text-[#FFC554] uppercase tracking-widest">Creator & Developer</p>
          </div>

          <div className={`p-4 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-xs leading-relaxed opacity-90 max-w-sm`}>
            "LOOP was designed and built to revolutionize campus travel — creating a fast, utility-first ride coordination platform with zero social media distraction."
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Crafted with</span>
            <Heart size={12} className="text-red-500 fill-red-500" />
            <span>for the Community</span>
          </div>
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
