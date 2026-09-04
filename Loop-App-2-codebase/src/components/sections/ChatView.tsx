"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Send, Edit2, Check, X, Share2, MapPin, Navigation, ArrowUpRight } from "lucide-react";
import type { Message } from "@/lib/types";
import UserProfileModal, { UserProfileData } from "./UserProfileModal";

export default function ChatView() {
  const { session, selectedLoop, setSelectedLoop, profile, formatTime, theme, setView } = useLoop();
  const { border, cardBg, mutedText, text } = theme;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const currentLoopIdRef = useRef<string | null>(null);

  // Fetch messages on mount or loop change (ONLY reset messages if loop ID changes)
  useEffect(() => {
    if (!selectedLoop?.id) return;
    if (currentLoopIdRef.current !== selectedLoop.id) {
      currentLoopIdRef.current = selectedLoop.id;
      setMessages([]);
    }
    fetchMessages(selectedLoop.id);
    fetchMembers(selectedLoop.id);
  }, [selectedLoop?.id]);

  // Ultra-fast background polling safety net (every 1 second) to ensure 100% instant delivery on mobile networks
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const pollInterval = setInterval(() => {
      fetchMessages(selectedLoop.id);
    }, 1000);
    return () => clearInterval(pollInterval);
  }, [selectedLoop?.id]);

  const loopMembersRef = useRef<any[]>([]);

  useEffect(() => {
    loopMembersRef.current = members;
  }, [members]);

  const scrollToBottom = (force = false) => {
    if (chatScrollRef.current) {
      const { scrollHeight, clientHeight } = chatScrollRef.current;
      // Only scroll if content is taller than the container (overflowing) or if explicitly forced when sending
      if (force || scrollHeight > clientHeight + 20) {
        chatScrollRef.current.scrollTop = scrollHeight - clientHeight;
      }
    }
  };

  // Real-time chat & presence subscription
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;

    const channel = supabase.channel(`chat-${loopId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: Record<string, string> = {};
        for (const id in state) {
          state[id].forEach((presence: any) => {
            if (presence.typing && presence.user_id !== session.user.id) {
              typing[presence.user_id] = presence.name;
            }
          });
        }
        setTypingUsers(typing);
      })
      .on("broadcast", { event: "new_message" }, (payload) => {
        if (!payload.payload) return;
        const msg = payload.payload as Message;
        if (msg.loop_id !== loopId) return;
        if (msg.user_id === session.user.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        requestAnimationFrame(() => scrollToBottom(true));
        try {
          const audio = new Audio("https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3");
          audio.volume = 0.5;
          audio.play();
        } catch (e) {}
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchMessages(loopId);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          if (payload.new.loop_id !== loopId) return;
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)));
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: session.user.id, name: profile.display_name, typing: false });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLoop?.id, session.user.id, profile.display_name]);

  const fetchMessages = async (loopId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)")
      .eq("loop_id", loopId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchMessages error:", error);
      // Fallback query if profiles join fails
      const { data: fallbackData } = await supabase
        .from("messages")
        .select("id, loop_id, user_id, content, created_at, edited_at, reactions")
        .eq("loop_id", loopId)
        .order("created_at", { ascending: true });
      if (fallbackData) {
        setMessages(fallbackData.map((m: any) => {
          const sender = loopMembersRef.current.find((mem) => mem.user_id === m.user_id);
          return { ...m, profiles: sender?.profiles || { display_name: "Member" } } as Message;
        }));
        requestAnimationFrame(() => scrollToBottom(false));
      }
    } else if (data) {
      setMessages(data as unknown as Message[]);
      requestAnimationFrame(() => scrollToBottom(false));
    }
  };

  const fetchMembers = async (loopId: string) => {
    const { data } = await supabase
      .from("loop_members")
      .select("user_id, profiles (display_name, avatar_url, reg_no, gender, bio)")
      .eq("loop_id", loopId);
    if (data) setMembers(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedLoop) return;
    const content = newMessage.trim();
    setNewMessage("");

    // Optimistic: add immediately
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      loop_id: selectedLoop.id,
      user_id: session.user.id,
      content,
      created_at: new Date().toISOString(),
      profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    requestAnimationFrame(() => scrollToBottom(true));

    // Clear typing
    if (channelRef.current) {
      channelRef.current.track({ user_id: session.user.id, name: profile.display_name, typing: false });
    }

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ loop_id: selectedLoop.id, user_id: session.user.id, content })
      .select("id, loop_id, user_id, content, created_at, reactions")
      .single();

    if (error || !inserted) {
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMessage(content);
    } else {
      const realMsg: Message = {
        ...inserted,
        profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url },
      };
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? realMsg : m)));

      // Broadcast over WebSocket for instant delivery to all connected receivers
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "new_message",
          payload: realMsg,
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (channelRef.current) {
      channelRef.current.track({ user_id: session.user.id, name: profile.display_name, typing: true });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        channelRef.current?.track({ user_id: session.user.id, name: profile.display_name, typing: false });
      }, 2000);
    }
  };

  const toggleReaction = async (msg: Message, emoji: string) => {
    setReactionMsgId(null);
    const existing = msg.reactions || {};
    
    const newReactions: Record<string, string[]> = {};
    let hasReactedToCurrent = false;

    // First, copy existing reactions but REMOVE the user from ALL emojis
    for (const [key, users] of Object.entries(existing)) {
      if (key === emoji && users.includes(session.user.id)) {
        hasReactedToCurrent = true;
      }
      const filtered = users.filter((id: string) => id !== session.user.id);
      if (filtered.length > 0) {
        newReactions[key] = filtered;
      }
    }

    // If they didn't already react to the CURRENT emoji, add them to it
    if (!hasReactedToCurrent) {
      newReactions[emoji] = [...(newReactions[emoji] || []), session.user.id];
    }
    
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m));
    await supabase.from("messages").update({ reactions: newReactions }).eq("id", msg.id);
  };

  const startEditMessage = (msg: Message) => {
    const ageMs = Date.now() - new Date(msg.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) {
      toast.error("You can only edit messages within 5 minutes of sending");
      return;
    }
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
  };

  const saveEditMessage = async () => {
    if (!editingMsgId || !editingContent.trim()) return;
    const { error } = await supabase
      .from("messages")
      .update({ content: editingContent.trim(), edited_at: new Date().toISOString() })
      .eq("id", editingMsgId);

    if (error) {
      toast.error("Failed to edit message");
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMsgId
            ? { ...m, content: editingContent.trim(), edited_at: new Date().toISOString() }
            : m
        )
      );
      setEditingMsgId(null);
      setEditingContent("");
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId).eq('user_id', session.user.id);
    if (error) {
      toast.error('Failed to delete message');
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    }
  };

  if (!selectedLoop) return null;

  const isHost = selectedLoop?.creator_id === session.user.id;
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  const getMapsUrlFromMessage = (content: string): string | null => {
    if (!content) return null;
    const coordsMatch = content.match(/[?&]q=([-0-9.]+),([-0-9.]+)/) || content.match(/[?&]query=([-0-9.]+),([-0-9.]+)/);
    if (coordsMatch) {
      return `https://maps.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}`;
    }
    if (content.includes("google.com/maps") || content.includes("maps.google.com")) {
      const match = content.match(/https?:\/\/[^\s]+/);
      if (match) return match[0];
    }
    return null;
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        const content = `📍 My Spot: ${mapsUrl}`;

        // Optimistic message in UI
        const optimisticId = `loc-${Date.now()}`;
        const optimisticMsg: Message = {
          id: optimisticId,
          loop_id: selectedLoop.id,
          user_id: session.user.id,
          content,
          created_at: new Date().toISOString(),
          profiles: {
            display_name: profile.display_name || "Me",
            avatar_url: profile.avatar_url,
            gender: profile.gender || "",
            reg_no: profile.reg_no,
          },
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }

        const { error } = await supabase.from("messages").insert({
          loop_id: selectedLoop.id,
          user_id: session.user.id,
          content,
        });

        setIsSharingLocation(false);
        if (error) {
          toast.error("Failed to share location");
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        } else {
          toast.success("Spot shared in chat!");
        }
      },
      (err) => {
        setIsSharingLocation(false);
        if (err.code === 1) {
          toast.error("Location permission denied. Please allow in browser settings.");
        } else {
          toast.error("Could not fetch location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleShare = async () => {
    const emptySeats = Math.max(0, (selectedLoop?.participants_limit || 4) - members.length);
    const timeStr = formatTime(selectedLoop?.departure_time);
    const fromStr = selectedLoop?.start_point ? `from ${selectedLoop.start_point}` : "from Campus Main Gate";
    const femaleTag = selectedLoop?.is_female_only ? " (Girls Only 🌸)" : "";

    const rawShareMessage = `🚖 *LOOP: Ride to ${selectedLoop?.destination}*${femaleTag}\n⏰ Leaving at: ${timeStr} (${fromStr})\n👥 Seats free: ${emptySeats} of ${selectedLoop?.participants_limit}\n\n👉 Join this ride on LOOP: https://loop-demo-app.vercel.app`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `LOOP: Ride to ${selectedLoop?.destination}`,
          text: rawShareMessage,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(rawShareMessage)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
      
      {/* Roster & Controls Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${border} ${cardBg} z-20 shadow-sm shrink-0`}>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
          {members.map((m) => (
            <div
              key={m.user_id}
              onClick={() => setSelectedUser({
                user_id: m.user_id,
                display_name: m.profiles?.display_name || "Member",
                avatar_url: m.profiles?.avatar_url,
                reg_no: m.profiles?.reg_no,
                gender: m.profiles?.gender,
                bio: m.profiles?.bio,
              })}
              className="relative w-8 h-8 rounded-full border border-white/20 shrink-0 bg-[#FFC554]/20 flex items-center justify-center cursor-pointer active:scale-90 transition-transform overflow-hidden"
              title={m.profiles?.display_name}
            >
              {m.profiles?.avatar_url ? (
                <img src={m.profiles.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-[#FFC554]">
                  {(m.profiles?.display_name || "M").substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {/* Info Button to go back to Ride Details */}
          <button onClick={() => setView("ride-details")} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full active:scale-90 ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <button
            onClick={handleShareLocation}
            disabled={isSharingLocation}
            aria-label="Share current location pin"
            className="h-8 px-2.5 rounded-full bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 shadow-sm hover:bg-[#FFC554]/25 transition-all shrink-0"
          >
            <MapPin size={12} strokeWidth={2.5} className={isSharingLocation ? "animate-pulse" : ""} />
            <span>{isSharingLocation ? "..." : "Spot"}</span>
          </button>

          <button
            onClick={handleShare}
            aria-label="Share ride invite"
            className="h-8 px-2.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 shadow-sm hover:bg-emerald-500/25 transition-all shrink-0"
          >
            <Share2 size={12} strokeWidth={2.5} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Messages scroll area */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide space-y-1 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-14 h-14 rounded-full ${cardBg} border ${border} flex items-center justify-center mb-3`}>
              <Send size={22} className="opacity-20 -rotate-12" />
            </div>
            <p className={`text-xs font-black ${mutedText} uppercase tracking-widest`}>No messages yet</p>
            <p className={`text-[10px] ${mutedText} opacity-50 mt-1`}>Be the first to say hi!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.user_id === session.user.id;
            const showSender = idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;
            const isEditing = editingMsgId === msg.id;
            const isOptimistic = msg.id.startsWith("opt-");

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${showSender ? "mt-4" : "mt-0.5"}`}
              >
                {showSender && (
                  <div
                    onClick={() => setSelectedUser({
                      user_id: msg.user_id,
                      display_name: isMe ? profile.display_name : msg.profiles?.display_name || "Member",
                      avatar_url: isMe ? profile.avatar_url : msg.profiles?.avatar_url,
                      reg_no: isMe ? profile.reg_no : msg.profiles?.reg_no,
                      gender: isMe ? profile.gender : msg.profiles?.gender,
                      bio: isMe ? profile.bio : msg.profiles?.bio,
                    })}
                    className={`flex items-center gap-1.5 mb-1 px-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    {msg.profiles?.avatar_url ? (
                      <img src={msg.profiles.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[#FFC554]/20 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-[#FFC554]">
                          {(msg.profiles?.display_name || (isMe ? "You" : "M")).substring(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className={`text-[10px] font-semibold ${isMe ? "text-[#FFC554]" : mutedText}`}>
                      {isMe ? "You" : msg.profiles?.display_name || "Member"}
                    </p>
                  </div>
                )}

                {isEditing ? (
                  <div className={`w-full max-w-[85%] ${cardBg} border ${border} rounded-[18px] p-2 flex gap-2 items-center`}>
                    <input
                      autoFocus
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditMessage();
                        if (e.key === "Escape") setEditingMsgId(null);
                      }}
                      className="flex-1 bg-transparent text-[13px] font-medium outline-none"
                    />
                    <button
                      onClick={saveEditMessage}
                      className="w-7 h-7 rounded-lg bg-[#FFC554] text-black flex items-center justify-center shrink-0 active:scale-90"
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => setEditingMsgId(null)}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 active:scale-90"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`relative max-w-[80%] group ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 'mb-2.5' : ''}`}
                    onDoubleClick={() => isMe && !isOptimistic && startEditMessage(msg)}
                    onContextMenu={(e) => { e.preventDefault(); !isOptimistic && setReactionMsgId(msg.id); }}
                  >
                    {(() => {
                      const mapsUrl = getMapsUrlFromMessage(msg.content);
                      if (!mapsUrl) {
                        return (
                          <div
                            className={`px-4 py-2.5 text-[13px] font-medium shadow-sm break-words whitespace-pre-wrap ${
                              isMe
                                ? `bg-[#FFC554] text-black rounded-[18px] rounded-tr-[4px] ${isOptimistic ? "opacity-60" : ""}`
                                : `${cardBg} border ${border} ${text} rounded-[18px] rounded-tl-[4px]`
                            }`}
                          >
                            {msg.content}
                          </div>
                        );
                      }

                      return (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block w-[230px] max-w-[80vw] rounded-[24px] overflow-hidden border shadow-lg cursor-pointer transition-all active:scale-[0.98] ${
                            isDark
                              ? "bg-[#1C1C1E] border-white/10 hover:border-white/20 text-white"
                              : "bg-[#FFFFFF] border-black/10 hover:border-black/20 text-black shadow-md"
                          } ${isMe ? "rounded-tr-[6px]" : "rounded-tl-[6px]"}`}
                        >
                          {/* Apple-style Mini Map Graphic Header */}
                          <div className="relative h-24 w-full bg-gradient-to-b from-[#2A2A2E] to-[#18181A] flex items-center justify-center overflow-hidden border-b border-white/5">
                            {/* Map Grid Texture */}
                            <div 
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
                                backgroundSize: "20px 20px"
                              }}
                            />
                            
                            {/* Radar Pulse & Navigation Beacon */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="relative flex items-center justify-center">
                                <div className="absolute w-12 h-12 rounded-full bg-[#FFC554]/25 animate-ping opacity-75" />
                                <div className="relative w-10 h-10 rounded-full bg-[#FFC554] text-black flex items-center justify-center shadow-lg shadow-[#FFC554]/30">
                                  <Navigation size={18} className="fill-black -rotate-45 ml-0.5 mb-0.5" />
                                </div>
                              </div>
                            </div>

                            {/* Live Pin Badge */}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[8px] font-bold text-white/90 uppercase tracking-widest">Live Spot</span>
                            </div>
                          </div>

                          {/* Card Info & Apple-style Action Row */}
                          <div className="p-3 space-y-2">
                            <div>
                              <h4 className="font-bold text-xs tracking-tight">Current Location</h4>
                              <p className={`text-[10px] ${mutedText} font-medium mt-0.5`}>
                                Shared by {isMe ? "You" : msg.profiles?.display_name || "Rider"}
                              </p>
                            </div>

                            <div className={`pt-2 border-t ${isDark ? "border-white/10" : "border-black/5"} flex items-center justify-between text-[#FFC554]`}>
                              <span className="text-[10px] font-bold tracking-wider uppercase">Open in Maps</span>
                              <ArrowUpRight size={14} strokeWidth={2.5} />
                            </div>
                          </div>
                        </a>
                      );
                    })()}
                    {/* Reactions Pill */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`absolute -bottom-2 ${isMe ? "right-2" : "left-2"} flex gap-0.5 bg-black/80 dark:bg-white/80 rounded-full px-1.5 py-0.5 border border-white/10 shadow-md`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <div key={emoji} onClick={() => toggleReaction(msg, emoji)} className="text-[10px] flex items-center gap-1 cursor-pointer hover:scale-110">
                            {emoji} <span className="text-white dark:text-black opacity-80">{users.length > 1 ? users.length : ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Reaction Menu */}
                    {reactionMsgId === msg.id && (
                      <div className={`absolute z-20 ${isMe ? "right-0" : "left-0"} -top-10 flex gap-2 ${cardBg} border ${border} p-2 rounded-[16px] shadow-xl`}>
                        {["👍", "❤️", "😂", "👎"].map(emoji => (
                          <button key={emoji} onClick={() => toggleReaction(msg, emoji)} className="text-lg hover:scale-125 active:scale-90 transition-transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Message Actions */}
                    {isMe && !isOptimistic && (
                      <div
                        className="absolute -left-[52px] top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-focus-within:opacity-100 active:opacity-100 md:group-hover:opacity-100"
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => startEditMessage(msg)}
                          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex items-center gap-1 mt-0.5 px-1`}>
                  <p className={`text-[9px] ${mutedText} opacity-40`}>{formatTime(msg.created_at)}</p>
                  {msg.edited_at && (
                    <p className={`text-[9px] ${mutedText} opacity-30 italic`}>edited</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        {/* Typing Indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex items-center gap-2 mt-4 px-1">
            <div className={`px-3 py-2 ${cardBg} border ${border} rounded-[16px] rounded-tl-[4px] flex items-center gap-1`}>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:300ms]" />
            </div>
            <span className={`text-[10px] ${mutedText} font-bold`}>
              {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length > 1 ? "are" : "is"} typing...
            </span>
          </div>
        )}
      </div>

      {/* Global click handler to close reaction menu */}
      {reactionMsgId && (
        <div className="absolute inset-0 z-10" onClick={() => setReactionMsgId(null)} />
      )}

      {/* Message input */}
      <div className="shrink-0 px-4 pb-5 pt-2 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          autoComplete="off"
          action="javascript:void(0);"
          className={`${cardBg} border ${border} rounded-[24px] p-1.5 flex gap-2 shadow-xl items-center`}
        >
          <input
            type="search"
            name="search"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-autocomplete="none"
            inputMode="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Message..."
            className="flex-1 bg-transparent px-4 text-sm font-medium outline-none border-none ring-0 [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-[#FFC554] text-black rounded-[16px] flex items-center justify-center active:scale-90 shrink-0 disabled:opacity-40"
          >
            <Send size={15} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      <UserProfileModal user={selectedUser} isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
