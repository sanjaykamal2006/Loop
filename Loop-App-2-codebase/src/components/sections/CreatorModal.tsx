"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles, ShieldCheck, PhoneCall, Zap } from "lucide-react";

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, border, mutedText } = theme;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`w-full max-w-sm max-h-[90vh] ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-5 sm:p-6 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FFC554]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFC554]">
              VIT-AP Campus Edition
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
          {/* Creator Avatar with Golden Ring */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-[24px] overflow-hidden border-2 border-[#FFC554] shadow-xl p-0.5 bg-[#FFC554]/20">
              <img src="/creator.jpg" alt="Sanjay Kamal" className="w-full h-full object-cover rounded-[20px]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FFC554] text-black flex items-center justify-center font-black text-[10px] shadow-md">
              ⚡
            </div>
          </div>

          {/* Name & Title */}
          <div className="space-y-0.5">
            <h3 className="text-lg font-black uppercase tracking-tight">Sanjay Kamal</h3>
            <p className="text-[11px] font-black text-[#FFC554] tracking-widest uppercase">
              Creator & Lead Developer
            </p>
          </div>

          {/* Vision / Mission Box */}
          <div className={`p-3.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-[11px] font-medium leading-relaxed opacity-90 text-left space-y-1.5`}>
            <p>
              "LOOP was built to end the endless chaos of WhatsApp cab groups, ghosted rides, and unverified contacts.
            </p>
            <p className="text-[#FFC554] font-bold">
              Crafted exclusively for the VIT-AP University campus — giving you instant, trusted cab-pooling with verified student IDs and 1-tap pickup contact."
            </p>
          </div>

          {/* Campus Highlights */}
          <div className="w-full grid grid-cols-3 gap-1.5 pt-1">
            <div className={`p-2 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} flex flex-col items-center text-center`}>
              <ShieldCheck size={14} className="text-[#FFC554] mb-1" />
              <span className="text-[9px] font-black uppercase tracking-tight leading-tight">Verified Students</span>
            </div>
            <div className={`p-2 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} flex flex-col items-center text-center`}>
              <PhoneCall size={14} className="text-[#FFC554] mb-1" />
              <span className="text-[9px] font-black uppercase tracking-tight leading-tight">1-Tap Direct Contact</span>
            </div>
            <div className={`p-2 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} flex flex-col items-center text-center`}>
              <Zap size={14} className="text-[#FFC554] mb-1" />
              <span className="text-[9px] font-black uppercase tracking-tight leading-tight">Zero Group Spam</span>
            </div>
          </div>

          {/* Signature */}
          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>
            Built by a student, for every student.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md transition-transform"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
