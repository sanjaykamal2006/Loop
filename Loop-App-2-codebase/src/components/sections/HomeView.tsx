"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users, Clock, MapPin, Tag } from "lucide-react";

const SolidCarIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" className={className} viewBox="0 0 16 16">
    <path d="M2.52 3.515A2.5 2.5 0 0 1 4.82 2h6.362c1 0 1.904.596 2.298 1.515l.792 1.848c.075.175.21.319.38.404.5.25.855.715.965 1.262l.335 1.679c.033.161.049.325.049.49v.413c0 .814-.39 1.543-1 1.997V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.338c-1.292.048-2.745.088-4 .088s-2.708-.04-4-.088V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.892c-.61-.454-1-1.183-1-1.997v-.413a2.5 2.5 0 0 1 .049-.49l.335-1.68c.11-.546.465-1.012.964-1.261a.807.807 0 0 0 .381-.404l.792-1.848ZM3 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2m10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2M6 8a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2zM2.906 5.189a.51.51 0 0 0 .497.731c.91-.073 3.35-.17 4.597-.17 1.247 0 3.688.097 4.597.17a.51.51 0 0 0 .497-.731l-.956-1.913A.5.5 0 0 0 11.691 3H4.309a.5.5 0 0 0-.447.276L2.906 5.19Z"/>
  </svg>
);

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
            className={`p-2.5 pl-3 pr-4 flex items-center ${isDark ? "bg-[#1C1C1E]" : "bg-[#FFFFFF]"} rounded-[28px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] cursor-pointer active:scale-[0.98] border ${isDark ? "border-white/5" : "border-black/5"} relative overflow-hidden`}
          >
            {loop.is_female_only && (
              <div className="absolute top-0 right-0 bg-pink-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest z-10">
                Female Only
              </div>
            )}

            {/* Icon Block */}
            <div className="w-[48px] h-[48px] bg-[#FFC53D] rounded-[16px] flex items-center justify-center shrink-0">
              <SolidCarIcon size={24} className="text-[#000000]" />
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
              <div className={`flex items-center gap-1 ${isDark ? "text-[#8E8E93]" : "text-[#6E6E73]"}`}>
                <Users size={14} strokeWidth={2} className="shrink-0" />
                <span className="font-semibold text-[13px] leading-none">{loop.member_count}/{loop.participants_limit}</span>
                {isFull && <span className="text-[9px] text-red-500 font-black ml-1 uppercase shrink-0">Full</span>}
              </div>
            </div>

            {/* Divider */}
            <div className={`w-px h-[32px] ${isDark ? "bg-[#333338]" : "bg-[#E5E5EA]"} shrink-0 mx-3`} />

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
