"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  X, 
  Sparkles, 
  Github, 
  Linkedin, 
  Instagram, 
  Mail, 
  ArrowUpRight, 
  Copy, 
  Check 
} from "lucide-react";
import { toast } from "@/components/ui/NativeToast";

// Smart App Opener Direct Links Configuration
export const CREATOR_LINKS = {
  github: {
    title: "GitHub",
    handle: "@sanjaykamal2006",
    url: "https://openinapp.link/si31z",
    iconBg: "bg-white/10",
    iconColor: "text-white",
  },
  linkedin: {
    title: "LinkedIn",
    handle: "Sanjay Kamal",
    url: "https://linkedin.openinapp.co/djr8q",
    iconBg: "bg-[#0A66C2]/15",
    iconColor: "text-[#0A66C2]",
  },
  instagram: {
    title: "Instagram",
    handle: "@_an_droid_here_",
    url: "https://insta.openinapp.co/uekq6",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
  },
  email: {
    title: "Email",
    handle: "loopdeveloper8@gmail.com",
    url: "mailto:loopdeveloper8@gmail.com",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
};

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, mutedText, accentText } = theme;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, textToCopy: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedKey(key);
      toast.success(`Copied ${textToCopy} to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleCardClick = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      {/* Pure AMOLED Black Modal Card */}
      <div 
        className={`w-full max-w-sm ${
          isDark ? "bg-[#000000] border-[#27272A] text-white" : "bg-[#FFFFFF] border-[#DFD9CE] text-[#1C1917]"
        } border rounded-[32px] p-5 sm:p-6 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide space-y-4`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-[#27272A]" : "border-[#DFD9CE]"} shrink-0`}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={accentText} />
            <h2 className={`text-xs font-black uppercase tracking-widest ${accentText}`}>
              About Creator
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-black"
            } flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Creator Hero */}
        <div className="flex flex-col items-center text-center space-y-2.5 pt-1">
          {/* Creator Avatar - Batman at Sunset with clean neutral border */}
          <div className="w-28 h-28 rounded-[28px] bg-zinc-900 border-2 border-white/10 overflow-hidden shadow-2xl shrink-0">
            <img 
              src="/creator.jpg" 
              alt="Sanjay Kamal S" 
              className="w-full h-full object-cover select-none" 
            />
          </div>

          {/* Name */}
          <div className="pt-0.5">
            <h3 className="text-xl font-black uppercase tracking-tight">Sanjay Kamal S</h3>
          </div>
        </div>

        {/* Direct Social Channels Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* GitHub Card */}
          <div
            onClick={() => handleCardClick(CREATOR_LINKS.github.url)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.github.url)}
            className={`p-3 rounded-2xl ${
              isDark ? "bg-[#121212] hover:bg-[#181818] border-[#27272A]" : "bg-[#FAF8F5] hover:bg-[#F2EFE9] border-[#DFD9CE]"
            } border flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative cursor-pointer select-none`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.github.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.github.iconColor}`}>
                <Github size={16} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleCopy("github", CREATOR_LINKS.github.handle, e)}
                  title="Copy GitHub handle"
                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedKey === "github" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <ArrowUpRight size={14} className={`text-zinc-400 transition-colors ${
                  isDark ? "group-hover:text-white" : "group-hover:text-black"
                }`} />
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-black truncate transition-colors ${
                isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
              }`}>GitHub</p>
              <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5 font-mono`}>{CREATOR_LINKS.github.handle}</p>
            </div>
          </div>

          {/* LinkedIn Card */}
          <div
            onClick={() => handleCardClick(CREATOR_LINKS.linkedin.url)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.linkedin.url)}
            className={`p-3 rounded-2xl ${
              isDark ? "bg-[#121212] hover:bg-[#181818] border-[#27272A]" : "bg-[#FAF8F5] hover:bg-[#F2EFE9] border-[#DFD9CE]"
            } border flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative cursor-pointer select-none`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.linkedin.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.linkedin.iconColor}`}>
                <Linkedin size={16} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleCopy("linkedin", CREATOR_LINKS.linkedin.handle, e)}
                  title="Copy LinkedIn name"
                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedKey === "linkedin" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-[#0A66C2] transition-colors" />
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-black truncate transition-colors ${
                isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
              }`}>LinkedIn</p>
              <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.linkedin.handle}</p>
            </div>
          </div>

          {/* Instagram Card */}
          <div
            onClick={() => handleCardClick(CREATOR_LINKS.instagram.url)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.instagram.url)}
            className={`p-3 rounded-2xl ${
              isDark ? "bg-[#121212] hover:bg-[#181818] border-[#27272A]" : "bg-[#FAF8F5] hover:bg-[#F2EFE9] border-[#DFD9CE]"
            } border flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative cursor-pointer select-none`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.instagram.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.instagram.iconColor}`}>
                <Instagram size={16} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleCopy("instagram", CREATOR_LINKS.instagram.handle, e)}
                  title="Copy Instagram handle"
                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedKey === "instagram" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-pink-400 transition-colors" />
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-black truncate transition-colors ${
                isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
              }`}>Instagram</p>
              <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5 font-mono`}>{CREATOR_LINKS.instagram.handle}</p>
            </div>
          </div>

          {/* Email Card */}
          <div
            onClick={() => handleCardClick(CREATOR_LINKS.email.url)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.email.url)}
            className={`p-3 rounded-2xl ${
              isDark ? "bg-[#121212] hover:bg-[#181818] border-[#27272A]" : "bg-[#FAF8F5] hover:bg-[#F2EFE9] border-[#DFD9CE]"
            } border flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative cursor-pointer select-none`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.email.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.email.iconColor}`}>
                <Mail size={16} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleCopy("email", CREATOR_LINKS.email.handle, e)}
                  title="Copy Email"
                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedKey === "email" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-black truncate transition-colors ${
                isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
              }`}>Email</p>
              <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5 font-mono`}>{CREATOR_LINKS.email.handle}</p>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className={`pt-2 border-t ${isDark ? "border-[#27272A]" : "border-[#DFD9CE]"} shrink-0`}>
          <button
            onClick={onClose}
            className={`w-full h-12 ${
              isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"
            } font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
