"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  ArrowLeft, 
  Repeat, 
  MapPin, 
  Palette, 
  Smartphone, 
  ShieldCheck, 
  Coins, 
  MessageSquare, 
  Lock, 
  Rocket, 
  Search, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Coffee, 
  KeyRound,
  Layers,
  Sparkles
} from "lucide-react";
import { AutoRickshawIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";

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
      version: "v2.3",
      codename: "Tactile Physics & Instant History",
      badge: "Latest",
      isLatest: true,
      date: "September 2026",
      summary: "Silky-smooth native motion physics, instant 0ms cached ride history with parallel queries, redesigned spacious buy coffee modal, and smart Indian phone sanitizer.",
      features: [
        {
          icon: <Zap size={16} strokeWidth={2.4} />,
          title: "Tactile Native Motion & Fluid Transitions",
          description: "Perceptible 18px spring view transitions, 45ms staggered card waterfall cascades across Home, Chat, and History, and active rubber-band micro-settle physics on bottom tabs."
        },
        {
          icon: <Clock size={16} strokeWidth={2.4} />,
          title: "Instant 0ms Ride History (SWR Cache)",
          description: "Zero-delay history loading powered by synchronous local caching and parallelized Supabase queries (Promise.all) with sleek pulsing skeleton shimmer cards."
        },
        {
          icon: <Coffee size={16} strokeWidth={2.4} />,
          title: "Redesigned 'Buy Creator a Coffee' Modal",
          description: "Spacious, segmented modal with Instant Pay vs. Scan QR tabs, quick amount chips (₹20, ₹50 [Popular], ₹100, ₹200), and 1-tap UPI ID copy chip."
        },
        {
          icon: <Smartphone size={16} strokeWidth={2.4} />,
          title: "Smart Phone Number Sanitizer",
          description: "Auto-cleans pasted phone numbers with +91 country codes, spaces, and formatting symbols to accurately extract the 10-digit mobile number for emergency contacts."
        },
        {
          icon: <Layers size={16} strokeWidth={2.4} />,
          title: "Next.js 16.3 + Turbopack & Security Audit",
          description: "Pruned all unused packages, updated to native ESLint flat config, and enhanced performance with modern Turbopack compilation."
        }
      ]
    },
    {
      version: "v2.2",
      codename: "The Coordination & Dual-Theme Release",
      badge: "Stable",
      date: "September 2026",
      summary: "Major upgrades for return journey planning, live GPS spot sharing in chat, and full dual-theme contrast.",
      features: [
        {
          icon: <Repeat size={16} strokeWidth={2.4} />,
          title: "Return Trip Coordination",
          description: "Schedule your return journey directly when planning a ride. Co-riders receive an interactive in-chat return banner with 1-tap joining."
        },
        {
          icon: <MapPin size={16} strokeWidth={2.4} />,
          title: "Live Spot Sharing in Chat",
          description: "Tap 'Spot' inside loop chat to instantly share your exact pickup GPS pin so group members meet without confusion."
        },
        {
          icon: <Palette size={16} strokeWidth={2.4} />,
          title: "Dual-Theme (Dark & Light)",
          description: "Toggle between classic Midnight Black (Yellow accents) and Paper White (Royal Maroon accents) in Profile settings."
        },
        {
          icon: <Zap size={16} strokeWidth={2.4} />,
          title: "Unified Transit Card & Quick Swap",
          description: "Re-engineered From/To transit card with 1-tap location swapping, vehicle selection, and auto-rickshaw icons."
        },
        {
          icon: <Smartphone size={16} strokeWidth={2.4} />,
          title: "One-Handed Mobile UX",
          description: "Enlarged touch targets, pill inputs, and streamlined single-screen layouts designed for zero vertical scrolling."
        }
      ]
    },
    {
      version: "v2.1",
      codename: "Rich Chat & Mobility Fleet",
      badge: "Stable",
      date: "August 2026",
      summary: "In-chat message search, mobile-first message actions, expanded auto-rickshaw fleet, and expected fares.",
      features: [
        {
          icon: <Search size={16} strokeWidth={2.4} />,
          title: "In-Chat Message Search",
          description: "Search conversations in active ride chats with real-time keyword highlighting, match counters, and quick navigation."
        },
        {
          icon: <MessageSquare size={16} strokeWidth={2.4} />,
          title: "Long-Press Message Action Sheet",
          description: "Hold any message to edit, copy, or delete with native mobile haptics and author verification."
        },
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
          title: "Expected Fares Directory",
          description: "Community-verified benchmark fares for local transit points and campus routes to eliminate bargaining uncertainty."
        },
        {
          icon: <Clock size={16} strokeWidth={2.4} />,
          title: "Native Time of Travel Picker",
          description: "Fast departure time selector with prominent AM/PM pill badges and quick time-shift chips."
        }
      ]
    },
    {
      version: "v2.0",
      codename: "Security Fortress & Lightning Speed",
      badge: "Milestone",
      date: "July 2026",
      summary: "Database security hardening, client-side photo compression, instant caching, and creator tipping.",
      features: [
        {
          icon: <Lock size={16} strokeWidth={2.4} />,
          title: "Fortress Security Architecture",
          description: "Strict Row-Level Security (RLS), atomic seat allocation triggers, phone number isolation, and IDOR protection."
        },
        {
          icon: <Zap size={16} strokeWidth={2.4} />,
          title: "FastAvatar & Image Compression",
          description: "Zero-latency photo loading with client-side canvas compression, initials fallback, and service worker caching."
        },
        {
          icon: <CheckCircle2 size={16} strokeWidth={2.4} />,
          title: "15s SWR Caching & Optimistic UI",
          description: "Instant chat message delivery with local optimistic rendering and background tab lifecycle management."
        },
        {
          icon: <Coffee size={16} strokeWidth={2.4} />,
          title: "Buy Creator a Coffee (UPI)",
          description: "Direct 1-tap UPI deep-links supporting GPay, PhonePe, Paytm, and BHIM to keep LOOP free and fast."
        },
        {
          icon: <ShieldCheck size={16} strokeWidth={2.4} />,
          title: "DPDP Act Compliant Privacy",
          description: "Minimalist, temporary coordination that disappears when rides conclude, with 1-tap account deletion."
        }
      ]
    },
    {
      version: "v1.0",
      codename: "The Genesis of LOOP",
      badge: "Foundation",
      date: "June 2026",
      summary: "The initial launch of purpose-based campus coordination to eliminate chaotic chat groups.",
      features: [
        {
          icon: <Rocket size={16} strokeWidth={2.4} />,
          title: "Zero-Distraction Ephemeral Pools",
          description: "Purpose-based travel groups that automatically expire and archive once your journey concludes."
        },
        {
          icon: <KeyRound size={16} strokeWidth={2.4} />,
          title: "OTP Verification & Rate Limiting",
          description: "One-time 6-digit email OTP verification, verified registration numbers, and brute-force protection."
        },
        {
          icon: <MapPin size={16} strokeWidth={2.4} />,
          title: "Campus to Transit Hub Pooling",
          description: "Direct coordination between campus gates, railway stations, bus terminals, and airports."
        }
      ]
    }
  ];

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic(10);
              setView("profile");
            }}
            aria-label="Back to profile"
            className={`w-10 h-10 rounded-full border ${border} ${cardBg} flex items-center justify-center active:scale-90 transition-transform shadow-sm cursor-pointer`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black uppercase tracking-tight">Changelog</h1>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isDark ? "bg-[#FFC554]/20 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
              }`}>
                v2.3
              </span>
            </div>
            <p className={`text-[11px] font-bold ${mutedText}`}>LOOP Product Updates & Release Notes</p>
          </div>
        </div>
      </div>

      {/* Changelog Timeline Feed */}
      <div className="space-y-4">
        {changelogData.map((entry, entryIdx) => (
          <div
            key={entry.version}
            style={{ "--stagger-delay": `${entryIdx * 50}ms` } as React.CSSProperties}
            className={`p-4 sm:p-5 rounded-[24px] border ${border} ${cardBg} shadow-sm space-y-3.5 transition-all animate-card-enter`}
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
          Built with care by Sanjay Kamal. Tap About Creator to share feedback!
        </p>
      </div>
    </div>
  );
}
