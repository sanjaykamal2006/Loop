"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Search, Copy, Check, Languages, ArrowLeft, Volume2, Maximize2, Lightbulb } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { triggerHaptic } from "@/lib/haptics";

interface Phrase {
  id: string;
  category: "fares" | "bargain" | "stops" | "payment" | "urgent";
  english: string;
  phonetic: string;
  telugu: string;
  tip?: string;
}

const PHRASES: Phrase[] = [
  // 1. Asking Fares
  {
    id: "f1",
    category: "fares",
    english: "How much to Vijayawada Railway Station?",
    phonetic: "Vijayawada railway station ki entha?",
    telugu: "విజయవాడ రైల్వే స్టేషన్ కి ఎంత?",
    tip: "Common destination for outpass & weekend travel"
  },
  {
    id: "f2",
    category: "fares",
    english: "How much to Secretariat / Velagapudi?",
    phonetic: "Secretariat ki entha?",
    telugu: "సెక్రటేరియట్ కి ఎంత?",
    tip: "Bus hub for cheap APSRTC buses to BZA/GNT"
  },
  {
    id: "f3",
    category: "fares",
    english: "Will you go to Mangalagiri / Tadepalli?",
    phonetic: "Mangalagiri velthara anna?",
    telugu: "మంగళగిరి వెళ్తారా అన్నా?",
    tip: "Great transit hub for food and trains"
  },
  {
    id: "f4",
    category: "fares",
    english: "How much to Vijayawada Airport?",
    phonetic: "Vijayawada airport ki entha?",
    telugu: "విజయవాడ ఎయిర్‌పోర్ట్ కి ఎంత?"
  },

  // 2. Bargaining & Rates
  {
    id: "b2",
    category: "bargain",
    english: "Everyone takes this rate only, please reduce a bit.",
    phonetic: "Andaru inthe teesukuntaru, konchem thagginchandi.",
    telugu: "అందరూ ఇంతే తీసుకుంటారు, కొంచెం తగ్గించండి."
  },

  // 3. Stops & Pickup
  {
    id: "s1",
    category: "stops",
    english: "Drop us at the Campus Main Gate.",
    phonetic: "Main gate daggara drop cheyandi.",
    telugu: "మెయిన్ గేట్ దగ్గర డ్రాప్ చేయండి."
  },
  {
    id: "s2",
    category: "stops",
    english: "Please wait 2 minutes, my friend is coming.",
    phonetic: "Okka 2 minutes aagandi, friend vasthunnadu.",
    telugu: "ఒక్క 2 నిమిషాలు ఆగండి, ఫ్రెండ్ వస్తున్నాడు."
  },
  {
    id: "s3",
    category: "stops",
    english: "Please stop the auto here.",
    phonetic: "Ikkada aapandi anna.",
    telugu: "ఇక్కడ ఆపండి అన్నా."
  },

  // 4. Payment & UPI
  {
    id: "p1",
    category: "payment",
    english: "Please show the scanner / QR code.",
    phonetic: "Scanner chupinchandi anna.",
    telugu: "స్కానర్ చూపించండి అన్నా."
  },
  {
    id: "p2",
    category: "payment",
    english: "I sent the money, please check once.",
    phonetic: "Dabbulu pampincha, okasari check chesukondi.",
    telugu: "డబ్బులు పంపించా, ఒకసారి చెక్ చేసుకోండి."
  },
  {
    id: "p3",
    category: "payment",
    english: "I don't have change (chillar).",
    phonetic: "Naa daggara chillar ledu.",
    telugu: "నా దగ్గర చిల్లర లేదు."
  },

  // 5. Urgent / Time
  {
    id: "u1",
    category: "urgent",
    english: "We have a train / exam, please go a bit fast.",
    phonetic: "Train time avthundi anna, konchem fast ga vellandi.",
    telugu: "ట్రైన్ టైం అవుతుంది అన్నా, కొంచెం ఫాస్ట్ గా వెళ్ళండి."
  },
  {
    id: "u2",
    category: "urgent",
    english: "Need to reach before campus curfew / outpass gate close.",
    phonetic: "Gate close aypothundi anna, twaraga vellandi.",
    telugu: "గేట్ క్లోజ్ అయిపోతుంది అన్నా, త్వరగా వెళ్ళండి."
  }
];

