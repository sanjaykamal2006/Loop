"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users, Clock, MapPin, Tag, CarFront } from "lucide-react";

export default function HomeView() {
  const { activeLoops, userJoinedLoops, session, setSelectedLoop, setView, formatTime, theme } = useLoop();
  const { border, cardBg, mutedText, isDark } = theme;

  const feedLoops = activeLoops.filter(l => l.status === 'open');

  if (feedLoops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] text-center opacity-40">
        <MapPin size={36} strokeWidth={1.5} />
        <p className="text-xs font-black uppercase tracking-[0.2em] mt-3">No Active Loops</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      {feedLoops.map((loop) => {
        const isFull = (loop.member_count || 0) >= loop.participants_limit;

        return (
          <div
            key={loop.id}
            onClick={() => {
              setSelectedLoop(loop);
              setView("ride-details");
            }}
            className={`p-2.5 flex items-center ${isDark ? "bg-[#1C1C1E]" : "bg-[#FFFFFF]"} rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.05)] cursor-pointer active:scale-[0.98] border border-black/5 dark:border-white/5 relative overflow-hidden`}
          >
            {loop.is_female_only && (
              <div className="absolute top-0 right-0 bg-pink-500 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest z-10">
                Female Only
              </div>
            )}
            
            {/* Icon Block */}
            <div className="w-[44px] h-[44px] bg-[#FFC53D] rounded-[14px] flex items-center justify-center shrink-0">
              <CarFront size={24} className="text-[#000000]" strokeWidth={2.5} />
            </div>

            {/* Text Block */}
            <div className="ml-3 flex-1 flex flex-col justify-center gap-0.5">
              <div className="flex items-center gap-1.5 truncate pr-2">
                <span className={`font-bold text-sm ${isDark ? "text-[#FFFFFF]" : "text-[#000000]"} truncate max-w-[80px]`}>
                  {loop.start_point || "Anywhere"}
                </span>
                <span className="text-[#FFC53D] font-bold text-sm shrink-0">&rarr;</span>
                <span className={`font-bold text-sm ${isDark ? "text-[#FFFFFF]" : "text-[#000000]"} truncate`}>
                  {loop.destination}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 ${isDark ? "text-[#8E8E93]" : "text-[#6E6E73]"}`}>
                <Users size={14} strokeWidth={2.5} />
                <span className="font-semibold text-xs leading-none tracking-wide">{loop.member_count}/{loop.participants_limit}</span>
                {isFull && <span className="text-[9px] text-red-500 font-black ml-1 uppercase">Full</span>}
              </div>
            </div>

            {/* Divider & Time Block */}
            <div className={`flex items-center pl-3 pr-1 border-l ${isDark ? "border-[#333333]" : "border-[#E5E5EA]"} shrink-0 h-[36px]`}>
              <div className="flex flex-col items-center justify-center min-w-[55px] gap-0.5">
                <Clock size={16} className="text-[#FFC53D]" strokeWidth={2.5} />
                <span className={`font-bold text-[10px] leading-none ${isDark ? 'text-[#FFC53D]' : 'text-[#000000]'}`}>
                  {formatTime(loop.departure_time)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
