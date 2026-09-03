"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users, Clock, MapPin } from "lucide-react";
import { SteeringWheelIcon, MotorcycleIcon, ScooterIcon, SolidCarIcon } from "@/components/ui/VehicleIcons";

export default function HomeView() {
  const { activeLoops, userJoinedLoops, setSelectedLoop, setView, formatTime, theme, profile, setShowGenderSelect, setPendingAction } = useLoop();
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

  const feedLoops = activeLoops
    .filter(l => l.status === 'open')
    .filter(l => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (l.destination?.toLowerCase().includes(q) || l.start_point?.toLowerCase().includes(q));
    });

  if (activeLoops.filter(l => l.status === 'open').length === 0) {
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
      {activeLoops.filter(l => l.status === 'open').length > 2 && (
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search destination or origin..."
          className={`w-full h-10 ${cardBg} border ${border} rounded-2xl px-4 text-xs font-bold outline-none focus:border-[#FFC554] placeholder:opacity-40 transition-colors mb-1`}
        />
      )}

      {feedLoops.length === 0 && searchQuery && (
        <p className={`text-xs ${mutedText} text-center py-8`}>No rides matching "{searchQuery}"</p>
      )}

      {feedLoops.map((loop) => {
        const isFull = (loop.member_count || 0) >= loop.participants_limit;
        const isJoined = userJoinedLoops.includes(loop.id);

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
