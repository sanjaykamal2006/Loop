"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  ArrowLeft, 
  Sparkles, 
  Repeat, 
  MapPin, 
  Palette, 
  Smartphone, 
  ShieldCheck, 
  Coins, 
  MessageSquare,
  Lock,
  Rocket
} from "lucide-react";
import { AutoRickshawIcon } from "@/components/ui/VehicleIcons";

interface ChangelogEntry {
  version: string;
  codename: string;
  badge: string;
  isLatest?: boolean;
  date: string;
  summary: string;
  features: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
}

export default function ChangelogView() {
  const { setView, theme } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;

  const changelogData: ChangelogEntry[] = [
    {
      version: "v2.2",
      codename: "The Coordination Release",
      badge: "Latest",
      isLatest: true,
      date: "September 2026",
      summary: "Major enhancements for return journeys, live spot coordination, and full dual-theme support.",
      features: [
        {
          icon: <Repeat size={16} strokeWidth={2.4} />,
          title: "Return Trip Coordination",
          description: "Schedule your return journey directly when planning a ride. Co-riders receive an in-chat return banner with one-tap access."
        },
        {
          icon: <MapPin size={16} strokeWidth={2.4} />,
          title: "Live Spot Sharing in Chat",
          description: "Tap 'Spot' inside loop chat to instantly share your exact pickup point pin so group members find each other without confusion."
        },
        {
          icon: <Palette size={16} strokeWidth={2.4} />,
          title: "Dual-Theme (Dark & Light)",
          description: "Toggle between classic Midnight Black (Yellow accents) and Paper White (Royal Maroon accents) in Profile settings."
        },
        {
          icon: <Smartphone size={16} strokeWidth={2.4} />,
          title: "One-Handed Mobile Experience",
          description: "Enlarged touch targets, pill inputs, and streamlined single-screen layouts designed for zero vertical scrolling."
        }
      ]
    },
    {
      version: "v2.1",
      codename: "Smart Mobility & Safety",
      badge: "Stable",
      date: "August 2026",
      summary: "Expanded multi-modal vehicle options, community fare transparency, and enhanced safety filters.",
      features: [
        {
          icon: <AutoRickshawIcon size={16} strokeWidth={2.2} />,
          title: "Auto-Rickshaws & Share Autos",
          description: "Coordinate autos, shared autos, and 2-wheelers alongside cabs for flexible budget travel."
        },
        {
          icon: <ShieldCheck size={16} strokeWidth={2.4} />,
          title: "Women-Only Safety Pools",
          description: "Strict gender-filtered rides for female students and commuters with verified campus tags."
        },
        {
          icon: <Coins size={16} strokeWidth={2.4} />,
          title: "Expected Fares Guide",
          description: "Community-verified benchmark fares for local routes to eliminate bargaining uncertainty."
        },
        {
          icon: <MessageSquare size={16} strokeWidth={2.4} />,
          title: "Real-Time Group Coordination",
          description: "Fast in-app chat for each loop with sender tags, unread badges, and hold-to-manage options."
        }
      ]
    },
    {
      version: "v2.0",
      codename: "Purpose-Built LOOP",
      badge: "Milestone",
      date: "July 2026",
      summary: "The ground-up rebuild of LOOP as an ultra-fast, temporary coordination platform.",
      features: [
        {
          icon: <Rocket size={16} strokeWidth={2.4} />,
          title: "Zero-Distraction Rides",
          description: "Purpose-based travel pools that automatically expire and archive once your journey concludes."
        },
        {
          icon: <Lock size={16} strokeWidth={2.4} />,
          title: "Privacy-First Architecture",
          description: "DPDP Act compliant data handling with encrypted authentication and one-tap account deletion."
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("profile")}
            aria-label="Back to profile"
            className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shadow-sm cursor-pointer`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black uppercase tracking-tight">What&apos;s New</h1>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isDark ? "bg-[#FFC554]/20 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
              }`}>
                v2.2
              </span>
            </div>
            <p className={`text-[11px] font-bold ${mutedText}`}>LOOP Product Updates & Changelog</p>
          </div>
        </div>
      </div>

      {/* Intro Banner */}
      <div className={`p-4 rounded-[22px] border ${border} ${cardBg} relative overflow-hidden shadow-sm`}>
        <div className="flex items-start gap-3 relative z-10">
          <div className={`w-9 h-9 rounded-xl ${
            isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
          } flex items-center justify-center shrink-0`}>
            <Sparkles size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider">Evolution of LOOP</h2>
            <p className={`text-[11px] font-medium ${mutedText} mt-0.5 leading-relaxed`}>
              We ship purpose-driven updates to make your daily commutes safer, faster, and hassle-free. Here is what has been built for you.
            </p>
          </div>
        </div>
      </div>

      {/* Changelog Timeline Feed */}
      <div className="space-y-4 pb-4">
        {changelogData.map((entry) => (
          <div
            key={entry.version}
            className={`p-4 sm:p-5 rounded-[24px] border ${border} ${cardBg} shadow-sm space-y-3.5 transition-all`}
          >
            {/* Version Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-base font-black tracking-tight ${
                  entry.isLatest 
                    ? isDark ? "text-[#FFC554]" : "text-[#881337]"
                    : ""
                }`}>
                  {entry.version}
                </span>
                <span className={`text-[11px] font-bold ${mutedText}`}>
                  • {entry.codename}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  entry.isLatest
                    ? isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
                    : "bg-zinc-500/15 text-zinc-400"
                }`}>
                  {entry.badge}
                </span>
                <span className={`text-[10px] font-medium ${mutedText}`}>
                  {entry.date}
                </span>
              </div>
            </div>

            {/* Version Summary */}
            <p className={`text-xs font-medium leading-relaxed ${mutedText}`}>
              {entry.summary}
            </p>

            {/* Feature List */}
            <div className="space-y-2.5 pt-1">
              {entry.features.map((feat, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-2xl flex items-start gap-3 ${
                    isDark ? "bg-white/[0.03]" : "bg-black/[0.02]"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg ${
                    entry.isLatest
                      ? isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
                      : isDark ? "bg-white/10 text-white" : "bg-black/5 text-zinc-800"
                  } flex items-center justify-center shrink-0 mt-0.5`}>
                    {feat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold leading-snug">
                      {feat.title}
                    </h3>
                    <p className={`text-[11px] font-medium leading-relaxed ${mutedText} mt-0.5`}>
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className={`p-4 rounded-2xl ${isDark ? "bg-white/[0.02]" : "bg-black/[0.02]"} border ${border} text-center`}>
        <p className="text-[11px] font-bold">
          Have an idea or feature request for LOOP?
        </p>
        <p className={`text-[10px] ${mutedText} mt-0.5`}>
          Built by Sanjay Kamal. Connect or drop feedback from the About Creator menu!
        </p>
      </div>
    </div>
  );
}
