"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, Search, Copy, Check, Languages, Sparkles, Volume2, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";

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
    english: "How much to PNBS Bus Stand?",
    phonetic: "PNBS bus stand ki entha?",
    telugu: "PNBS బస్ స్టాండ్ కి ఎంత?"
  },
  {
    id: "f4",
    category: "fares",
    english: "How much to Gannavaram Airport?",
    phonetic: "Airport ki entha?",
    telugu: "ఎయిర్‌పోర్ట్ కి ఎంత?"
  },
  {
    id: "f5",
    category: "fares",
    english: "How much per seat for share auto?",
    phonetic: "Share auto lo okkariki entha?",
    telugu: "షేర్ ఆటో లో ఒక్కరికి ఎంత?",
    tip: "Usually ₹30–₹50 per seat to Secretariat / Mandadam"
  },

  // 2. Bargaining & Rates
  {
    id: "b1",
    category: "bargain",
    english: "Campus board rate says this much only, please agree.",
    phonetic: "Campus board lo ide rate undi, randi anna.",
    telugu: "క్యాంపస్ బోర్డు లో ఇదే రేట్ ఉంది, రండి అన్నా.",
    tip: "Refers to the official security booth rate board"
  },
  {
    id: "b2",
    category: "bargain",
    english: "Everyone takes this rate only, please reduce a bit.",
    phonetic: "Andaru inthe teesukuntaru, konchem thagginchandi.",
    telugu: "అందరూ ఇంతే తీసుకుంటారు, కొంచెం తగ్గించండి."
  },
  {
    id: "b3",
    category: "bargain",
    english: "We are 4 students sharing, will you take us?",
    phonetic: "Memu naluguru students unnam, vastara?",
    telugu: "మేము నలుగురు స్టూడెంట్స్ ఉన్నాం, వస్తారా?"
  },
  {
    id: "b4",
    category: "bargain",
    english: "If the rate is fixed, we'll get in.",
    phonetic: "Aa rate aithe ekkutham.",
    telugu: "ఆ రేట్ అయితే ఎక్కుతాం."
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
    english: "Are you going via Secretariat?",
    phonetic: "Secretariat meedhuga velthara?",
    telugu: "సెక్రటేరియట్ మీదుగా వెళ్తారా?"
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
    english: "Do you have PhonePe / GPay / Scanner?",
    phonetic: "PhonePe leda scanner undha anna?",
    telugu: "PhonePe లేదా Scanner ఉందా అన్నా?"
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
  { id: "all", label: "All" },
  { id: "fares", label: "Fares" },
  { id: "bargain", label: "Bargaining" },
  { id: "stops", label: "Stops & Gate" },
  { id: "payment", label: "UPI & Pay" },
  { id: "urgent", label: "Urgent / Train" }
];

export default function TeluguGuideModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [selectedCat, setSelectedCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
    navigator.clipboard.writeText(`${phrase.phonetic} (${phrase.telugu})`);
    setCopiedId(phrase.id);
    toast.success("Phrase copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in">
      <div className={`w-full max-w-md h-[88vh] flex flex-col ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-5 shadow-2xl overflow-hidden`}>
        
        {/* If showing a phrase full-screen to show driver */}
        {fullscreenPhrase ? (
          <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <button
                onClick={() => setFullscreenPhrase(null)}
                className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${mutedText} hover:text-[#FFC554] active:scale-95`}
              >
                <ArrowLeft size={16} />
                <span>Back to List</span>
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FFC554] bg-[#FFC554]/10 px-2.5 py-1 rounded-full">
                Driver Display Mode
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-6 bg-white/5 border border-white/10 rounded-[28px]">
              <div className="space-y-2">
                <p className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>
                  {fullscreenPhrase.english}
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#FFC554] leading-tight pt-2">
                  {fullscreenPhrase.telugu}
                </h2>
              </div>

              <div className="w-full pt-4 border-t border-white/10">
                <p className={`text-[11px] font-black uppercase tracking-wider ${mutedText} mb-1`}>
                  How to say it:
                </p>
                <p className="text-lg font-bold italic text-white tracking-wide">
                  &ldquo;{fullscreenPhrase.phonetic}&rdquo;
                </p>
              </div>

              <button
                onClick={() => handleCopy(fullscreenPhrase)}
                className="px-6 py-3 rounded-full bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 shadow-lg"
              >
                {copiedId === fullscreenPhrase.id ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                <span>{copiedId === fullscreenPhrase.id ? "Copied" : "Copy Phrase"}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FFC554]/15 border border-[#FFC554]/30 flex items-center justify-center text-[#FFC554]">
                  <Languages size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Telugu Auto Guide</h2>
                  <p className={`text-[10px] font-bold ${mutedText}`}>Everyday campus auto phrases</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className={`w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Search Input */}
            <div className="pt-3 pb-2 shrink-0">
              <div className={`flex items-center gap-2.5 px-3.5 py-2 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl`}>
                <Search size={15} className={mutedText} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search phrases (e.g. Station, UPI, Gate)..."
                  className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:opacity-40"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-xs opacity-50 hover:opacity-100">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide shrink-0">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedCat === c.id
                      ? "bg-[#FFC554] text-black shadow-sm"
                      : `${isDark ? "bg-white/5" : "bg-black/5"} ${mutedText} hover:text-white`
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Phrases List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pt-1 pr-0.5 scrollbar-hide min-h-0">
              {filteredPhrases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider opacity-60">No phrases found</p>
                  <p className={`text-[11px] font-medium ${mutedText}`}>Try searching with different keywords</p>
                </div>
              ) : (
                filteredPhrases.map(p => (
                  <div
                    key={p.id}
                    className={`p-3.5 ${cardBg} border ${border} rounded-[22px] space-y-2 shadow-sm hover:border-[#FFC554]/40 transition-colors`}
                  >
                    {/* Top row: English & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black tracking-tight leading-snug">
                        {p.english}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setFullscreenPhrase(p)}
                          title="Show to Driver"
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[#FFC554]/10 text-[#FFC554] active:scale-95 transition-transform`}
                        >
                          Show
                        </button>
                        <button
                          onClick={() => handleCopy(p)}
                          aria-label="Copy phrase"
                          className={`w-7 h-7 rounded-lg ${isDark ? "bg-white/5" : "bg-black/5"} flex items-center justify-center text-zinc-400 hover:text-[#FFC554] active:scale-90 transition-transform`}
                        >
                          {copiedId === p.id ? (
                            <Check size={12} strokeWidth={3} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Pronunciation phonetic box */}
                    <div className="bg-[#FFC554]/10 border border-[#FFC554]/20 rounded-xl px-3 py-2">
                      <p className="text-xs font-black text-[#FFC554] tracking-wide">
                        &ldquo;{p.phonetic}&rdquo;
                      </p>
                    </div>

                    {/* Telugu Script */}
                    <p className={`text-xs font-bold ${mutedText} tracking-normal`}>
                      {p.telugu}
                    </p>

                    {p.tip && (
                      <p className="text-[9px] font-bold text-zinc-500 italic">
                        💡 {p.tip}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
