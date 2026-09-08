"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, ChevronRight, Bus, Car, Plane, Train, Bike, Search, X } from "lucide-react";

function formatDepartureDate(departureIso: string): string {
  try {
    const d = new Date(departureIso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today • ${timeStr}`;
    if (isTomorrow) return `Tomorrow • ${timeStr}`;
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${dateStr} • ${timeStr}`;
  } catch {
    return "Upcoming";
  }
}

function formatMessageTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getDestinationIcon(dest: string, vehicleType?: string | null) {
  const lower = (dest || "").toLowerCase();
  if (lower.includes("bus") || lower.includes("pnbs") || lower.includes("stand")) {
    return <Bus size={22} strokeWidth={2.2} />;
  }
  if (lower.includes("airport") || lower.includes("rgia") || lower.includes("vga") || lower.includes("flight")) {
    return <Plane size={22} strokeWidth={2.2} />;
  }
  if (lower.includes("station") || lower.includes("railway") || lower.includes("train") || lower.includes("bza") || lower.includes("gnt")) {
    return <Train size={22} strokeWidth={2.2} />;
  }
  if (vehicleType === "bike" || vehicleType === "scooter") {
    return <Bike size={22} strokeWidth={2.2} />;
  }
  return <Car size={22} strokeWidth={2.2} />;
}

export default function ChatListView() {
  const { activeLoops, userJoinedLoops, setSelectedLoop, setView, theme, setChatSource, unreadLoopIds, markLoopAsRead } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [recentMessages, setRecentMessages] = useState<Record<string, { content: string; created_at: string }>>({});

  const joinedLoops = activeLoops.filter((l) => userJoinedLoops.includes(l.id));

  // Toggle search from custom event in header
  useEffect(() => {
    const toggle = () => setIsSearchOpen((prev) => !prev);
    window.addEventListener("toggle-chat-search", toggle);
    return () => window.removeEventListener("toggle-chat-search", toggle);
  }, []);

  // Fetch the latest message for joined loops
  const fetchRecentMessages = useCallback(async () => {
    if (joinedLoops.length === 0) return;
    const loopIds = joinedLoops.map((l) => l.id);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("loop_id, content, created_at")
        .in("loop_id", loopIds)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const msgMap: Record<string, { content: string; created_at: string }> = {};
        for (const m of data) {
          if (!msgMap[m.loop_id]) {
            msgMap[m.loop_id] = { content: m.content, created_at: m.created_at };
          }
        }
        setRecentMessages(msgMap);
      }
    } catch {}
  }, [joinedLoops]);

  useEffect(() => {
    fetchRecentMessages();
    const interval = setInterval(fetchRecentMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchRecentMessages]);

  const filteredLoops = joinedLoops.filter((loop) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const recent = recentMessages[loop.id]?.content?.toLowerCase() || "";
    return loop.destination.toLowerCase().includes(q) || recent.includes(q);
  });

  if (joinedLoops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] opacity-30 text-center px-4">
        <MessageSquare size={36} strokeWidth={1.5} />
        <p className="text-xs font-black uppercase tracking-[0.2em] mt-3">No Active Chats</p>
        <p className="text-[11px] font-medium mt-1">Join or create a loop to coordinate with your ride group</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Search Input Bar (Toggled via Header Search Button) */}
      {isSearchOpen && (
        <div className="relative animate-fade-in">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className={`w-full h-10 pl-9 pr-9 rounded-[18px] ${cardBg} border ${border} text-xs font-bold outline-none focus:border-[#FFC554] transition-colors`}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Chat Cards */}
      {filteredLoops.map((loop) => {
        const isUnread = unreadLoopIds?.includes(loop.id);
        const latestMsg = recentMessages[loop.id];

        return (
          <div
            key={loop.id}
            onClick={() => {
              if (isUnread) markLoopAsRead(loop.id);
              setSelectedLoop(loop);
              setChatSource("chat-list");
              setView("chat");
            }}
            className={`p-4 sm:p-5 rounded-[24px] border transition-all cursor-pointer active:scale-[0.98] ${
              isDark
                ? "bg-[#121214] border-white/10"
                : "bg-white border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
            } ${isUnread ? "ring-1 ring-[#FFC554]/60" : ""}`}
          >
            {/* Top Row: Icon + Destination + Time + Chevron */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Yellow Tinted Icon Badge */}
                <div
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 transition-colors ${
                    isDark
                      ? "bg-[#281c08] text-[#FFC554] border border-[#FFC554]/20"
                      : "bg-[#FFF0CE] text-[#8B5A10] border border-[#FDE68A]"
                  }`}
                >
                  {getDestinationIcon(loop.destination, loop.vehicle_type)}
                </div>

                {/* Destination & Time */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-[13px] sm:text-sm uppercase tracking-tight truncate">
                      {loop.destination}
                    </h3>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#FFC554] animate-pulse shrink-0" />
                    )}
                  </div>
                  <p className={`text-[11px] sm:text-xs font-medium ${mutedText} mt-0.5`}>
                    {formatDepartureDate(loop.departure_time)}
                  </p>
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight size={18} className="opacity-40 shrink-0 ml-2" />
            </div>

            {/* Subtle Divider Line */}
            <div
              className={`border-t ${
                isDark ? "border-white/[0.07]" : "border-black/[0.06]"
              } my-3 pt-2.5`}
            />

            {/* Bottom Row: Recent message + timestamp */}
            <div>
              <span className={`text-[10px] font-medium ${mutedText} block mb-0.5`}>
                Recent message
              </span>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-[13px] font-bold truncate opacity-90">
                  {latestMsg?.content || "Anyone reaching soon?"}
                </p>
                <span className={`text-[11px] font-medium ${mutedText} shrink-0 ml-2`}>
                  {formatMessageTime(latestMsg?.created_at) || formatMessageTime(loop.departure_time)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
