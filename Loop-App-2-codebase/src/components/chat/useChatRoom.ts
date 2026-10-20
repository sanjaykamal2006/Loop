"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import type { Message, Loop, LoopMember, Profile, View } from "@/lib/types";
import type { Session } from "@supabase/supabase-js";
import { LRUCache } from "@/lib/cache";
import { formatDepartureFull } from "@/lib/dateFormatter";
import { triggerHaptic } from "@/lib/haptics";
import { useChatSearch } from "./useChatSearch";
import { useMessageHoldActions } from "./useMessageHoldActions";
import { useChatRoster } from "./useChatRoster";

const messageCache = new LRUCache<string, Message[]>({ maxSize: 30 });
const PAGE_SIZE = 25;

interface UseChatRoomOptions {
  session: Session;
  selectedLoop: Loop | null;
  setSelectedLoop: (loop: Loop | null) => void;
  profile: Profile;
  userJoinedLoops: string[];
  userLoops: string[];
  activeLoops: Loop[];
  setView: (view: View) => void;
}

export function useChatRoom({
  session,
  selectedLoop,
  setSelectedLoop,
  profile,
  userJoinedLoops,
  userLoops,
  activeLoops,
  setView,
}: UseChatRoomOptions) {
  // Per-user cache key: messages must never be readable by a different
  // account that shares the same device/browser profile.
  const messagesCacheKey = useCallback(
    (loopId: string) => `loop_messages_${session.user.id}_${loopId}`,
    [session.user.id]
  );

  const [messages, setMessages] = useState<Message[]>(() => {
    if (selectedLoop?.id) {
      const fromMem = messageCache.get(selectedLoop.id);
      if (fromMem) return fromMem;
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(messagesCacheKey(selectedLoop.id));
          if (cached) return JSON.parse(cached);
        } catch (err) { logger.error("src/components/chat/useChatRoom.ts: swallowed non-fatal error", err); }
      }
    }
    return [];
  });
  const [newMessage, setNewMessage] = useState("");
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [avatarErrors] = useState<Record<string, boolean>>({});

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const currentLoopIdRef = useRef<string | null>(null);
  const loopMembersRef = useRef<LoopMember[]>([]);
  // Monotonic fetch generation: replies from a stale fetch (loop switched,
  // slow poll raced a realtime refresh) must never paint or overwrite cache.
  const fetchGenRef = useRef(0);
  // Owner of the module-level in-memory message cache; the mount effect wipes
  // the cache when a different account starts using the same tab.
  const cacheOwnerRef = useRef<string | null>(null);

  // Sub-hook 1: Search & Filtering
  const { searchQuery, setSearchQuery, matchingMsgIds } = useChatSearch(
    messages,
    session.user.id,
    profile.display_name
  );

  // Sub-hook 2: Touch/Hold Gestures & Message Actions
  const {
    editingMsgId,
    setEditingMsgId,
    editingContent,
    setEditingContent,
    actionMenuMsg,
    setActionMenuMsg,
    holdingMsgId,
    didTriggerHoldRef,
    startHold,
    moveHold,
    endHold,
    startEditMessage,
  } = useMessageHoldActions();

  // Sub-hook 3: Member Roster & Contacts
  const { members, selectedUser, setSelectedUser, fetchMembers } = useChatRoster({
    session,
    selectedLoop,
    setSelectedLoop,
    profile,
    userJoinedLoops,
    userLoops,
    setView,
  });

  useEffect(() => {
    loopMembersRef.current = members;
  }, [members]);

  const scrollToBottom = useCallback((force = false) => {
    if (chatScrollRef.current) {
      const { scrollHeight, clientHeight } = chatScrollRef.current;
      if (force || scrollHeight > clientHeight + 20) {
        chatScrollRef.current.scrollTop = scrollHeight - clientHeight;
      }
    }
  }, []);

  const fetchMessages = useCallback(
    async (loopId: string) => {
      const gen = ++fetchGenRef.current;
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)"
        )
        .eq("loop_id", loopId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (gen !== fetchGenRef.current) return; // a newer fetch superseded this one

      if (error) {
        logger.error("fetchMessages error:", error);
        const { data: fallbackData } = await supabase
          .from("messages")
          .select("id, loop_id, user_id, content, created_at, edited_at, reactions")
          .eq("loop_id", loopId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (gen !== fetchGenRef.current) return; // stale during the fallback round-trip
        if (fallbackData) {
          const enriched = fallbackData.reverse().map((m) => {
            const sender = loopMembersRef.current.find((mem) => mem.user_id === m.user_id);
            return {
              id: m.id,
              loop_id: m.loop_id || loopId,
              user_id: m.user_id || "",
              content: m.content,
              created_at: m.created_at || new Date().toISOString(),
              edited_at: m.edited_at,
              reactions: (m.reactions && typeof m.reactions === "object" ? m.reactions : {}) as Message["reactions"],
              profiles: sender?.profiles || { display_name: "Member" },
            } as Message;
          });
          messageCache.set(loopId, enriched);
          setMessages(enriched);
          try {
            localStorage.setItem(messagesCacheKey(loopId), JSON.stringify(enriched));
          } catch (err) { logger.error("src/components/chat/useChatRoom.ts: swallowed non-fatal error", err); }
          setHasMoreMessages(fallbackData.length === PAGE_SIZE);
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } else if (data) {
        const msgs = (data as unknown as Message[]).reverse();
        messageCache.set(loopId, msgs);
        setMessages(msgs);
        try {
          localStorage.setItem(messagesCacheKey(loopId), JSON.stringify(msgs));
        } catch (err) { logger.error("src/components/chat/useChatRoom.ts: swallowed non-fatal error", err); }
        setHasMoreMessages(data.length === PAGE_SIZE);
        requestAnimationFrame(() => scrollToBottom(false));
      }
    },
    [scrollToBottom, messagesCacheKey]
  );

  // Fetch messages on mount or loop change (instant 0ms cache check)
  useEffect(() => {
    if (cacheOwnerRef.current !== session.user.id) {
      messageCache.clear();
      cacheOwnerRef.current = session.user.id;
    }
    if (!selectedLoop?.id) return;
    if (currentLoopIdRef.current !== selectedLoop.id) {
      currentLoopIdRef.current = selectedLoop.id;
      const cached = messageCache.get(selectedLoop.id);
      if (cached) {
        setMessages(cached);
      } else if (typeof window !== "undefined") {
        try {
          const localCached = localStorage.getItem(messagesCacheKey(selectedLoop.id));
          setMessages(localCached ? JSON.parse(localCached) : []);
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
    fetchMessages(selectedLoop.id);
    fetchMembers(selectedLoop.id);
  }, [selectedLoop?.id, fetchMessages, fetchMembers, messagesCacheKey, session.user.id]);

  // Latest-fetch refs: keep the realtime subscription alive across parent
  // re-renders. fetchMembers/fetchMessages identities churn with context objects
  // (loops, profile); recreating the channel on every refresh caused missed
  // messages while the socket re-connected. Only loopId should re-subscribe.
  const fetchMessagesRef = useRef(fetchMessages);
  const fetchMembersRef = useRef(fetchMembers);
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
    fetchMembersRef.current = fetchMembers;
  }, [fetchMessages, fetchMembers]);

  // Realtime WebSocket subscription for instant message & member updates with relaxed 25s fallback
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;

    const channel = supabase
      .channel(`chat-room-${loopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `loop_id=eq.${loopId}`,
        },
        () => {
          fetchMessagesRef.current(loopId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loop_members",
          filter: `loop_id=eq.${loopId}`,
        },
        () => {
          fetchMembersRef.current(loopId);
        }
      )
      .subscribe();

    // Fallback polling: relaxed to 25s to preserve connection limits
    const fallbackPoll = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessagesRef.current(loopId);
        fetchMembersRef.current(loopId);
      }
    };

    const intervalId = setInterval(fallbackPoll, 25000);
    pollIntervalRef.current = intervalId;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fallbackPoll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
      pollIntervalRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedLoop?.id]);

  const loadMoreMessages = async () => {
    if (!selectedLoop?.id || messages.length === 0 || isLoadingMore) return;
    setIsLoadingMore(true);

    const oldestMessage = messages[0];
    const gen = fetchGenRef.current; // superseded fetches apply, but must not paint a different loop
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)"
      )
      .eq("loop_id", selectedLoop.id)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (gen !== fetchGenRef.current) {
      setIsLoadingMore(false);
      return;
    }
    if (!error && data && data.length > 0) {
      const olderMessages = (data as unknown as Message[]).reverse();
      setMessages((prev) => {
        const combined = [...olderMessages, ...prev];
        messageCache.set(selectedLoop.id, combined);
        return combined;
      });
      setHasMoreMessages(data.length === PAGE_SIZE);
    } else {
      setHasMoreMessages(false);
    }
    setIsLoadingMore(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedLoop?.id) return;
    triggerHaptic(10);
    const textToSend = newMessage.trim();
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      loop_id: selectedLoop.id,
      user_id: session.user.id,
      content: textToSend,
      created_at: new Date().toISOString(),
      profiles: {
        display_name: profile.display_name || "You",
        avatar_url: profile.avatar_url,
        reg_no: profile.reg_no,
        gender: profile.gender,
        bio: profile.bio,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({ loop_id: selectedLoop.id, user_id: session.user.id, content: textToSend })
        .select("id, loop_id, user_id, content, created_at, reactions")
        .single();

      if (error) {
        logger.error("Send message error:", error);
        // DB-side fair-use caps (rate limits) send user-friendly message text;
        // surface it instead of the generic failure toast.
        toast.error(error.message || "Message failed to send");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNewMessage(textToSend);
      } else if (data) {
        const enriched: Message = {
          ...data,
          loop_id: data.loop_id || selectedLoop.id,
          user_id: data.user_id || session.user.id,
          created_at: data.created_at || new Date().toISOString(),
          reactions: (data.reactions && typeof data.reactions === "object" ? data.reactions : {}) as Message["reactions"],
          profiles: {
            display_name: profile.display_name || "You",
            avatar_url: profile.avatar_url,
            reg_no: profile.reg_no,
            gender: profile.gender,
            bio: profile.bio,
          },
        };
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? enriched : m));
          messageCache.set(selectedLoop.id, updated);
          try {
            // Same per-user scoped key the read path uses — never the raw
            // unscoped loop id, which leaked chat bytes across accounts.
            localStorage.setItem(messagesCacheKey(selectedLoop.id), JSON.stringify(updated));
          } catch (err) { logger.error("src/components/chat/useChatRoom.ts: swallowed non-fatal error", err); }
          return updated;
        });
      }
    } catch (err) {
      logger.error("sendMessage exception:", err);
      toast.error("Message failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(textToSend);
    }
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
      if (selectedLoop?.id && messageCache.get(selectedLoop.id)) {
        const cached = messageCache.get(selectedLoop.id)!;
        messageCache.set(
          selectedLoop.id,
          cached.map((m) =>
            m.id === editingMsgId
              ? { ...m, content: editingContent.trim(), edited_at: new Date().toISOString() }
              : m
          )
        );
      }
      setEditingMsgId(null);
      setEditingContent("");
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { data, error } = await supabase.from("messages").delete().eq("id", messageId).select("id");

      if (error) {
        logger.error("Delete message error:", error);
        toast.error("Failed to delete message");
      } else if (!data || data.length === 0) {
        logger.warn("No message was deleted in database");
        toast.error("Failed to delete message");
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        if (selectedLoop?.id && messageCache.get(selectedLoop.id)) {
          const cached = messageCache.get(selectedLoop.id)!;
          messageCache.set(
            selectedLoop.id,
            cached.filter((m) => m.id !== messageId)
          );
        }
        toast.success("Message deleted");
      }
    } catch (err) {
      logger.error("deleteMessage exception:", err);
      toast.error("Failed to delete message");
    }
  };

  const handleShareLocation = async () => {
    if (!selectedLoop) return;
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        const content = `Location shared: ${mapsUrl}`;

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
            loop_id: inserted.loop_id || selectedLoop.id,
            user_id: inserted.user_id || session.user.id,
            created_at: inserted.created_at || new Date().toISOString(),
            profiles: {
              display_name: profile.display_name || "Me",
              avatar_url: profile.avatar_url,
              gender: profile.gender || "",
              reg_no: profile.reg_no,
            },
          };
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === optimisticId ? realMsg : m));
            messageCache.set(selectedLoop.id, next);
            try {
              localStorage.setItem(messagesCacheKey(selectedLoop.id), JSON.stringify(next));
            } catch (err) { logger.error("src/components/chat/useChatRoom.ts: swallowed non-fatal error", err); }
            return next;
          });
        }
      },
      (err) => {
        setIsSharingLocation(false);
        toast.error("Failed to get location: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleShare = () => {
    if (!selectedLoop) return;
    const timeDisplay = formatDepartureFull(selectedLoop.departure_time);
    const text = `Join my ride on LOOP!\n${selectedLoop.start_point} -> ${selectedLoop.destination}\nDeparture: ${timeDisplay}\nCheck it out here: https://loop-app.runs-on.dev`;
    if (navigator.share) {
      navigator.share({ title: "LOOP Ride", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Ride details copied to clipboard!");
    }
  };

  const handleOpenReturnLoop = (returnLoopId: string) => {
    const found = activeLoops.find((l) => l.id === returnLoopId);
    if (found) {
      setSelectedLoop(found);
    } else {
      supabase
        .from("loops")
        .select("*, creator:profiles!fk_loops_creator_id(display_name, avatar_url, reg_no)")
        .eq("id", returnLoopId)
        .single()
        .then(({ data }) => {
          if (data) setSelectedLoop(data as unknown as Loop);
        });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  return {
    messages,
    newMessage,
    editingMsgId,
    setEditingMsgId,
    editingContent,
    setEditingContent,
    actionMenuMsg,
    setActionMenuMsg,
    holdingMsgId,
    didTriggerHoldRef,
    startHold,
    moveHold,
    endHold,
    members,
    selectedUser,
    setSelectedUser,
    avatarErrors,
    hasMoreMessages,
    isLoadingMore,
    isSharingLocation,
    searchQuery,
    setSearchQuery,
    matchingMsgIds,
    messagesEndRef,
    chatScrollRef,
    loadMoreMessages,
    sendMessage,
    saveEditMessage,
    deleteMessage,
    handleOpenReturnLoop,
    handleInputChange,
    startEditMessage,
    handleShareLocation,
    handleShare,
  };
}
