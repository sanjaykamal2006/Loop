"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Sparkles, Github, Linkedin, Instagram, Mail, ArrowUpRight, BadgeCheck, Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";

// App Opener Links Configuration
// Replace these with your dedicated App Opener / OpeninApp URLs when provided
export const CREATOR_LINKS = {
  instagram: {
    title: "Instagram",
    handle: "@sanjaykamal_",
    url: "https://instagram.com/sanjaykamal_",
    deepLink: "instagram://user?username=sanjaykamal_",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    border: "border-pink-500/20",
  },
  linkedin: {
    title: "LinkedIn",
    handle: "Sanjay Kamal",
    url: "https://linkedin.com/in/sanjaykamal2006",
    deepLink: "linkedin://profile/sanjaykamal2006",
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    border: "border-sky-500/20",
  },
  github: {
    title: "GitHub",
    handle: "@sanjaykamal2006",
    url: "https://github.com/sanjaykamal2006",
    deepLink: "https://github.com/sanjaykamal2006",
    color: "text-white",
    bg: "bg-white/10",
    border: "border-white/15",
  },
  email: {
    title: "Email",
    handle: "sanjaykamal2006@gmail.com",
    url: "mailto:sanjaykamal2006@gmail.com",
    deepLink: "mailto:sanjaykamal2006@gmail.com",
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

  const handleOpenApp = (key: keyof typeof CREATOR_LINKS) => {
    const item = CREATOR_LINKS[key];
    try {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = item.url;
    }
  };

  const handleCopyHandle = (key: string, textToCopy: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedKey(key);
      toast.success(`Copied ${textToCopy}`);
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
            <Sparkles size={16} className="text-[#FFC554]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFC554]">
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
            <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-tr from-[#FFC554]/30 to-white/10 blur-sm opacity-70 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-24 h-24 rounded-[28px] overflow-hidden border-2 border-white/20 shadow-2xl shrink-0 bg-black">
              <img src="/creator.jpg" alt="Sanjay Kamal" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Name & Title */}
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-xl font-black uppercase tracking-tight">Sanjay Kamal</h3>
              <BadgeCheck size={18} className="text-[#FFC554] shrink-0 fill-[#FFC554]/20" />
            </div>
            <p className={`text-[11px] font-bold ${mutedText} mt-0.5 uppercase tracking-wider`}>
              Builder & Architect of LOOP
            </p>
          </div>

          {/* Social Links Grid with App Opener Styling */}
          <div className="w-full space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${mutedText}`}>
                Connect with me
              </span>
              <span className="text-[9px] font-bold text-[#FFC554]/90 tracking-wider">
                App Opener
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Instagram */}
              <div
                onClick={() => handleOpenApp("instagram")}
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all cursor-pointer text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.instagram.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.instagram.color}`}>
                    <Instagram size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyHandle("instagram", CREATOR_LINKS.instagram.handle, e)}
                      title="Copy handle"
                      className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "instagram" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                    <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-[#FFC554] transition-colors" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">Instagram</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate`}>{CREATOR_LINKS.instagram.handle}</p>
                </div>
              </div>

              {/* LinkedIn */}
              <div
                onClick={() => handleOpenApp("linkedin")}
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all cursor-pointer text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.linkedin.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.linkedin.color}`}>
                    <Linkedin size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyHandle("linkedin", CREATOR_LINKS.linkedin.handle, e)}
                      title="Copy name"
                      className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "linkedin" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                    <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-[#FFC554] transition-colors" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">LinkedIn</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate`}>{CREATOR_LINKS.linkedin.handle}</p>
                </div>
              </div>

              {/* GitHub */}
              <div
                onClick={() => handleOpenApp("github")}
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all cursor-pointer text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.github.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.github.color}`}>
                    <Github size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyHandle("github", CREATOR_LINKS.github.handle, e)}
                      title="Copy handle"
                      className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "github" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                    <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-[#FFC554] transition-colors" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">GitHub</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate`}>{CREATOR_LINKS.github.handle}</p>
                </div>
              </div>

              {/* Email */}
              <div
                onClick={() => handleOpenApp("email")}
                className={`p-3 rounded-2xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} border ${border} flex flex-col justify-between active:scale-[0.97] transition-all cursor-pointer text-left group relative`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${CREATOR_LINKS.email.bg} flex items-center justify-center shrink-0 ${CREATOR_LINKS.email.color}`}>
                    <Mail size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyHandle("email", CREATOR_LINKS.email.handle, e)}
                      title="Copy email"
                      className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedKey === "email" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                    <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-[#FFC554] transition-colors" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate group-hover:text-[#FFC554] transition-colors">Email</p>
                  <p className={`text-[10px] font-medium ${mutedText} truncate`}>{CREATOR_LINKS.email.handle}</p>
                </div>
              </div>
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