const CATEGORIES = [
  { id: "all", label: "All Phrases" },
  { id: "fares", label: "💰 Fares" },
  { id: "bargain", label: "🤝 Bargain" },
  { id: "stops", label: "📍 Gate & Stops" },
  { id: "payment", label: "📱 UPI / Pay" },
  { id: "urgent", label: "⚡ Urgent / Train" }
];

export default function TeluguGuideModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const [selectedCat, setSelectedCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [fullscreenPhrase, setFullscreenPhrase] = useState<Phrase | null>(null);

  if (!isOpen) return null;

  const filteredPhrases = PHRASES.filter(p => {
    const matchesCat = selectedCat === "all" || p.category === selectedCat;
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phonetic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.telugu.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  const handleCopy = (phrase: Phrase) => {
    triggerHaptic(10);
    navigator.clipboard.writeText(`${phrase.phonetic} (${phrase.telugu})`);
    setCopiedId(phrase.id);
    toast.success("Phrase copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (phrase: Phrase) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio speech synthesis not supported on this device");
      return;
    }

    if (playingId === phrase.id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    triggerHaptic(12);
    setPlayingId(phrase.id);

    const utterance = new SpeechSynthesisUtterance(phrase.telugu);
    utterance.lang = "te-IN";
    utterance.rate = 0.85;

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4 animate-fade-in">
      <div className={`w-full max-w-md h-[90vh] max-h-[820px] flex flex-col ${isDark ? "bg-[#111113]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] shadow-2xl overflow-hidden`}>
        
        {/* Full-Screen Driver Display Mode */}
        {fullscreenPhrase ? (
          <div className="flex flex-col h-full p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <button
                onClick={() => {
                  triggerHaptic(8);
                  setFullscreenPhrase(null);
                }}
                className={`h-11 px-4 rounded-2xl ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"} flex items-center gap-2 text-xs font-black uppercase tracking-wider active:scale-95 transition-transform cursor-pointer`}
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
                <span>Back</span>
              </button>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FFC554] bg-[#FFC554]/15 border border-[#FFC554]/30 px-3 py-1.5 rounded-full">
                Driver Display
              </span>
            </div>

            {/* Content Display Card */}
            <div className="flex-1 min-h-0 flex flex-col justify-center items-center text-center p-6 space-y-6 bg-[#FFC554]/5 border border-[#FFC554]/20 rounded-[28px] overflow-y-auto scrollbar-hide">
              <div className="space-y-3">
                <p className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${mutedText}`}>
                  {fullscreenPhrase.english}
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#FFC554] leading-snug tracking-wide pt-2">
                  {fullscreenPhrase.telugu}
                </h2>
              </div>

              <div className="w-full pt-4 border-t border-white/10">
                <p className={`text-[11px] font-black uppercase tracking-wider ${mutedText} mb-1.5`}>
                  How to Pronounce:
                </p>
                <p className="text-lg sm:text-xl font-black italic text-white tracking-wide">
                  &ldquo;{fullscreenPhrase.phonetic}&rdquo;
                </p>
              </div>
            </div>

            {/* Large Bottom Actions for Driver Mode */}
            <div className="space-y-2.5 shrink-0 pt-1">
              <button
                type="button"
                onClick={() => handleSpeak(fullscreenPhrase)}
                className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer shadow-lg ${
                  playingId === fullscreenPhrase.id
                    ? "bg-white text-black"
                    : "bg-[#FFC554] text-black"
                }`}
              >
                {playingId === fullscreenPhrase.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-black animate-pulse rounded-full" />
                    <span className="w-1.5 h-6 bg-black animate-pulse rounded-full" />
                    <span className="w-1.5 h-3 bg-black animate-pulse rounded-full" />
                    <span className="ml-1">Speaking Aloud...</span>
                  </div>
                ) : (
                  <>
                    <Volume2 size={18} strokeWidth={2.5} />
                    <span>Speak Aloud to Driver</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(fullscreenPhrase)}
                className={`w-full h-12 rounded-2xl ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"} font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer`}
              >
                {copiedId === fullscreenPhrase.id ? <Check size={16} strokeWidth={3} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copiedId === fullscreenPhrase.id ? "Copied" : "Copy Phrase"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-4 sm:p-5 space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FFC554]/15 border border-[#FFC554]/30 flex items-center justify-center text-[#FFC554]">
                  <Languages size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Telugu Auto Guide</h2>
                  <p className={`text-[10px] font-bold ${mutedText}`}>Everyday campus auto phrases & audio</p>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(8);
                  onClose();
                }}
                aria-label="Close"
                className={`w-10 h-10 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Search Input with Large Touch Area */}
            <div className="shrink-0">
              <div className={`flex items-center gap-3 px-4 h-12 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                <Search size={18} className={mutedText} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search phrases (e.g. Station, Gate, UPI)..."
                  className="flex-1 bg-transparent text-xs sm:text-sm font-bold outline-none placeholder:opacity-40"
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      triggerHaptic(6);
                      setSearchQuery("");
                    }} 
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills (Taller, Chunky, Easy to Tap) */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
              {CATEGORIES.map(c => {
                const isSelected = selectedCat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      triggerHaptic(8);
                      setSelectedCat(c.id);
                    }}
                    className={`h-9 px-3.5 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer border ${
                      isSelected
                        ? "bg-[#FFC554] text-black border-[#FFC554] shadow-sm"
                        : `${isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"} ${mutedText} hover:text-white`
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Phrases List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-0.5 scrollbar-hide pb-2">
              {filteredPhrases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider opacity-60">No phrases found</p>
                  <p className={`text-[11px] font-medium ${mutedText}`}>Try searching with different keywords</p>
                </div>
              ) : (
                filteredPhrases.map(p => {
                  const isPlaying = playingId === p.id;
                  const isCopied = copiedId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-4 ${cardBg} border ${border} rounded-[24px] space-y-3 shadow-sm hover:border-[#FFC554]/40 transition-colors`}
                    >
                      {/* English Meaning & Category Tip */}
                      <div>
                        <h3 className="text-sm font-black tracking-tight leading-snug">
                          {p.english}
                        </h3>
                        {p.tip && (
                          <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 mt-1">
                            <Lightbulb size={12} className="text-[#FFC554] shrink-0" />
                            <span>{p.tip}</span>
                          </p>
                        )}
                      </div>

                      {/* Spacious Pronunciation & Telugu Script Box */}
                      <div className="bg-[#FFC554]/10 border border-[#FFC554]/25 rounded-2xl p-3.5 space-y-1">
                        <p className="text-sm sm:text-[15px] font-black text-[#FFC554] tracking-wide leading-snug">
                          &ldquo;{p.phonetic}&rdquo;
                        </p>
                        <p className={`text-xs font-bold ${isDark ? "text-white/80" : "text-black/80"} tracking-normal pt-0.5`}>
                          {p.telugu}
                        </p>
                      </div>

                      {/* Generous High-Ergonomic Action Bar (Min Height 44px) */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {/* Primary Speak Button */}
                        <button
                          type="button"
                          onClick={() => handleSpeak(p)}
                          className={`flex-1 h-11 px-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm ${
                            isPlaying
                              ? "bg-white text-black shadow-md"
                              : "bg-[#FFC554] text-black hover:brightness-105"
                          }`}
                        >
                          {isPlaying ? (
                            <div className="flex items-center gap-1">
                              <span className="w-1 h-3.5 bg-black animate-pulse rounded-full" />
                              <span className="w-1 h-5 bg-black animate-pulse rounded-full" />
                              <span className="w-1 h-3 bg-black animate-pulse rounded-full" />
                              <span className="ml-1 text-[11px]">Speaking...</span>
                            </div>
                          ) : (
                            <>
                              <Volume2 size={16} strokeWidth={2.5} />
                              <span>Speak</span>
                            </>
                          )}
                        </button>

                        {/* Secondary Show to Driver Button */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            setFullscreenPhrase(p);
                          }}
                          className={`h-11 px-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer border ${
                            isDark
                              ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                              : "bg-black/5 border-black/10 text-zinc-900 hover:bg-black/10"
                          }`}
                        >
                          <Maximize2 size={14} strokeWidth={2.4} />
                          <span>Show</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(p)}
                          aria-label="Copy phrase"
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer border shrink-0 ${
                            isDark
                              ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white"
                              : "bg-black/5 border-black/10 text-zinc-700 hover:text-black"
                          }`}
                        >
                          {isCopied ? (
                            <Check size={16} strokeWidth={3} className="text-emerald-400" />
                          ) : (
                            <Copy size={16} strokeWidth={2.2} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
