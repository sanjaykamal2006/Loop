"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Send, Edit2, Check, X, Share2, MapPin, Navigation, Map, ChevronRight, Search } from "lucide-react";
import type { Message } from "@/lib/types";
import UserProfileModal, { UserProfileData } from "./UserProfileModal";
import { sendLocalNotification } from "@/lib/notifications";
import { formatDepartureFull } from "@/lib/dateFormatter";

const messageCache: Record<string, Message[]> = {};

const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Autoplay restrictions or unavailable audio context
  }
};

export default function ChatView() {
  const { session, selectedLoop, setSelectedLoop, profile, formatTime, theme, setView, markLoopAsRead } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  const [messages, setMessages] = useState<Message[]>(() => {
    if (selectedLoop?.id && messageCache[selectedLoop.id]) {
      return messageCache[selectedLoop.id];
    }
    return [];
  });
  const [newMessage, setNewMessage] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Listen for toggle-message-search from header
  useEffect(() => {
    const handleToggleSearch = () => {
      if (messages.length === 0) {
        toast.info("No messages in this chat yet to search.");
        return;
      }
      setIsSearchOpen((prev) => !prev);
    };
    window.addEventListener("toggle-message-search", handleToggleSearch);
    return () => window.removeEventListener("toggle-message-search", handleToggleSearch);
  }, [messages.length]);

  const matchingMsgIds = React.useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    for (const m of messages) {
      const isMe = m.user_id === session.user.id;
      const senderName = isMe ? profile.display_name || "You" : m.profiles?.display_name || "";
      if (m.content.toLowerCase().includes(q) || senderName.toLowerCase().includes(q)) {
        matches.add(m.id);
      }
    }
    return matches;
  }, [messages, searchQuery, session.user.id, profile.display_name]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const currentLoopIdRef = useRef<string | null>(null);

  // Fetch messages on mount or loop change (instant 0ms cache check)
  useEffect(() => {
    if (!selectedLoop?.id) return;
    if (currentLoopIdRef.current !== selectedLoop.id) {
      currentLoopIdRef.current = selectedLoop.id;
      if (messageCache[selectedLoop.id]) {
        setMessages(messageCache[selectedLoop.id]);
      } else {
        setMessages([]);
      }
    }
    fetchMessages(selectedLoop.id);
    fetchMembers(selectedLoop.id);
  }, [selectedLoop?.id]);

  // Lightweight 30s background sync safety net (only when tab is visible)
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessages(selectedLoop.id);
      }
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [selectedLoop?.id]);

  const loopMembersRef = useRef<any[]>([]);

  useEffect(() => {
    loopMembersRef.current = members;
  }, [members]);

  const scrollToBottom = (force = false) => {
    if (chatScrollRef.current) {
      const { scrollHeight, clientHeight } = chatScrollRef.current;
      if (force || scrollHeight > clientHeight + 20) {
        chatScrollRef.current.scrollTop = scrollHeight - clientHeight;
      }
    }
  };

  // Real-time chat & presence subscription - ONLY when tab is active (Free tier optimization)
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;

    const subscribeChannel = () => {
      if (channelRef.current) return;
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
            const updated = [...prev, msg];
            messageCache[loopId] = updated;
            return updated;
          });
          requestAnimationFrame(() => scrollToBottom(true));
          if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            playNotificationChime();
            sendLocalNotification("LOOP Chat", {
              body: msg.content || "New message received",
              data: { url: `/?loop=${loopId}` },
              tag: `chat-msg-${loopId}`,
            });
          }
        })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `loop_id=eq.${loopId}` },
          (payload) => {
            const newMsg = payload.new as any;
            if (!newMsg?.id) return;
            if (newMsg.user_id !== session.user.id && typeof document !== "undefined" && document.visibilityState === "hidden") {
              playNotificationChime();
              sendLocalNotification("LOOP Chat", {
                body: newMsg.content || "New message received",
                data: { url: `/?loop=${loopId}` },
                tag: `chat-msg-${loopId}`,
              });
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // Instant resolution from loop members without database roundtrip
              const sender = loopMembersRef.current.find((mem) => mem.user_id === newMsg.user_id);
              const enriched: Message = {
                ...newMsg,
                profiles: sender?.profiles || { display_name: "Member" },
              };
              const updated = [...prev, enriched];
              messageCache[loopId] = updated;
              requestAnimationFrame(() => scrollToBottom(true));
              return updated;
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `loop_id=eq.${loopId}` },
          (payload) => {
            const updated = payload.new as any;
            if (!updated?.id) return;
            setMessages((prev) => {
              const next = prev.map((m) =>
                m.id === updated.id
                  ? { ...m, ...updated, profiles: m.profiles }
                  : m
              );
              messageCache[loopId] = next;
              return next;
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "messages", filter: `loop_id=eq.${loopId}` },
          (payload) => {
            const deletedId = payload.old?.id;
            if (!deletedId) return;
            setMessages((prev) => {
              const next = prev.filter((m) => m.id !== deletedId);
              messageCache[loopId] = next;
              return next;
            });
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: session.user.id, name: profile.display_name, typing: false });
          }
        });
    };

    const unsubscribeChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    // Only subscribe immediately if tab is currently visible
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      subscribeChannel();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Free WebSocket connection when tab is backgrounded
        unsubscribeChannel();
      } else if (document.visibilityState === "visible") {
        // Re-subscribe and fetch fresh messages when returning to foreground
        subscribeChannel();
        fetchMessages(loopId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeChannel();
    };
  }, [selectedLoop?.id, session.user.id, profile.display_name]);

  const PAGE_SIZE = 25;

  const fetchMessages = async (loopId: string) => {
    // Fetch most recent messages with limit (Free tier optimization)
    const { data, error } = await supabase
      .from("messages")
      .select("id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)")
      .eq("loop_id", loopId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("fetchMessages error:", error);
      // Fallback query if profiles join fails
      const { data: fallbackData } = await supabase
        .from("messages")
        .select("id, loop_id, user_id, content, created_at, edited_at, reactions")
        .eq("loop_id", loopId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (fallbackData) {
        const enriched = fallbackData.reverse().map((m: any) => {
          const sender = loopMembersRef.current.find((mem) => mem.user_id === m.user_id);
          return { ...m, profiles: sender?.profiles || { display_name: "Member" } } as Message;
        });
        messageCache[loopId] = enriched;
        setMessages(enriched);
        setHasMoreMessages(fallbackData.length === PAGE_SIZE);
        requestAnimationFrame(() => scrollToBottom(false));
      }
    } else if (data) {
      // Reverse to get chronological order
      const msgs = (data as unknown as Message[]).reverse();
      messageCache[loopId] = msgs;
      setMessages(msgs);
      setHasMoreMessages(data.length === PAGE_SIZE);
      requestAnimationFrame(() => scrollToBottom(false));
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedLoop?.id || messages.length === 0 || isLoadingMore) return;
    setIsLoadingMore(true);

    const oldestMessage = messages[0];
    const { data, error } = await supabase
      .from("messages")
      .select("id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)")
      .eq("loop_id", selectedLoop.id)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data && data.length > 0) {
      const olderMessages = (data as unknown as Message[]).reverse();
      setMessages((prev) => {
        const combined = [...olderMessages, ...prev];
        messageCache[selectedLoop.id] = combined;
        return combined;
      });
      setHasMoreMessages(data.length === PAGE_SIZE);
    } else {
      setHasMoreMessages(false);
    }
    setIsLoadingMore(false);
  };

  const fetchMembers = async (loopId: string) => {
    try {
      // 1. Fetch member user_ids for the current loop
      const { data: memberRows, error: memErr } = await supabase
        .from("loop_members")
        .select("user_id")
        .eq("loop_id", loopId);

      if (memErr || !memberRows || memberRows.length === 0) {
        return;
      }

      const userIds = Array.from(new Set(memberRows.map((r: any) => r.user_id)));

      // Access Guard: Ensure caller is member or creator
      const isCreator = selectedLoop?.creator_id === session?.user?.id;
      const isMember = userIds.includes(session?.user?.id);
      if (!isCreator && !isMember) {
        toast.info("You must join this loop to view its chat");
        setView("home");
        setSelectedLoop(null);
        return;
      }

      // 2. Query profiles directly by IDs to ensure 100% reliability regardless of PostgREST relation syntax
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, reg_no, gender, bio, phone_number, is_student_verified")
        .in("id", userIds);

      const profMap: Record<string, any> = {};
      if (profs) {
        profs.forEach((p: any) => {
          profMap[p.id] = p;
        });
      }

      const formatted = memberRows.map((r: any) => {
        const isMe = r.user_id === session.user.id;
        const fetchedProf = profMap[r.user_id] || {};
        return {
          user_id: r.user_id,
          profiles: {
            display_name: isMe ? (profile.display_name || fetchedProf.display_name || "You") : (fetchedProf.display_name || "Member"),
            avatar_url: isMe ? (profile.avatar_url || fetchedProf.avatar_url) : fetchedProf.avatar_url,
            reg_no: isMe ? (profile.reg_no || fetchedProf.reg_no) : fetchedProf.reg_no,
            gender: isMe ? (profile.gender || fetchedProf.gender) : fetchedProf.gender,
            bio: isMe ? (profile.bio || fetchedProf.bio) : fetchedProf.bio,
            phone_number: isMe ? (profile.phone_number || fetchedProf.phone_number) : fetchedProf.phone_number,
            is_student_verified: isMe ? profile.is_student_verified : fetchedProf.is_student_verified,
          },
        };
      });

      setMembers(formatted);
    } catch (e) {
      console.error("fetchMembers error:", e);
    }
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
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === optimisticId ? realMsg : m));
        messageCache[selectedLoop.id] = next;
        return next;
      });

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
    try {
      const { data, error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .select('id');

      if (error) {
        console.error('Delete message error:', error);
        toast.error('Failed to delete message');
      } else if (!data || data.length === 0) {
        console.warn('No message was deleted in database');
        toast.error('Failed to delete message');
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Message deleted');
      }
    } catch (err) {
      console.error('deleteMessage exception:', err);
      toast.error('Failed to delete message');
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
    const totalOfferedSeats = selectedLoop?.is_driver_offering
      ? Math.max(1, (selectedLoop.participants_limit || 2) - 1)
      : (selectedLoop?.participants_limit || 4);
    const emptySeats = Math.max(0, (selectedLoop?.participants_limit || 4) - members.length);
    const timeStr = formatDepartureFull(selectedLoop?.departure_time);
    const fromStr = selectedLoop?.start_point || "VIT-AP Campus";
    const femaleTag = selectedLoop?.is_female_only ? "\nPreference: Female passengers only" : "";
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/?loop=${selectedLoop?.id}`
      : `https://loop-app-2.vercel.app/?loop=${selectedLoop?.id}`;

    const rawShareMessage = `LOOP — Ride to ${selectedLoop?.destination}\nFrom: ${fromStr}\nSchedule: ${timeStr}\nSeats Available: ${emptySeats} of ${totalOfferedSeats}${femaleTag}\n\nJoin this ride:\n${shareUrl}`;

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
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(rawShareMessage)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
      
      {/* Roster & Controls Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${border} ${cardBg} z-20 shadow-sm shrink-0`}>
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide flex-1 py-0.5">
          {members.map((m) => {
            const isMe = m.user_id === session.user.id;
            const memberAvatar = isMe ? (profile.avatar_url || m.profiles?.avatar_url) : m.profiles?.avatar_url;
            const memberName = isMe ? (profile.display_name || m.profiles?.display_name || "You") : (m.profiles?.display_name || "Member");
            const hasAvatar = Boolean(memberAvatar && !avatarErrors[m.user_id]);

            return (
              <div
                key={m.user_id}
                onClick={() => setSelectedUser({
                  user_id: m.user_id,
                  display_name: memberName,
                  avatar_url: memberAvatar,
                  reg_no: isMe ? profile.reg_no : m.profiles?.reg_no,
                  gender: isMe ? profile.gender : m.profiles?.gender,
                  bio: isMe ? profile.bio : m.profiles?.bio,
                  phone_number: isMe ? profile.phone_number : m.profiles?.phone_number,
                  is_student_verified: isMe ? profile.is_student_verified : m.profiles?.is_student_verified,
                })}
                className="relative w-10 h-10 rounded-full border-2 border-white/20 shrink-0 bg-[#FFC554]/20 flex items-center justify-center cursor-pointer active:scale-90 transition-transform overflow-hidden shadow-md group"
                title={memberName}
              >
                {hasAvatar ? (
                  <img
                    src={memberAvatar}
                    alt={memberName}
                    onError={() => setAvatarErrors((prev) => ({ ...prev, [m.user_id]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-black text-[#FFC554] tracking-tight">
                    {(memberName || "M").substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            );
          })}
          {/* Info Button to go back to Ride Details */}
          <button
            onClick={() => setView("ride-details")}
            aria-label="View ride details"
            className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all shrink-0 ml-1 shadow-sm ${isDark ? "bg-white/10 hover:bg-white/15 border border-white/10 text-white" : "bg-black/5 hover:bg-black/10 border border-black/10 text-black"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
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

      {/* In-Chat Message Search Bar */}
      {isSearchOpen && (
        <div className={`px-4 py-2 border-b ${border} ${cardBg} flex items-center gap-2 animate-fade-in shrink-0`}>
          <div className="relative flex-1">
            <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages in chat..."
              autoFocus
              className={`w-full h-8 pl-9 pr-8 rounded-full ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-medium outline-none focus:border-[#FFC554] transition-colors`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]"
              >
                <X size={10} />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className={`text-[10px] font-bold shrink-0 ${matchingMsgIds.size > 0 ? (isDark ? "text-[#FFC554]" : "text-[#B45309]") : mutedText}`}>
              {matchingMsgIds.size} {matchingMsgIds.size === 1 ? "match" : "matches"}
            </span>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
            className={`text-xs font-bold ${mutedText} hover:opacity-100 px-1`}
          >
            Done
          </button>
        </div>
      )}

      {/* Messages scroll area */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide space-y-1 pb-4">
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="text-[11px] font-bold text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/20 px-3 py-1 rounded-full hover:bg-[#FFC554]/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoadingMore ? "Loading older messages..." : "↑ Load older messages"}
            </button>
          </div>
        )}

        {/* Empty Search State */}
        {Boolean(searchQuery.trim()) && matchingMsgIds.size === 0 && (
          <div className="py-12 text-center">
            <Search size={22} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
            <p className="text-xs font-bold">No messages found</p>
            <p className={`text-[11px] ${mutedText} mt-1`}>No message matches &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}

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
            const mapsUrl = getMapsUrlFromMessage(msg.content);
            const isLocationMsg = Boolean(mapsUrl);
            const showSender = (idx === 0 || messages[idx - 1]?.user_id !== msg.user_id) && !isLocationMsg;
            const isEditing = editingMsgId === msg.id;
            const isOptimistic = msg.id.startsWith("opt-");
            const senderName = isMe ? profile.display_name || "You" : msg.profiles?.display_name || "Member";
            const senderAvatar = isMe ? profile.avatar_url : msg.profiles?.avatar_url;
            const senderInitial = (senderName || "U").substring(0, 1).toUpperCase();
            const isSearchActive = Boolean(searchQuery.trim());
            const isMatch = matchingMsgIds.has(msg.id);

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
                    {senderAvatar ? (
                      <img src={senderAvatar} alt={senderName} className="w-4 h-4 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[#FFC554]/20 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-[#FFC554]">
                          {(senderName || "U").substring(0, 1).toUpperCase()}
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
                    className={`relative ${isLocationMsg ? "max-w-[94%]" : "max-w-[80%]"} group ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 'mb-2.5' : ''} ${
                      isSearchActive
                        ? isMatch
                          ? "ring-2 ring-[#FFC554] rounded-[20px] shadow-[0_0_12px_rgba(255,197,84,0.35)] scale-[1.01] transition-all"
                          : "opacity-35 transition-opacity"
                        : ""
                    }`}
                    onDoubleClick={() => isMe && !isOptimistic && !isLocationMsg && startEditMessage(msg)}
                    onContextMenu={(e) => { e.preventDefault(); !isOptimistic && setReactionMsgId(msg.id); }}
                  >
                    {!mapsUrl ? (
                      <div
                        className={`px-4 py-2.5 text-[13px] font-medium shadow-sm break-words whitespace-pre-wrap ${
                          isMe
                            ? `bg-[#FFC554] text-black rounded-[18px] rounded-tr-[4px] ${isOptimistic ? "opacity-60" : ""}`
                            : `${cardBg} border ${border} ${text} rounded-[18px] rounded-tl-[4px]`
                        }`}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block w-[240px] max-w-[80vw] p-3 rounded-[20px] border shadow-sm transition-all active:scale-[0.98] ${
                          isDark
                            ? "bg-[#18181B] border-white/10 text-white shadow-black/40"
                            : "bg-white border-zinc-200/80 text-zinc-900 shadow-zinc-200/60"
                        }`}
                      >
                        {/* Main Content: Accent Circle + Title + Subtitle */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-[#FFC554] flex items-center justify-center shrink-0 shadow-sm">
                            <Navigation size={18} className="fill-zinc-950 text-zinc-950" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-[13px] tracking-tight text-zinc-900 dark:text-white leading-tight">
                                Current Location
                              </h4>
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span>Shared</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 truncate">
                              Shared by {senderName}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="border-t border-zinc-100 dark:border-white/10 pt-2 mt-2.5 flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Map size={13} strokeWidth={2.2} className="text-zinc-400 dark:text-zinc-400" />
                            <span className="text-[10px] font-bold tracking-widest uppercase">
                              OPEN IN MAPS
                            </span>
                          </div>
                          <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" />
                        </div>
                      </a>
                    )}
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
