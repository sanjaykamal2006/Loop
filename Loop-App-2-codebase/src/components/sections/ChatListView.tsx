"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { MessageSquare, ChevronLeft } from "lucide-react";

export default function ChatListView() {
  const { activeLoops, userJoinedLoops, setSelectedLoop, setView, formatTime, theme, setChatSource, unreadLoopIds, markLoopAsRead } = useLoop();
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
      {joinedLoops.map((loop) => {
        const isUnread = unreadLoopIds?.includes(loop.id);
        return (
          <div
            key={loop.id}
            onClick={() => {
              if (isUnread) markLoopAsRead(loop.id);
              setSelectedLoop(loop);
              setChatSource("chat-list");
              setView("chat");
            }}
            className={`p-4 ${cardBg} border ${isUnread ? "border-[#FFC554]/70 shadow-[0_0_12px_rgba(255,197,84,0.12)]" : border} rounded-[28px] shadow-sm cursor-pointer active:scale-[0.98] transition-all`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${isUnread ? "bg-[#FFC554] text-black" : "bg-[#FFC554]/10 text-[#FFC554]"} flex items-center justify-center transition-colors relative shrink-0`}>
                  <MessageSquare size={18} strokeWidth={2.5} />
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FFC554] ring-2 ring-black animate-pulse shadow-sm" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm uppercase tracking-tight">{loop.destination}</h3>
                    {isUnread && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFC554] text-black font-black text-[9px] uppercase tracking-wider animate-pulse shadow-sm">
                        New 💬
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] font-medium ${mutedText} mt-0.5`}>{formatTime(loop.departure_time)}</p>
                </div>
              </div>
              <ChevronLeft size={16} className={`rotate-180 ${isUnread ? "text-[#FFC554]" : "opacity-20"}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
