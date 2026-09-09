"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { formatLocation } from "@/lib/locationFormatter";
import { getDepartureDateBadge } from "@/lib/dateFormatter";
import { Users, Clock, MapPin, Search, X, CarFront } from "lucide-react";
import { SteeringWheelIcon, VehicleTypeIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";

export default function HomeView() {
  const { activeLoops, userJoinedLoops, userLoops, setSelectedLoop, setView, formatTime, theme, profile, setShowGenderSelect, setPendingAction } = useLoop();
  const { border, cardBg, mutedText, isDark } = theme;

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
      <div className="flex flex-col items-center justify-center h-[55vh] text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#FFC554]/60">
          <MapPin size={32} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em]">No Active Loops</p>
          <p className={`text-xs ${mutedText} mt-1 max-w-[220px]`}>Start a new loop or check back soon for active rides.</p>
        </div>
        <button
          onClick={handleCreateClick}
          className="h-10 px-5 rounded-full bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
        >
          + Create Loop
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1 pb-8">
      {/* Pill Search Bar */}
      <div className={`relative w-full h-[42px] ${cardBg} border ${border} rounded-full flex items-center px-3.5 gap-2.5 shadow-sm focus-within:border-[#FFC554]/80 focus-within:ring-1 focus-within:ring-[#FFC554]/30 transition-all`}>
        <Search size={16} className={isDark ? "text-[#FFC554] shrink-0" : "text-[#B45309] shrink-0"} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search destination, pickup, or tag..."
          className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-zinc-500 placeholder:text-xs placeholder:font-normal"
        />
        {searchQuery.trim() && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? "text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20" : "text-[#B45309] bg-[#B45309]/10 border border-[#B45309]/30"}`}>
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



      {/* Empty State when Search has no matches */}
      {feedLoops.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#FFC554]/70">
            <Search size={22} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">No loops found</p>
            <p className={`text-xs ${mutedText} mt-1 max-w-[240px]`}>
              No active rides match <span className="text-[#FFC554] font-semibold">"{searchQuery}"</span>. Try searching another destination, pickup, or user.
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

      {feedLoops.map((loop) => {
        const isJoined = userJoinedLoops.includes(loop.id);

        return (
          <div
            key={loop.id}
            onClick={() => {
              triggerHaptic(10);
              setSelectedLoop(loop);
              setView("ride-details");
            }}
            className={`p-3 px-3.5 sm:px-4 flex items-center ${cardBg} rounded-[24px] shadow-sm cursor-pointer active:scale-[0.98] border ${border} relative transition-all hover:border-[#FFC554]/30`}
          >
            {/* Left Squircle Icon Container */}
            <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 ${
              isDark ? "bg-white/[0.04] border border-white/10" : "bg-black/[0.04] border border-black/10"
            }`}>
              <VehicleTypeIcon vehicleType={loop.vehicle_type} size={22} className={isDark ? "text-[#FFC554]" : "text-[#B45309]"} strokeWidth={2} />
            </div>

            {/* Route & Info Block (Zero truncation, no dots, full text wraps cleanly) */}
            <div className="ml-3 sm:ml-3.5 flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-bold text-[13px] sm:text-[14px] ${isDark ? "text-white" : "text-zinc-900"} leading-snug break-words`}>
                  {loop.start_point || "Campus"}
                </span>
                <span className={`font-bold text-xs shrink-0 mx-0.5 ${isDark ? "text-[#FFC554]" : "text-[#B45309]"}`}>→</span>
                <span className={`font-bold text-[13px] sm:text-[14px] ${isDark ? "text-white" : "text-zinc-900"} leading-snug break-words`}>
                  {loop.destination}
                </span>
              </div>

              {/* Badges sub-row: Never steals horizontal width from route text */}
              {(isJoined || loop.is_female_only) && (
                <div className="flex items-center gap-1.5 mt-1">
                  {isJoined && (
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${isDark ? "bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/25" : "bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/30"}`}>
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
            <div className={`w-px h-7 ${isDark ? "bg-white/10" : "bg-black/10"} shrink-0 mx-2.5 sm:mx-3`} />

            {/* Time Block */}
            <div className="shrink-0 flex items-center">
              <span className={`font-bold text-[13px] sm:text-[14px] tracking-tight ${isDark ? "text-white" : "text-zinc-900"} whitespace-nowrap`}>
                {formatTime(loop.departure_time)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
