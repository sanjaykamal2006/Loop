"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  X, 
  Github, 
  Linkedin, 
  Instagram, 
  Mail, 
  ArrowUpRight, 
  BadgeCheck, 
  Copy, 
  Check, 
  Coffee,
  Sparkles
} from "lucide-react";
import { toast } from "@/components/ui/NativeToast";

// Smart App Opener Links Configuration
export const CREATOR_LINKS = {
  github: {
    title: "GitHub",
    handle: "@sanjaykamal2006",
    url: "https://openinapp.link/si31z",
    actionLabel: "Open App",
    brandColor: "text-white",
    iconBg: "bg-white/[0.08]",
  },
  linkedin: {
    title: "LinkedIn",
    handle: "Sanjay Kamal",
    url: "https://linkedin.openinapp.co/djr8q",
    actionLabel: "Open App",
    brandColor: "text-[#0A66C2]",
    iconBg: "bg-[#0A66C2]/15",
  },
  instagram: {
    title: "Instagram",
    handle: "@_an_droid_here_",
    url: "https://insta.openinapp.co/uekq6",
    actionLabel: "Open App",
    brandColor: "text-pink-400",
    iconBg: "bg-pink-500/15",
  },
  email: {
    title: "Email",
    handle: "loopdeveloper8@gmail.com",
    url: "mailto:loopdeveloper8@gmail.com",
    actionLabel: "Send Mail",
    brandColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
  },
};

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, mutedText } = theme;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, textToCopy: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedKey(key);
      toast.success(`Copied ${textToCopy}`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleCardClick = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
      {/* Outer Glow & Glass Card */}
      <div 
        className={`w-full max-w-sm ${
          isDark 
            ? "bg-[#0B0B0E]/95 border border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]" 
            : "bg-white/95 border border-black/[0.08] text-zinc-900 shadow-[0_25px_80px_rgba(0,0,0,0.15)]"
        } rounded-[36px] p-6 flex flex-col relative overflow-hidden`}
      >
        {/* Subtle Top Ambient Lighting (Monochrome / Silver, strictly NO yellow) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-b from-white/[0.07] to-transparent blur-xl pointer-events-none" />

        {/* Top Navigation Row */}
        <div className="flex items-center justify-between pb-3 shrink-0 relative z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
            <Sparkles size={12} className="text-zinc-400" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-400">
              LEAD ARCHITECT
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300" : "bg-black/[0.05] hover:bg-black/[0.1] text-zinc-700"
            } flex items-center justify-center active:scale-90 transition-all cursor-pointer`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Creator Hero: Avatar & Information */}
        <div className="pt-2 pb-4 flex flex-col items-center text-center relative z-10">
          {/* Majestic Portrait (Pure luxury dark frame, NO yellow borders or glow) */}
          <div className="relative mb-3.5">
            <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-[28px] overflow-hidden bg-neutral-900 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
              <img 
                src="/creator.jpg" 
                alt="Sanjay Kamal S" 
                className="w-full h-full object-cover object-top select-none" 
              />
            </div>
          </div>

          {/* Name & Official Verified Badge */}
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="text-xl font-bold tracking-tight">Sanjay Kamal S</h3>
            <BadgeCheck size={20} className="text-sky-400 fill-sky-500/20 shrink-0" />
          </div>

          <p className="text-[12px] font-medium text-zinc-400 mt-0.5">
            Founder & Architect of LOOP
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300">
              24MIC7130
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300">
              SCOPE • VIT-AP
            </span>
          </div>
        </div>

        {/* Smart App Opener Grid */}
        <div className="space-y-2 pt-1 relative z-10">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Direct Channels
            </span>
            <span className="text-[9px] font-mono font-medium text-emerald-400/90 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              App Opener Ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* GitHub Card */}
            <div
              onClick={() => handleCardClick(CREATOR_LINKS.github.url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.github.url)}
              className={`p-3 rounded-2xl ${
                isDark ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]" : "bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.08]"
              } border flex flex-col justify-between active:scale-[0.98] transition-all text-left cursor-pointer group select-none`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.github.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.github.brandColor}`}>
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
                  <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold truncate">GitHub</p>
                  <span className="text-[8px] font-mono font-medium text-zinc-400 uppercase tracking-wider">App ↗</span>
                </div>
                <p className={`text-[10px] font-mono ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.github.handle}</p>
              </div>
            </div>

            {/* LinkedIn Card */}
            <div
              onClick={() => handleCardClick(CREATOR_LINKS.linkedin.url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.linkedin.url)}
              className={`p-3 rounded-2xl ${
                isDark ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]" : "bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.08]"
              } border flex flex-col justify-between active:scale-[0.98] transition-all text-left cursor-pointer group select-none`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.linkedin.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.linkedin.brandColor}`}>
                  <Linkedin size={16} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleCopy("linkedin", CREATOR_LINKS.linkedin.handle, e)}
                    title="Copy LinkedIn profile name"
                    className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedKey === "linkedin" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-[#0A66C2] transition-colors" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold truncate">LinkedIn</p>
                  <span className="text-[8px] font-mono font-medium text-zinc-400 uppercase tracking-wider">App ↗</span>
                </div>
                <p className={`text-[10px] font-mono ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.linkedin.handle}</p>
              </div>
            </div>

            {/* Instagram Card */}
            <div
              onClick={() => handleCardClick(CREATOR_LINKS.instagram.url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.instagram.url)}
              className={`p-3 rounded-2xl ${
                isDark ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]" : "bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.08]"
              } border flex flex-col justify-between active:scale-[0.98] transition-all text-left cursor-pointer group select-none`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.instagram.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.instagram.brandColor}`}>
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold truncate">Instagram</p>
                  <span className="text-[8px] font-mono font-medium text-zinc-400 uppercase tracking-wider">App ↗</span>
                </div>
                <p className={`text-[10px] font-mono ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.instagram.handle}</p>
              </div>
            </div>

            {/* Email Card */}
            <div
              onClick={() => handleCardClick(CREATOR_LINKS.email.url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick(CREATOR_LINKS.email.url)}
              className={`p-3 rounded-2xl ${
                isDark ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]" : "bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.08]"
              } border flex flex-col justify-between active:scale-[0.98] transition-all text-left cursor-pointer group select-none`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.email.iconBg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.email.brandColor}`}>
                  <Mail size={16} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleCopy("email", CREATOR_LINKS.email.handle, e)}
                    title="Copy Email address"
                    className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedKey === "email" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold truncate">Email</p>
                  <span className="text-[8px] font-mono font-medium text-zinc-400 uppercase tracking-wider">Mail ↗</span>
                </div>
                <p className={`text-[10px] font-mono ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.email.handle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Tip Bar */}
        <div className="pt-3 pb-1 relative z-10">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-buy-coffee-modal"));
              }
            }}
            className={`w-full py-2.5 px-3.5 rounded-2xl border flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer ${
              isDark
                ? "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                : "bg-black/[0.03] border-black/[0.08] hover:bg-black/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-white/10 text-white">
                <Coffee size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">Support LOOP</p>
                <p className="text-[10px] font-mono text-zinc-400">Direct creator tip via UPI</p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/10 text-zinc-200">
              UPI Tip ↗
            </span>
          </button>
        </div>

        {/* Clean Dismiss Button */}
        <div className="pt-2 relative z-10">
          <button
            onClick={onClose}
            className={`w-full py-2.5 ${
              isDark ? "bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300" : "bg-black/[0.05] hover:bg-black/[0.08] text-zinc-700"
            } font-bold text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] transition-all cursor-pointer`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
