"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MessageSquare, ChevronLeft } from "lucide-react";

export default function ChatListView() {
  const { activeLoops, userJoinedLoops, setSelectedLoop, setView, formatTime, theme } = useLoop();
  const { border, cardBg, mutedText } = theme;

  const joinedLoops = activeLoops.filter((l) => userJoinedLoops.includes(l.id));

  if (joinedLoops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] opacity-30">
        <MessageSquare size={36} strokeWidth={1.5} />
        <p className="text-xs font-black uppercase tracking-[0.2em] mt-3">No Active Chats</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      {joinedLoops.map((loop) => (
        <div
          key={loop.id}
          onClick={() => {
            setSelectedLoop(loop);
            setView("chat");
          }}
          className={`p-4 ${cardBg} border ${border} rounded-[28px] shadow-sm cursor-pointer active:scale-[0.98] `}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
                <MessageSquare size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight">{loop.destination}</h3>
                <p className={`text-[10px] font-medium ${mutedText} mt-0.5`}>{formatTime(loop.departure_time)}</p>
              </div>
            </div>
            <ChevronLeft size={16} className="rotate-180 opacity-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
