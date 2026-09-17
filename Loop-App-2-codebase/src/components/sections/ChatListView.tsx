"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLoop } from "@/lib/LoopContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, ChevronRight, Bus, Plane, Train, Search, X } from "lucide-react";
import { AutoRickshawIcon, ScooterIcon, MotorcycleIcon, CarIcon, ShareAutoIcon } from "@/components/ui/VehicleIcons";

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
  if (vehicleType === "auto") {
    return <AutoRickshawIcon size={18} strokeWidth={2.2} />;
  }
  if (vehicleType === "share_auto") {
    return <ShareAutoIcon size={18} strokeWidth={2.2} />;
  }
  if (vehicleType === "scooter") {
    return <ScooterIcon size={18} strokeWidth={2.2} />;
  }
  if (vehicleType === "bike") {
    return <MotorcycleIcon size={18} strokeWidth={2.2} />;
  }
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
  return <CarIcon size={18} strokeWidth={2.2} />;
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
  const [recentMessages, setRecentMessages] = useState<Record<string, RecentMsgData>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("loop_recent_messages_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  const joinedLoops = activeLoops.filter((l) => userJoinedLoops.includes(l.id));
  const joinedLoopIdsKey = userJoinedLoops.join(",");

  // Toggle search from custom event in header
  useEffect(() => {
    const toggle = () => setIsSearchOpen((prev) => !prev);
    window.addEventListener("toggle-chat-search", toggle);
    return () => window.removeEventListener("toggle-chat-search", toggle);
  }, []);

  const lastFetchRecentTimeRef = React.useRef<number>(0);
  const isFetchingRecentRef = React.useRef<boolean>(false);

  // Fetch the latest real message for joined loops with sender profile (SWR 15s cache)
  const fetchRecentMessages = useCallback(async (force = false) => {
    if (userJoinedLoops.length === 0) return;
    const now = Date.now();
    if (!force && now - lastFetchRecentTimeRef.current < 15000 && Object.keys(recentMessages).length > 0) {
      return;
    }
    if (isFetchingRecentRef.current) return;
    isFetchingRecentRef.current = true;
    lastFetchRecentTimeRef.current = now;

    const loopIds = userJoinedLoops;

    try {
      const fetchLimit = Math.min(Math.max(loopIds.length * 5, 20), 50);
      const { data, error } = await supabase
        .from("messages")
        .select("loop_id, content, created_at, user_id, profiles:user_id(display_name)")
        .in("loop_id", loopIds)
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

      let list = data;
      if (error || !data) {
        const fallback = await supabase
          .from("messages")
          .select("loop_id, content, created_at, user_id")
          .in("loop_id", loopIds)
          .order("created_at", { ascending: false })
          .limit(fetchLimit);
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
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("loop_recent_messages_cache", JSON.stringify(msgMap));
          } catch {}
        }
      }
    } catch {} finally {
      isFetchingRecentRef.current = false;
    }
  }, [joinedLoopIdsKey, recentMessages]);

  useEffect(() => {
    fetchRecentMessages();

    let channel: any = null;

    const subscribeChannel = () => {
      if (channel) return;
      channel = supabase
        .channel("chat-list-recent-messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const msg = payload.new as any;
            if (!msg?.loop_id || !msg.content) return;

            const isMe = msg.user_id === session?.user?.id;
            let senderName = isMe ? (profile?.display_name || "You") : "";

            setRecentMessages((prev) => {
              const next = {
                ...prev,
                [msg.loop_id]: {
                  content: msg.content,
                  created_at: msg.created_at,
                  user_id: msg.user_id,
                  sender_name: senderName,
                },
              };
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("loop_recent_messages_cache", JSON.stringify(next));
                } catch {}
              }
              return next;
            });

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
                    const next = { ...prev, [msg.loop_id]: { ...cur, sender_name: data.display_name } };
                    if (typeof window !== "undefined") {
                      try {
                        localStorage.setItem("loop_recent_messages_cache", JSON.stringify(next));
                      } catch {}
                    }
                    return next;
                  }
                  return prev;
                });
              }
            }
          }
        )
        .subscribe();
    };

    const unsubscribeChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    if (typeof document === "undefined" || document.visibilityState === "visible") {
      subscribeChannel();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        unsubscribeChannel();
      } else if (document.visibilityState === "visible") {
        subscribeChannel();
        fetchRecentMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeChannel();
    };
  }, [fetchRecentMessages, session?.user?.id, profile?.display_name]);

  const filteredLoops = joinedLoops.filter((loop) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const recent = recentMessages[loop.id];
    const previewText = recent ? formatRecentMessagePreview(recent, session?.user?.id).toLowerCase() : "";
    return loop.destination.toLowerCase().includes(q) || previewText.includes(q);
  });

  if (joinedLoops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[58vh] text-center px-6 animate-fade-in">
        <div className={`w-16 h-16 rounded-3xl ${cardBg} border ${border} flex items-center justify-center mb-4 shadow-sm`}>
          <MessageSquare size={28} className={mutedText} strokeWidth={1.8} />
        </div>
        <p className="text-sm font-black uppercase tracking-wider">No Active Chats</p>
        <p className={`text-xs ${mutedText} mt-1.5 max-w-[260px] leading-relaxed`}>
          Join or create a loop ride to coordinate with your group in real time.
        </p>
        <button
          onClick={() => setView("home")}
          className={`mt-6 px-6 py-2.5 rounded-full ${
            isDark
              ? "bg-[#FFC554] text-black shadow-lg shadow-[#FFC554]/15"
              : "bg-[#881337] text-white shadow-lg shadow-[#881337]/20"
          } font-black text-xs uppercase tracking-wider active:scale-95 hover:brightness-105 transition-all cursor-pointer`}
        >
          Explore Campus Rides
        </button>
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
            className={`w-full h-9 pl-9 pr-9 rounded-[16px] ${cardBg} border ${border} text-xs font-bold outline-none ${
              isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
            } transition-colors`}
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

      {/* Empty Search State */}
      {filteredLoops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
          <div className={`w-12 h-12 rounded-full ${cardBg} border ${border} flex items-center justify-center mb-3`}>
            <Search size={20} className={mutedText} />
          </div>
          <p className="text-sm font-bold">No chats found</p>
          <p className={`text-xs ${mutedText} mt-1 max-w-[220px]`}>
            No conversations match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className={`mt-4 px-4 py-1.5 rounded-full ${cardBg} border ${border} text-xs font-bold active:scale-95 transition-transform cursor-pointer`}
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Compact Chat Cards */
        filteredLoops.map((loop, idx) => {
        const isUnread = unreadLoopIds?.includes(loop.id);
        const latestMsg = recentMessages[loop.id];

        return (
          <div
            key={loop.id}
            style={{ "--stagger-delay": `${Math.min(idx, 8) * 45}ms` } as React.CSSProperties}
            onClick={() => {
              if (isUnread) markLoopAsRead(loop.id);
              setSelectedLoop(loop);
              setChatSource("chat-list");
              setView("chat");
            }}
            className={`p-3 px-3.5 rounded-[20px] border transition-all cursor-pointer active:scale-[0.985] animate-card-enter ${
              isDark
                ? "bg-[#121214] border-white/10 hover:border-white/20"
                : "bg-white border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            } ${isUnread ? (isDark ? "ring-1 ring-[#FFC554]/60" : "ring-1 ring-[#881337]/60") : ""}`}
          >
            {/* Top Row: Icon + Destination + Time + Chevron */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Destination Icon Badge (Compact w-9 h-9) */}
                <div
                  className={`w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 transition-colors ${
                    isDark
                      ? "bg-[#281c08] text-[#FFC554] border border-[#FFC554]/20"
                      : "bg-[#881337]/10 text-[#881337] border border-[#881337]/20"
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
                      <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-[#FFC554]" : "bg-[#881337]"} animate-pulse shrink-0`} />
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
      })
    )}
  </div>
  );
}
