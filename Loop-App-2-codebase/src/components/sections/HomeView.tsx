"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users, Clock, MapPin, Search, X } from "lucide-react";
import { SteeringWheelIcon, MotorcycleIcon, ScooterIcon, SolidCarIcon } from "@/components/ui/VehicleIcons";

export default function HomeView() {
  const { activeLoops, userJoinedLoops, userLoops, setSelectedLoop, setView, formatTime, theme, profile, setShowGenderSelect, setPendingAction } = useLoop();
  const { border, cardBg, mutedText, isDark } = theme;

  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateClick = () => {
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

    const checkMatch = (val?: string | null) => {
      if (!val) return false;
      const lower = val.toLowerCase();
      if (lower.includes(q)) return true;
      if (qClean && lower.replace(/[-_\s]+/g, "").includes(qClean)) return true;
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
        <Search size={16} className="text-[#FFC554] shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search destination, pickup, or user..."
          className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-zinc-500 placeholder:text-xs placeholder:font-normal"
        />
        {searchQuery.trim() && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20 px-2 py-0.5 rounded-full">
              {feedLoops.length} {feedLoops.length === 1 ? "loop" : "loops"}
            </span>
            <button
              onClick={() => setSearchQuery("")}
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
        const isFull = (loop.member_count || 0) >= loop.participants_limit;
        const isJoined = userJoinedLoops.includes(loop.id);
        const creatorName = userLoops.includes(loop.id) ? "You" : loop.creator?.display_name;

        return (
          <div
            key={loop.id}
            onClick={() => {
              setSelectedLoop(loop);
              setView("ride-details");
            }}
            className={`p-2.5 pl-3 pr-4 flex items-center ${isDark ? "bg-[#1C1C1E]" : "bg-[#FFFFFF]"} rounded-[28px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] cursor-pointer active:scale-[0.98] border ${isDark ? "border-white/5" : "border-black/5"} relative overflow-hidden`}
          >
            {loop.is_female_only && (
              <div className="absolute top-0 right-0 bg-pink-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest z-10">
                Female Only
              </div>
            )}

            {/* Icon Block with dynamic vehicle icon */}
            <div className="w-[48px] h-[48px] bg-[#FFC53D] rounded-[16px] flex items-center justify-center shrink-0">
              {loop.is_driver_offering && loop.vehicle_type === "bike" ? (
                <MotorcycleIcon size={24} className="text-[#000000]" />
              ) : loop.is_driver_offering && loop.vehicle_type === "scooter" ? (
                <ScooterIcon size={24} className="text-[#000000]" />
              ) : (
                <SolidCarIcon size={24} className="text-[#000000]" />
              )}
            </div>

            {/* Text Block */}
            <div className="ml-3 flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center mb-0.5">
                <span className={`font-bold text-[14px] ${isDark ? "text-white" : "text-black"} shrink-0`}>
                  {loop.start_point || "Anywhere"}
                </span>
                <span className="text-[#FFC53D] font-bold text-[13px] shrink-0 mx-1.5">&rarr;</span>
                <span className={`font-bold text-[14px] ${isDark ? "text-white" : "text-black"} truncate`}>
                  {loop.destination}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 ${isDark ? "text-[#8E8E93]" : "text-[#6E6E73]"}`}>
                <Users size={14} strokeWidth={2} className="shrink-0" />
                <span className="font-semibold text-[13px] leading-none">{loop.member_count}/{loop.participants_limit}</span>
                {creatorName && (
                  <span className="text-[11px] font-medium opacity-70 truncate max-w-[120px]">
                    • by {creatorName}
                  </span>
                )}
                {isFull && <span className="text-[9px] text-red-500 font-black uppercase shrink-0">Full</span>}
                {isJoined && (
                  <span className="text-[8px] bg-[#FFC554]/20 text-[#FFC554] border border-[#FFC554]/30 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ml-1">
                    Joined
                  </span>
                )}
              </div>
            </div>

            {/* Steering Wheel Icon for Day Scholar / Student Driver */}
            {loop.is_driver_offering && (
              <div 
                className="w-7 h-7 rounded-full bg-[#FFC554]/15 border border-[#FFC554]/30 flex items-center justify-center text-[#FFC554] shrink-0 mr-1"
                title="Student Driver offering ride"
              >
                <SteeringWheelIcon size={15} />
              </div>
            )}

            {/* Divider */}
            <div className={`w-px h-[32px] ${isDark ? "bg-[#333338]" : "bg-[#E5E5EA]"} shrink-0 mx-2.5`} />

            {/* Time Block */}
            <div className="flex flex-col items-center justify-center shrink-0 min-w-[52px]">
              <Clock size={16} className="text-[#FFC53D] mb-1.5" strokeWidth={2} />
              <span className={`font-bold text-[10px] leading-none whitespace-nowrap tracking-wide ${isDark ? "text-[#FFC53D]" : "text-black"}`}>
                {formatTime(loop.departure_time)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
