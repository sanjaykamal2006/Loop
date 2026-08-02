"use client";

import React, { useState, useEffect } from "react";
import { useLoop } from "@/lib/LoopContext";
import { Users, Clock, MapPin, Tag } from "lucide-react";

export default function HomeView() {
  const { activeLoops, userJoinedLoops, session, setSelectedLoop, setView, formatTime, theme } = useLoop();
  const { border, cardBg, mutedText } = theme;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

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
      {feedLoops.map((loop) => {
        const created = new Date(loop.created_at).getTime();
        const expires = new Date(loop.expires_at).getTime();
        const current = now.getTime();
        
        let progress = 0;
        if (expires > created) {
          progress = Math.max(0, Math.min(100, ((current - created) / (expires - created)) * 100));
        }
        
        const isFull = (loop.member_count || 0) >= loop.participants_limit;

        return (
          <div
            key={loop.id}
            onClick={() => {
              setSelectedLoop(loop);
              setView("ride-details");
            }}
            className={`relative overflow-hidden p-4 ${cardBg} border ${border} rounded-[28px] space-y-3 shadow-sm cursor-pointer active:scale-[0.98] `}
          >
            {/* Progress Background Fill */}
            <div 
              className="absolute inset-y-0 left-0 bg-[#FFC554]/10 transition-all duration-1000 ease-linear pointer-events-none z-0" 
              style={{ width: `${progress}%` }} 
            />

            <div className="flex justify-between items-start relative z-10">
              <h3 className="font-black text-sm uppercase tracking-tight flex-1 mr-4 break-words leading-tight">{loop.destination}</h3>
              <div className="shrink-0 px-3 py-1.5 bg-[#FFC554]/10 rounded-xl text-sm font-black text-[#FFC554] flex items-center gap-1.5">
                <Clock size={14} strokeWidth={3} /> {formatTime(loop.departure_time)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap relative z-10 pt-1">
              <div className={`flex items-center gap-1 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-wider ${mutedText} border ${border}`}>
                <Tag size={12} strokeWidth={2.5} /> {loop.category || "Other"}
              </div>

              <div className={`flex items-center gap-1 px-3 py-1.5 ${isFull ? "bg-red-500/10 text-red-500 border border-red-500/20" : `bg-black/5 dark:bg-white/5 ${mutedText} border ${border}`} rounded-full text-[10px] font-black uppercase tracking-wider`}>
                <Users size={13} strokeWidth={2.5} /> {loop.member_count}/{loop.participants_limit} {isFull && "FULL"}
              </div>

              {loop.is_female_only && (
                <div className="px-3 py-1.5 bg-pink-500/10 rounded-full text-[10px] font-black text-pink-500 uppercase tracking-wider border border-pink-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  Female Only
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
