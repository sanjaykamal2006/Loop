"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "@/components/ui/NativeToast";
import { Send, Edit2, Trash2, Copy, MoreHorizontal, Check, X, Share2, MapPin, Navigation, Map as MapIcon, ChevronRight, Search } from "lucide-react";
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
  const { session, selectedLoop, setSelectedLoop, profile, formatTime, theme, setView, markLoopAsRead, userJoinedLoops, userLoops } = useLoop();
  const { isDark, border, cardBg, mutedText, text } = theme;

  // Guard against unauthorized chat access (IDOR & URL / state manipulation defense)
  useEffect(() => {
    if (!selectedLoop?.id) {
      setView("home");
      return;
    }

    let isCancelled = false;

    const verifyAccess = async () => {
      // 1. If user is creator, access is granted
      if (selectedLoop.creator_id === session.user.id || userLoops.includes(selectedLoop.id)) return;

      // 2. If user is already in local joined loops state, access is granted
      if (userJoinedLoops.includes(selectedLoop.id)) return;

      // 3. If not in local cache, verify membership with database
      const { data, error } = await supabase
        .from("loop_members")
        .select("id")
        .eq("loop_id", selectedLoop.id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (isCancelled) return;

      if (!data || error) {
        toast.error("Access denied: You must join this ride to access the group chat.");
        setView("home");
      }
    };

    verifyAccess();

    return () => {
      isCancelled = true;
    };
  }, [selectedLoop?.id, selectedLoop?.creator_id, session.user.id, userJoinedLoops, userLoops, setView]);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (selectedLoop?.id && messageCache[selectedLoop.id]) {
      return messageCache[selectedLoop.id];
    }
    return [];
  });
  const [newMessage, setNewMessage] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [actionMenuMsg, setActionMenuMsg] = useState<Message | null>(null);
  const [holdingMsgId, setHoldingMsgId] = useState<string | null>(null);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didTriggerHoldRef = useRef(false);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
        .subscribe();
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

      if (!selectedLoop) return;
      const isCreator = selectedLoop.creator_id === session?.user?.id;
      const isMember = userIds.includes(session?.user?.id);
      if (!isCreator && !isMember) {
        toast.info("You must join this loop to view its chat");
        setView("home");
        setSelectedLoop(null);
        return;
      }

      // 2. Query profiles directly by IDs and contact info via secure RPC
      const [{ data: profs }, { data: contacts }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, reg_no, gender, bio, is_student_verified")
          .in("id", userIds),
        supabase.rpc("get_loop_contacts", { target_loop_id: loopId }),
      ]);

      const profMap: Record<string, any> = {};
      if (profs) {
        profs.forEach((p: any) => {
          profMap[p.id] = p;
        });
      }

      const contactsMap = new Map<string, string>();
      if (contacts && Array.isArray(contacts)) {
        contacts.forEach((c: any) => {
          if (c.user_id && c.phone_number) {
            contactsMap.set(c.user_id, c.phone_number);
          }
        });
      }

      const formatted = memberRows.map((r: any) => {
        const isMe = r.user_id === session.user.id;
        const fetchedProf = profMap[r.user_id] || {};
        const contactPhone = contactsMap.get(r.user_id) || "";
        return {
          user_id: r.user_id,
          profiles: {
            display_name: isMe ? (profile.display_name || fetchedProf.display_name || "You") : (fetchedProf.display_name || "Member"),
            avatar_url: isMe ? (profile.avatar_url || fetchedProf.avatar_url) : fetchedProf.avatar_url,
            reg_no: isMe ? (profile.reg_no || fetchedProf.reg_no) : fetchedProf.reg_no,
            gender: isMe ? (profile.gender || fetchedProf.gender) : fetchedProf.gender,
            bio: isMe ? (profile.bio || fetchedProf.bio) : fetchedProf.bio,
            phone_number: isMe ? (profile.phone_number || contactPhone) : contactPhone,
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

  const startHold = (msg: Message, e: React.TouchEvent | React.MouseEvent) => {
    if (msg.id.startsWith("opt-") || editingMsgId) return;
    if ("button" in e && e.button !== 0) return; // Only primary mouse button

    didTriggerHoldRef.current = false;
    const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchStartPosRef.current = { x, y };
    setHoldingMsgId(msg.id);

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    holdTimerRef.current = setTimeout(() => {
      didTriggerHoldRef.current = true;
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(35);
        } catch {}
      }
      setHoldingMsgId(null);
      setActionMenuMsg(msg);
      holdTimerRef.current = null;
    }, 450);
  };

  const moveHold = (e: React.TouchEvent | React.MouseEvent) => {
    if (!holdTimerRef.current || !touchStartPosRef.current) return;
    const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = Math.abs(x - touchStartPosRef.current.x);
    const dy = Math.abs(y - touchStartPosRef.current.y);

    if (dx > 8 || dy > 8) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      setHoldingMsgId(null);
    }
  };

  const endHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingMsgId(null);
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
      if (selectedLoop?.id && messageCache[selectedLoop.id]) {
        messageCache[selectedLoop.id] = messageCache[selectedLoop.id].map((m) =>
          m.id === editingMsgId
            ? { ...m, content: editingContent.trim(), edited_at: new Date().toISOString() }
            : m
        );
      }
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
        if (selectedLoop?.id && messageCache[selectedLoop.id]) {
          messageCache[selectedLoop.id] = messageCache[selectedLoop.id].filter(m => m.id !== messageId);
        }
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

        const { data: inserted, error } = await supabase
          .from("messages")
          .insert({
            loop_id: selectedLoop.id,
            user_id: session.user.id,
            content,
          })
          .select("id, loop_id, user_id, content, created_at")
          .single();

        setIsSharingLocation(false);
        if (error || !inserted) {
          toast.error("Failed to share location");
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        } else {
          const realMsg: Message = {
            ...inserted,
            profiles: {
              display_name: profile.display_name || "Me",
              avatar_url: profile.avatar_url,
              gender: profile.gender || "",
              reg_no: profile.reg_no,
            },
          };
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === optimisticId ? realMsg : m));
            messageCache[selectedLoop.id] = next;
            return next;
          });

          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "new_message",
              payload: realMsg,
            });
          }

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
                    className={`relative ${isLocationMsg ? "max-w-[94%]" : "max-w-[80%]"} group select-none transition-all duration-150 cursor-pointer ${
                      holdingMsgId === msg.id ? "scale-[0.97] opacity-85" : "active:scale-[0.99]"
                    } ${
                      isSearchActive
                        ? isMatch
                          ? "ring-2 ring-[#FFC554] rounded-[20px] shadow-[0_0_12px_rgba(255,197,84,0.35)] scale-[1.01] transition-all"
                          : "opacity-35 transition-opacity"
                        : ""
                    }`}
                    onTouchStart={(e) => startHold(msg, e)}
                    onTouchMove={moveHold}
                    onTouchEnd={endHold}
                    onTouchCancel={endHold}
                    onMouseDown={(e) => startHold(msg, e)}
                    onMouseMove={moveHold}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!isOptimistic && !editingMsgId) {
                        setActionMenuMsg(msg);
                      }
                    }}
                    onDoubleClick={() => isMe && !isOptimistic && !isLocationMsg && startEditMessage(msg)}
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
                        onClick={(e) => {
                          if (didTriggerHoldRef.current) {
                            e.preventDefault();
                            didTriggerHoldRef.current = false;
                          }
                        }}
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
                            <MapIcon size={13} strokeWidth={2.2} className="text-zinc-400 dark:text-zinc-400" />
                            <span className="text-[10px] font-bold tracking-widest uppercase">
                              OPEN IN MAPS
                            </span>
                          </div>
                          <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" />
                        </div>
                      </a>
                    )}
                    {/* Desktop Hover 3-Dots Button */}
                    {!isOptimistic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuMsg(msg);
                        }}
                        aria-label="Message options"
                        className={`absolute ${
                          isMe ? "-left-8" : "-right-8"
                        } top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${
                          isDark ? "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/70 hover:text-black"
                        } hidden md:group-hover:flex items-center justify-center transition-all opacity-0 md:group-hover:opacity-100 shadow-sm`}
                      >
                        <MoreHorizontal size={13} />
                      </button>
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
      </div>


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

      {/* Hold Message Action Sheet (Mobile-First Drawer & Context Menu) */}
      {actionMenuMsg && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setActionMenuMsg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-sm ${cardBg} border ${border} sm:rounded-[28px] rounded-t-[28px] p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200`}
          >
            {/* Drawer drag handle for mobile */}
            <div className="w-10 h-1 rounded-full bg-zinc-500/30 mx-auto sm:hidden -mt-1 mb-2" />

            {/* Message Quote Preview */}
            <div className={`p-3 rounded-2xl ${isDark ? "bg-white/5 border border-white/5" : "bg-black/5 border border-black/5"} space-y-1`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${actionMenuMsg.user_id === session.user.id ? "text-[#FFC554]" : mutedText}`}>
                  {actionMenuMsg.user_id === session.user.id ? "You" : actionMenuMsg.profiles?.display_name || "Member"}
                </span>
                <span className={`text-[9px] ${mutedText}`}>
                  {formatTime(actionMenuMsg.created_at)}
                </span>
              </div>
              <p className={`text-xs font-medium line-clamp-3 break-words ${text} opacity-90`}>
                {actionMenuMsg.content}
              </p>
            </div>

            {/* Actions List */}
            <div className="space-y-2">
              {/* Edit Message - Only for message owner and not location message */}
              {actionMenuMsg.user_id === session.user.id && !getMapsUrlFromMessage(actionMenuMsg.content) && (
                <button
                  onClick={() => {
                    const target = actionMenuMsg;
                    setActionMenuMsg(null);
                    startEditMessage(target);
                  }}
                  className={`w-full h-12 px-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] ${
                    isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FFC554]/15 text-[#FFC554] flex items-center justify-center shrink-0">
                    <Edit2 size={15} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">Edit Message</p>
                    <p className={`text-[10px] ${mutedText}`}>Update your message text</p>
                  </div>
                </button>
              )}

              {/* Copy Text */}
              <button
                onClick={() => {
                  const mapsUrl = getMapsUrlFromMessage(actionMenuMsg.content);
                  const textToCopy = mapsUrl || actionMenuMsg.content;
                  navigator.clipboard.writeText(textToCopy);
                  toast.success(mapsUrl ? "Location link copied!" : "Message copied!");
                  setActionMenuMsg(null);
                }}
                className={`w-full h-12 px-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] ${
                  isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <Copy size={15} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight">Copy Text</p>
                  <p className={`text-[10px] ${mutedText}`}>Copy message to clipboard</p>
                </div>
              </button>

              {/* Delete Message - Allowed for message owner or ride host */}
              {(actionMenuMsg.user_id === session.user.id || isHost) && (
                <button
                  onClick={() => {
                    const targetId = actionMenuMsg.id;
                    setActionMenuMsg(null);
                    deleteMessage(targetId);
                  }}
                  className="w-full h-12 px-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <Trash2 size={15} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight text-red-400">Delete Message</p>
                    <p className="text-[10px] text-red-400/70">
                      {actionMenuMsg.user_id === session.user.id ? "Permanently remove this message" : "Remove message as ride host"}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setActionMenuMsg(null)}
              className={`w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${
                isDark ? "bg-white/10 hover:bg-white/15 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-zinc-700"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
