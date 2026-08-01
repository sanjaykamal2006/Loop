"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users, Clock, MapPin } from "lucide-react";

export default function HomeView() {
  const { activeLoops, userJoinedLoops, session, setSelectedLoop, setView, formatTime, theme } = useLoop();
  const { border, cardBg, mutedText } = theme;

  const feedLoops = activeLoops.filter(l => l.status === 'active');

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
      {feedLoops.map((loop) => (
        <div
          key={loop.id}
          onClick={() => {
            setSelectedLoop(loop);
            setView("ride-details");
          }}
          className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3 shadow-sm cursor-pointer active:scale-[0.98] transition-transform`}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-black text-sm uppercase tracking-tight truncate flex-1 mr-4">{loop.destination}</h3>
            <div className="px-3 py-1.5 bg-[#FFC554]/10 rounded-xl text-sm font-black text-[#FFC554] flex items-center gap-1.5">
              <Clock size={14} strokeWidth={3} /> {formatTime(loop.departure_time)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-[10px] font-bold ${mutedText} opacity-60`}>
              <Users size={12} strokeWidth={2.5} /> {loop.member_count}/{loop.participants_limit}
            </div>
            {loop.is_female_only && (
              <div className="px-2.5 py-1 bg-pink-500/10 rounded-full text-[9px] font-black text-pink-500 uppercase tracking-[0.15em] border border-pink-500/20 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                Female Only
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
