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
    return <Bus size={18} strokeWidth={2.2} />;
  }
  if (lower.includes("airport") || lower.includes("rgia") || lower.includes("vga") || lower.includes("flight")) {
    return <Plane size={18} strokeWidth={2.2} />;
  }
  if (lower.includes("station") || lower.includes("railway") || lower.includes("train") || lower.includes("bza") || lower.includes("gnt")) {
    return <Train size={18} strokeWidth={2.2} />;
  }
  if (vehicleType === "bike" || vehicleType === "scooter") {
    return <Bike size={18} strokeWidth={2.2} />;
  }
  return <Car size={18} strokeWidth={2.2} />;
}

interface RecentMsgData {
  content: string;
  created_at: string;
  user_id?: string;
  sender_name?: string;
}

function formatRecentMessagePreview(msg?: RecentMsgData, currentUserId?: string): string {
  if (!msg?.content) return "";
  const content = msg.content;
  const isLocation =
    content.includes("maps.google.com") ||
    content.includes("maps.apple.com") ||
    content.startsWith("📍") ||
    content.includes("My Spot:");

  if (isLocation) {
    if (msg.user_id && currentUserId && msg.user_id === currentUserId) {
      return "📍 Location shared by You";
    }
    const name = msg.sender_name?.trim();
    return name ? `📍 Location shared by ${name}` : "📍 Location shared";
  }

  return content;
}

export default function ChatListView() {
  const { session, profile, activeLoops, userJoinedLoops, setSelectedLoop, setView, theme, setChatSource, unreadLoopIds, markLoopAsRead } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [recentMessages, setRecentMessages] = useState<Record<string, RecentMsgData>>({});

  const joinedLoops = activeLoops.filter((l) => userJoinedLoops.includes(l.id));

  // Toggle search from custom event in header
  useEffect(() => {
    const toggle = () => setIsSearchOpen((prev) => !prev);
    window.addEventListener("toggle-chat-search", toggle);
    return () => window.removeEventListener("toggle-chat-search", toggle);
  }, []);

  // Fetch the latest real message for joined loops with sender profile
  const fetchRecentMessages = useCallback(async () => {
    if (joinedLoops.length === 0) return;
    const loopIds = joinedLoops.map((l) => l.id);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("loop_id, content, created_at, user_id, profiles:user_id(display_name)")
        .in("loop_id", loopIds)
        .order("created_at", { ascending: false });

      let list = data;
      if (error || !data) {
        const fallback = await supabase
          .from("messages")
          .select("loop_id, content, created_at, user_id")
          .in("loop_id", loopIds)
          .order("created_at", { ascending: false });
        list = fallback.data as any;
      }

      if (list && list.length > 0) {
        const missingUserIds = list
          .filter((m: any) => !m.profiles?.display_name && m.user_id)
          .map((m: any) => m.user_id);

        const profileNameMap: Record<string, string> = {};
        if (missingUserIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", Array.from(new Set(missingUserIds)));
          if (profs) {
            profs.forEach((p: any) => {
              if (p.id && p.display_name) profileNameMap[p.id] = p.display_name;
            });
          }
        }

        const msgMap: Record<string, RecentMsgData> = {};
        for (const m of list) {
          if (!msgMap[m.loop_id]) {
            const joinedProfiles = (m as any).profiles;
            const joinedName = Array.isArray(joinedProfiles)
              ? joinedProfiles[0]?.display_name
              : joinedProfiles?.display_name;
            const senderName = joinedName || profileNameMap[m.user_id] || "";
            msgMap[m.loop_id] = {
              content: m.content,
              created_at: m.created_at,
              user_id: m.user_id,
              sender_name: senderName,
            };
          }
        }
        setRecentMessages(msgMap);
      }
    } catch {}
  }, [joinedLoops]);

  useEffect(() => {
    fetchRecentMessages();

    // Real-time listener for incoming messages to keep recent message preview live
    const channel = supabase
      .channel("chat-list-recent-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg?.loop_id || !msg.content) return;

          const isMe = msg.user_id === session?.user?.id;
          let senderName = isMe ? (profile?.display_name || "You") : "";

          setRecentMessages((prev) => ({
            ...prev,
            [msg.loop_id]: {
              content: msg.content,
              created_at: msg.created_at,
              user_id: msg.user_id,
              sender_name: senderName,
            },
          }));

          if (!isMe && msg.user_id) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", msg.user_id)
              .single();
            if (data?.display_name) {
              setRecentMessages((prev) => {
                const cur = prev[msg.loop_id];
                if (cur && cur.created_at === msg.created_at) {
                  return { ...prev, [msg.loop_id]: { ...cur, sender_name: data.display_name } };
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecentMessages]);

  const filteredLoops = joinedLoops.filter((loop) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const recent = recentMessages[loop.id];
    const previewText = recent ? formatRecentMessagePreview(recent, session?.user?.id).toLowerCase() : "";
    return loop.destination.toLowerCase().includes(q) || previewText.includes(q);
  });

  if (joinedLoops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] opacity-30 text-center px-4">
        <MessageSquare size={32} strokeWidth={1.5} />
        <p className="text-xs font-black uppercase tracking-[0.2em] mt-3">No Active Chats</p>
        <p className="text-[11px] font-medium mt-1">Join or create a loop to coordinate with your ride group</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      {/* Search Input Bar (Toggled via Header Search Button) */}
      {isSearchOpen && (
        <div className="relative animate-fade-in mb-2">
          <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className={`w-full h-9 pl-9 pr-9 rounded-[16px] ${cardBg} border ${border} text-xs font-bold outline-none focus:border-[#FFC554] transition-colors`}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]"
            >
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Compact Chat Cards */}
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
            className={`p-3 px-3.5 rounded-[20px] border transition-all cursor-pointer active:scale-[0.98] ${
              isDark
                ? "bg-[#121214] border-white/10 hover:border-white/20"
                : "bg-white border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            } ${isUnread ? "ring-1 ring-[#FFC554]/60" : ""}`}
          >
            {/* Top Row: Icon + Destination + Time + Chevron */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Yellow Tinted Icon Badge (Compact w-9 h-9) */}
                <div
                  className={`w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 transition-colors ${
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
                    <h3 className="font-black text-xs sm:text-[13px] uppercase tracking-tight leading-snug break-words">
                      {loop.destination}
                    </h3>
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFC554] animate-pulse shrink-0" />
                    )}
                  </div>
                  <p className={`text-[10px] font-medium ${mutedText} mt-0.5`}>
                    {formatDepartureDate(loop.departure_time)}
                  </p>
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight size={16} className="opacity-40 shrink-0 ml-2" />
            </div>

            {/* ONLY render recent message if an actual message exists */}
            {latestMsg?.content && (
              <>
                {/* Subtle Divider Line */}
                <div
                  className={`border-t ${
                    isDark ? "border-white/[0.06]" : "border-black/[0.05]"
                  } my-2 pt-1.5`}
                />

                {/* Bottom Row: Actual Recent message + real timestamp */}
                <div>
                  <span className={`text-[9px] font-medium ${mutedText} block mb-0.5`}>
                    Recent message
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold truncate opacity-90">
                      {formatRecentMessagePreview(latestMsg, session?.user?.id)}
                    </p>
                    <span className={`text-[10px] font-medium ${mutedText} shrink-0 ml-2`}>
                      {formatMessageTime(latestMsg.created_at)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
