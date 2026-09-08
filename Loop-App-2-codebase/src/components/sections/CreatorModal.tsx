"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles, Github, Linkedin, Instagram, Mail } from "lucide-react";

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, border, mutedText } = theme;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`w-full max-w-sm ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-5 sm:p-6 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FFC554]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFC554]">
              About Creator
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

        {/* Body: Creator Photo + Name + Socials */}
        <div className="py-4 flex flex-col items-center text-center space-y-4">
          {/* Creator Avatar */}
          <div className="w-24 h-24 rounded-[28px] overflow-hidden border-2 border-white/20 shadow-2xl shrink-0">
            <img src="/creator.jpg" alt="Sanjay Kamal" className="w-full h-full object-cover" />
          </div>

          {/* Name */}
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Sanjay Kamal</h3>
            <p className={`text-[11px] font-bold ${mutedText} mt-0.5 uppercase tracking-wider`}>
              Builder of LOOP
            </p>
          </div>

          {/* Social Links Grid (Instead of lines of text) */}
          <div className="w-full space-y-2 pt-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${mutedText} block text-left px-1`}>
              Connect with me
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Instagram */}
              <a
                href="https://instagram.com/sanjaykamal_"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex items-center gap-2.5 active:scale-95 transition-all text-left group`}
              >
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0 text-pink-400">
                  <Instagram size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">Instagram</p>
                  <p className={`text-[9px] font-medium ${mutedText} truncate`}>@sanjaykamal_</p>
                </div>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com/in/sanjaykamal2006"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex items-center gap-2.5 active:scale-95 transition-all text-left group`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 text-blue-400">
                  <Linkedin size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">LinkedIn</p>
                  <p className={`text-[9px] font-medium ${mutedText} truncate`}>Sanjay Kamal</p>
                </div>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/sanjaykamal2006"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex items-center gap-2.5 active:scale-95 transition-all text-left group`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
                  <Github size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">GitHub</p>
                  <p className={`text-[9px] font-medium ${mutedText} truncate`}>@sanjaykamal2006</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:sanjaykamal2006@gmail.com"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex items-center gap-2.5 active:scale-95 transition-all text-left group`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">Email</p>
                  <p className={`text-[9px] font-medium ${mutedText} truncate`}>sanjaykamal2006</p>
                </div>
              </a>
            </div>
          </div>
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
