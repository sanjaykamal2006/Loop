"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { formatLocation } from "@/lib/locationFormatter";
import { MapPin, Search, X, Repeat } from "lucide-react";
import { VehicleTypeIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";
import { HandDrawnArrow, WashiTape, HandDrawnSearch } from "@/components/ui/HandDrawnIcons";
import type { Loop } from "@/lib/types";

const POPULAR_CAMPUS_ROUTES = [
  {
    id: "bza-station",
    name: "Vijayawada Railway Station",
    destination: "Vijayawada Railway Station",
    subtitle: "Peak train arrivals & departures",
  },
  {
    id: "airport",
    name: "Vijayawada Airport",
    destination: "Airport",
    subtitle: "Gannavaram flight sync & express autos",
  },
  {
    id: "bus-stand",
    name: "Vijayawada Bus Stand",
    destination: "Vijayawada Bus Stand",
    subtitle: "PNBS RTC & inter-city coaches",
  },
];

interface LoopCardProps {
  loop: Loop;
  isJoined: boolean;
  isHost: boolean;
  isDark: boolean;
  isPaper?: boolean;
  cardBg: string;
  border: string;
  timeFormatted: string;
  index: number;
  onSelect: () => void;
}

const LoopCard = React.memo(function LoopCard({
  loop,
  isJoined,
  isHost,
  isDark,
  isPaper = false,
  cardBg,
  border,
  timeFormatted,
  index,
  onSelect,
}: LoopCardProps) {
  const currentSeats = loop.member_count || 1;
  const maxSeats = loop.participants_limit || 4;
  const isFull = currentSeats >= maxSeats;

  return (
    <div
      onClick={onSelect}
      style={{ "--stagger-delay": `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}
      className={`p-3 px-3.5 sm:px-4 flex items-center ${cardBg} rounded-[24px] cursor-pointer active:scale-[0.965] relative transition-all duration-150 animate-card-enter ${
        isPaper
          ? "border-2 border-[#2A2420] shadow-[2px_2.5px_0px_#2A2420] hover:shadow-[3px_3.5px_0px_#2A2420]"
          : `border ${border} shadow-sm hover:border-[#FFC554]/30`
      }`}
    >
      {/* Washi Tape strip in Paper Theme */}
      {isPaper && (
        <WashiTape
          width={54}
          height={14}
          color={index % 2 === 0 ? "coral" : "yellow"}
          angle={index % 2 === 0 ? -1.6 : 1.8}
          className="absolute -top-2 left-6 z-20"
        />
      )}

      {/* Left Squircle Icon Container */}
      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 ${
        isPaper
          ? "bg-[#FAF8F5] border border-[#2A2420]/30 shadow-xs"
          : isDark
          ? "bg-white/[0.04] border border-white/10"
          : "bg-black/[0.04] border border-black/10"
      }`}>
        <VehicleTypeIcon
          vehicleType={loop.vehicle_type}
          size={22}
          className={isPaper ? "text-[#2A2420]" : isDark ? "text-[#FFC554]" : "text-[#881337]"}
          strokeWidth={2}
        />
      </div>

      {/* Route & Info Block */}
      <div className="ml-3 sm:ml-3.5 flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-bold text-[13px] sm:text-[14px] ${isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-zinc-900"} leading-snug break-words`}>
            {loop.start_point || "Campus"}
          </span>
          {isPaper ? (
            <HandDrawnArrow size={14} color="#2A2420" className="shrink-0 mx-0.5" />
          ) : (
            <span className={`font-bold text-xs shrink-0 mx-0.5 ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>→</span>
          )}
          <span className={`font-bold text-[13px] sm:text-[14px] ${isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-zinc-900"} leading-snug break-words`}>
            {loop.destination}
          </span>
        </div>

        {/* Badges sub-row */}
        {(isJoined || loop.is_female_only || (loop.purpose === "return" && isHost) || isHost) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* RETURN BADGE - only visible to the author (host) */}
            {loop.purpose === "return" && isHost && (
              <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/35 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <Repeat size={8} strokeWidth={2.5} />
                <span>Return</span>
              </span>
            )}

            {isHost && (
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${isDark ? "bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/25" : "bg-[#881337]/10 text-[#881337] border border-[#881337]/30"}`}>
                Host
              </span>
            )}

            {isJoined && !isHost && (
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${isDark ? "bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/25" : "bg-[#881337]/10 text-[#881337] border border-[#881337]/30"}`}>
                Joined
              </span>
            )}

            {loop.is_female_only && (
              <span className="text-[8px] font-black uppercase tracking-wider bg-pink-500/15 text-pink-400 border border-pink-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                Female
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle Vertical Divider */}
      <div className={`w-px h-8 ${isDark ? "bg-white/10" : "bg-black/10"} shrink-0 mx-2 sm:mx-3`} />

      {/* Time & Seats Block */}
      <div className="shrink-0 flex flex-col items-end justify-center">
        <span className={`font-bold text-[12px] sm:text-[13px] tracking-tight ${isDark ? "text-white" : "text-zinc-900"} whitespace-nowrap`}>
          {timeFormatted}
        </span>
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-[9px] font-mono font-bold ${
            isFull
              ? "text-red-400"
              : isDark ? "text-zinc-400" : "text-stone-600"
          }`}>
            {currentSeats}/{maxSeats}
          </span>
          <div className="flex items-center gap-0.5" title={`${currentSeats} of ${maxSeats} seats filled`}>
            {Array.from({ length: Math.min(maxSeats, 6) }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < currentSeats
                    ? isDark ? "bg-[#FFC554]" : "bg-[#881337]"
                    : isDark ? "bg-white/20" : "bg-black/15"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function HomeView() {
  const { activeLoops, userJoinedLoops, userLoops, setSelectedLoop, setView, formatTime, theme, profile, setShowGenderSelect, setPendingAction, setCreatePrefill } = useLoop();
  const { border, cardBg, mutedText, isDark, isPaper } = theme;

  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateClick = () => {
    triggerHaptic(12);
    const isProfileComplete = Boolean(
      profile.gender && 
      profile.display_name?.trim() && 
      profile.reg_no?.trim()
    );
    if (!isProfileComplete) {
      setPendingAction({ type: "create" });
      setShowGenderSelect(true);
      return;
    }
    setView("create");
  };

  const openLoops = activeLoops.filter(l => l.status === 'open');

  const feedLoops = openLoops.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const qClean = q.replace(/[-_\s]+/g, "");
    const formattedQuery = formatLocation(searchQuery).toLowerCase();

    const checkMatch = (val?: string | null) => {
      if (!val) return false;
      const lower = val.toLowerCase();
      if (lower.includes(q)) return true;
      if (qClean && lower.replace(/[-_\s]+/g, "").includes(qClean)) return true;
      if (formattedQuery && lower.includes(formattedQuery)) return true;
      return false;
    };

    const matchDestination = checkMatch(l.destination);
    const matchStart = checkMatch(l.start_point);
    const matchPurpose = checkMatch(l.purpose);
    const matchCreator = checkMatch(l.creator?.display_name) || checkMatch(l.creator?.reg_no);
    const matchVehicle = checkMatch(l.vehicle_type);
    const matchDriver = (q.includes("driver") || q.includes("offer") || q.includes("ride")) && l.is_driver_offering;
    const matchFemale = (q.includes("female") || q.includes("women") || q.includes("girl")) && l.is_female_only;

    return Boolean(matchDestination || matchStart || matchPurpose || matchCreator || matchVehicle || matchDriver || matchFemale);
  });

  if (openLoops.length === 0) {
    return (
      <div className="w-full max-w-full overflow-x-hidden flex flex-col items-center justify-center min-h-[55vh] text-center space-y-4 px-2 py-4">
        <div className={`w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${isDark ? "text-[#FFC554]/60" : "text-[#881337]/70"}`}>
          <MapPin size={32} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em]">No Active Loops</p>
          <p className={`text-xs ${mutedText} mt-1 max-w-[220px] mx-auto`}>Start a new loop or check back soon for active rides.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateClick}
            className={`h-10 px-5 rounded-full ${
              isPaper
                ? "bg-[#FFC554] text-[#2A2420] border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
                : isDark
                ? "bg-[#FFC554] text-black"
                : "bg-[#881337] text-white"
            } font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform cursor-pointer`}
          >
            + Create Loop
          </button>
          <button
            data-testid="wants-board-empty-btn"
            onClick={() => setView("wants")}
            className={`h-10 px-4 rounded-full border ${border} ${cardBg} font-black text-xs uppercase tracking-wider active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5`}
          >
            I Need a Ride
          </button>
        </div>

        {/* Popular Campus Routes Quick-Start (No timings, full destination names) */}
        <div className="w-full pt-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[11px] font-black uppercase tracking-wider ${isPaper ? "text-[#881337]" : mutedText}`}>
              Popular Campus Routes
            </p>
            <span className={`text-[10px] ${mutedText}`}>One-tap prefill</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {POPULAR_CAMPUS_ROUTES.map((hub) => (
              <div
                key={hub.id}
                className={`p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 ${
                  isPaper
                    ? "bg-[#FAF8F5] border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420]"
                    : `${cardBg} border ${border} shadow-sm`
                }`}
              >
                <div className="flex-1 min-w-0 pr-1">
                  <p className={`font-bold text-xs sm:text-[13px] leading-tight break-words ${
                    isPaper ? "text-[#2A2420]" : isDark ? "text-white" : "text-zinc-900"
                  }`}>
                    {hub.name}
                  </p>
                  <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${
                    isPaper ? "text-[#6B6660]" : "text-zinc-500"
                  }`}>
                    {hub.subtitle}
                  </p>
                </div>
                <button
                  data-testid={`transit-hub-${hub.id}-btn`}
                  onClick={() => {
                    setCreatePrefill({ destination: hub.destination, startPoint: "VIT-AP Campus" });
                    handleCreateClick();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider shrink-0 active:scale-95 transition-all cursor-pointer ${
                    isPaper
                      ? "bg-[#FFC554] text-[#2A2420] border border-[#2A2420] shadow-[1px_1px_0px_#2A2420]"
                      : isDark
                      ? "bg-[#FFC554] text-black shadow-xs"
                      : "bg-[#881337] text-white shadow-xs"
                  }`}
                >
                  START RIDE
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-3 pt-1 pb-8">
      {/* Pill Search Bar */}
      <div className={`relative w-full h-[42px] ${cardBg} rounded-full flex items-center px-3.5 gap-2.5 transition-all ${
        isPaper
          ? "border-2 border-[#2A2420] shadow-[2px_2px_0px_#2A2420] focus-within:ring-1 focus-within:ring-[#FFC554]"
          : `border ${border} shadow-sm ${
              isDark
                ? "focus-within:border-[#FFC554]/80 focus-within:ring-1 focus-within:ring-[#FFC554]/30"
                : "focus-within:border-[#881337]/80 focus-within:ring-1 focus-within:ring-[#881337]/30"
            }`
      }`}>
        {isPaper ? (
          <HandDrawnSearch size={16} color="#2A2420" className="shrink-0" />
        ) : (
          <Search size={16} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#881337] shrink-0"} />
        )}
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search loops"
          placeholder="Search destination, pickup, or tag..."
          className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-zinc-500 placeholder:text-xs placeholder:font-normal"
        />
        {searchQuery.trim() && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPaper
                ? "text-[#2A2420] bg-[#FFC554] border border-[#2A2420]"
                : isDark
                ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20"
                : "text-[#881337] bg-[#881337]/10 border border-[#881337]/30"
            }`}>
              {feedLoops.length} {feedLoops.length === 1 ? "loop" : "loops"}
            </span>
            <button
              onClick={() => {
                triggerHaptic(6);
                setSearchQuery("");
              }}
              aria-label="Clear search"
              className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white shrink-0 active:scale-90 transition-transform"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Demand / Co-travellers button */}
      <button
        data-testid="wants-board-feed-btn"
        onClick={() => setView("wants")}
        className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center justify-between text-xs font-bold ${
          isPaper
            ? "bg-[#FAF8F5] border-2 border-[#2A2420] text-[#2A2420] shadow-[1.5px_1.5px_0px_#2A2420]"
            : `${cardBg} border ${border} shadow-xs`
        } active:scale-[0.98] transition-all cursor-pointer`}
      >
        <span className={isPaper ? "text-[#2A2420]" : isDark ? "text-zinc-300" : "text-zinc-700"}>Looking for co-travellers?</span>
        <span className={`text-[11px] font-black uppercase tracking-wider ${isPaper ? "text-[#2A2420]" : isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
          View Demand Board →
        </span>
      </button>

      {/* Empty State when Search has no matches */}
      {feedLoops.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className={`w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${isDark ? "text-[#FFC554]/70" : "text-[#881337]/70"}`}>
            <Search size={22} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">No loops found</p>
            <p className={`text-xs ${mutedText} mt-1 max-w-[240px]`}>
              No active rides match <span className={`${isDark ? "text-[#FFC554]" : "text-[#881337]"} font-semibold`}>"{searchQuery}"</span>. Try searching another destination, pickup, or user.
            </p>
          </div>
          <button
            onClick={() => setSearchQuery("")}
            className="h-8 px-4 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold tracking-wide active:scale-95 transition-all"
          >
            Clear Search
          </button>
        </div>
      )}

      {feedLoops.map((loop, idx) => (
        <LoopCard
          key={loop.id}
          loop={loop}
          index={idx}
          isJoined={userJoinedLoops.includes(loop.id)}
          isHost={userLoops.includes(loop.id)}
          isDark={isDark}
          isPaper={isPaper}
          cardBg={cardBg}
          border={border}
          timeFormatted={formatTime(loop.departure_time)}
          onSelect={() => {
            triggerHaptic(10);
            setSelectedLoop(loop);
            setView("ride-details");
          }}
        />
      ))}
    </div>
  );
}
