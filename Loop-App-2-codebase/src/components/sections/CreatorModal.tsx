"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles, Github, Linkedin, Instagram, Mail, ArrowUpRight, BadgeCheck, Copy, Check, ExternalLink, Coffee } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";

// App Opener Links Configuration provided by creator
export const CREATOR_LINKS = {
  instagram: {
    title: "Instagram",
    handle: "@_an_droid_here_",
    url: "https://insta.openinapp.co/uekq6",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    border: "border-pink-500/20",
  },
  linkedin: {
    title: "LinkedIn",
    handle: "Sanjay Kamal",
    url: "https://linkedin.openinapp.co/djr8q",
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    border: "border-sky-500/20",
  },
  github: {
    title: "GitHub",
    handle: "@sanjaykamal2006",
    url: "https://github.com/sanjaykamal2006",
    color: "text-white",
    bg: "bg-white/10",
    border: "border-white/15",
  },
  email: {
    title: "Email",
    handle: "loopdeveloper8@gmail.com",
    url: "mailto:loopdeveloper8@gmail.com",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/20",
  },
};

export default function CreatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, textToCopy: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedKey(key);
      toast.success(`Copied ${textToCopy} to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`w-full max-w-sm ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-5 sm:p-6 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={isDark ? "text-[#FFC554]" : "text-[#881337]"} />
            <h2 className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
              About Creator
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"} flex items-center justify-center active:scale-90 transition-transform`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body: Creator Photo + Verified Badge + Socials */}
        <div className="py-4 flex flex-col items-center text-center space-y-4">
          {/* Creator Avatar with subtle ambient glow */}
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-[32px] bg-gradient-to-tr ${
              isDark ? "from-[#FFC554]/40 to-white/15" : "from-[#881337]/30 to-black/10"
            } blur-sm opacity-80 group-hover:opacity-100 transition duration-500`} />
            <div className="relative w-24 h-24 rounded-[28px] overflow-hidden border-2 border-white/25 shadow-2xl shrink-0 bg-black">
              <img src="/creator.jpg" alt="Sanjay Kamal" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Name & Title */}
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-xl font-black uppercase tracking-tight">Sanjay Kamal</h3>
              <BadgeCheck size={19} className={`shrink-0 ${
                isDark ? "text-[#FFC554] fill-[#FFC554]/20" : "text-[#881337] fill-[#881337]/20"
              }`} />
            </div>
            <p className={`text-[11px] font-bold ${mutedText} mt-0.5 uppercase tracking-wider`}>
              Builder & Architect of LOOP
            </p>
          </div>

          {/* Social Links Grid with App Opener Styling */}
          <div className="w-full space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${mutedText}`}>
                Connect with me
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isDark
                  ? "bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/30"
                  : "bg-[#881337]/10 text-[#881337] border border-[#881337]/25"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? "bg-[#FFC554]" : "bg-[#881337]"}`} />
                App Opener
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Instagram App Opener */}
              <a
                href={CREATOR_LINKS.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.instagram.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.instagram.color}`}>
                    <Instagram size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopy("instagram", CREATOR_LINKS.instagram.handle, e)}
                      title="Copy handle"
                      className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "instagram" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <ArrowUpRight size={14} className={`text-zinc-400 transition-colors ${
                      isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                    }`} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-black truncate transition-colors ${
                    isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                  }`}>Instagram</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.instagram.handle}</p>
                </div>
              </a>

              {/* LinkedIn App Opener */}
              <a
                href={CREATOR_LINKS.linkedin.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.linkedin.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.linkedin.color}`}>
                    <Linkedin size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopy("linkedin", CREATOR_LINKS.linkedin.handle, e)}
                      title="Copy name"
                      className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "linkedin" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <ArrowUpRight size={14} className={`text-zinc-400 transition-colors ${
                      isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                    }`} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-black truncate transition-colors ${
                    isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                  }`}>LinkedIn</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.linkedin.handle}</p>
                </div>
              </a>

              {/* GitHub App Opener */}
              <a
                href={CREATOR_LINKS.github.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.github.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.github.color}`}>
                    <Github size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopy("github", CREATOR_LINKS.github.handle, e)}
                      title="Copy handle"
                      className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "github" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <ArrowUpRight size={14} className={`text-zinc-400 transition-colors ${
                      isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                    }`} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-black truncate transition-colors ${
                    isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                  }`}>GitHub</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.github.handle}</p>
                </div>
              </a>

              {/* Email */}
              <a
                href={CREATOR_LINKS.email.url}
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${isDark ? CREATOR_LINKS.email.bg : "bg-rose-500/15"} flex items-center justify-center shrink-0 ${isDark ? CREATOR_LINKS.email.color : "text-[#881337]"}`}>
                    <Mail size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopy("email", CREATOR_LINKS.email.handle, e)}
                      title="Copy email"
                      className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "email" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <ArrowUpRight size={14} className={`text-zinc-400 transition-colors ${
                      isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                    }`} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-black truncate transition-colors ${
                    isDark ? "group-hover:text-[#FFC554]" : "group-hover:text-[#881337]"
                  }`}>Email</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate mt-0.5`}>{CREATOR_LINKS.email.handle}</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Tip / Buy Coffee Button */}
        <div className="pt-2 pb-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("open-buy-coffee-modal"));
            }}
            className={`w-full py-3 px-4 rounded-2xl border flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm ${
              isDark
                ? "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
              }`}>
                <Coffee size={14} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className={`text-xs font-black ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>Buy Creator a Coffee</p>
                <p className={`text-[10px] font-medium ${mutedText}`}>Support LOOP development</p>
              </div>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-xs ${
              isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
            }`}>
              Tip UPI
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className={`w-full py-2.5 ${isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"} font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] transition-all`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
