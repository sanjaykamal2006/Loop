"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/NativeToast";
import type { Message, Loop, LoopMember, Profile, View } from "@/lib/types";
import type { Session } from "@supabase/supabase-js";
import { LRUCache } from "@/lib/cache";
import type { UserProfileData } from "@/components/sections/UserProfileModal";
import { formatDepartureFull } from "@/lib/dateFormatter";
import { triggerHaptic } from "@/lib/haptics";
import { openWhatsApp } from "@/lib/whatsapp";

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
  const [messages, setMessages] = useState<Message[]>(() => {
    if (selectedLoop?.id) {
      const fromMem = messageCache.get(selectedLoop.id);
      if (fromMem) return fromMem;
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`loop_messages_${selectedLoop.id}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
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

  const [members, setMembers] = useState<LoopMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [avatarErrors] = useState<Record<string, boolean>>({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const matchingMsgIds = useMemo(() => {
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
  const loopMembersRef = useRef<LoopMember[]>([]);

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
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)"
        )
        .eq("loop_id", loopId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        logger.error("fetchMessages error:", error);
        const { data: fallbackData } = await supabase
          .from("messages")
          .select("id, loop_id, user_id, content, created_at, edited_at, reactions")
          .eq("loop_id", loopId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
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
            localStorage.setItem(`loop_messages_${loopId}`, JSON.stringify(enriched));
          } catch {}
          setHasMoreMessages(fallbackData.length === PAGE_SIZE);
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } else if (data) {
        const msgs = (data as unknown as Message[]).reverse();
        messageCache.set(loopId, msgs);
        setMessages(msgs);
        try {
          localStorage.setItem(`loop_messages_${loopId}`, JSON.stringify(msgs));
        } catch {}
        setHasMoreMessages(data.length === PAGE_SIZE);
        requestAnimationFrame(() => scrollToBottom(false));
      }
    },
    [scrollToBottom]
  );

  const fetchMembers = useCallback(
    async (loopId: string) => {
      try {
        const { data: memberRows, error: memErr } = await supabase
          .from("loop_members")
          .select("user_id")
          .eq("loop_id", loopId);

        if (memErr) {
          logger.warn("fetchMembers query error:", memErr);
          return;
        }

        const rawMemberRows = memberRows || [];
        const userIds = Array.from(new Set(rawMemberRows.map((r: { user_id: string }) => r.user_id)));

        if (!selectedLoop) return;
        const isCreator = selectedLoop.creator_id === session?.user?.id || userLoops.includes(selectedLoop.id);
        const isMember = userIds.includes(session?.user?.id) || userJoinedLoops.includes(selectedLoop.id);

        if (!isCreator && !isMember) {
          const { data: checkRow } = await supabase
            .from("loop_members")
            .select("id")
            .eq("loop_id", loopId)
            .eq("user_id", session?.user?.id)
            .maybeSingle();

          if (!checkRow) {
            toast.info("You must join this loop to view its chat");
            setView("home");
            setSelectedLoop(null);
            return;
          }
          if (session?.user?.id && !userIds.includes(session.user.id)) {
            userIds.push(session.user.id);
          }
        } else if (session?.user?.id && !userIds.includes(session.user.id)) {
          userIds.push(session.user.id);
        }

        const [{ data: profs }, { data: contacts }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, avatar_url, reg_no, gender, bio, is_student_verified")
            .in("id", userIds),
          supabase.rpc("get_loop_contacts", { target_loop_id: loopId }),
        ]);

        type ProfileData = {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          reg_no: string | null;
          gender: string | null;
          bio: string | null;
          is_student_verified: boolean | null;
        };

        const profMap: Record<string, ProfileData> = {};
        if (profs) {
          (profs as ProfileData[]).forEach((p) => {
            profMap[p.id] = p;
          });
        }

        const contactsMap = new Map<string, string>();
        if (contacts && Array.isArray(contacts)) {
          (contacts as { user_id?: string; phone_number?: string }[]).forEach((c) => {
            if (c.user_id && c.phone_number) {
              contactsMap.set(c.user_id, c.phone_number);
            }
          });
        }

        const memberList: { user_id: string }[] = [...rawMemberRows];
        if (session?.user?.id && !memberList.some((r) => r.user_id === session.user.id)) {
          memberList.push({ user_id: session.user.id });
        }

        const formatted = memberList.map((r) => {
          const isMe = r.user_id === session.user.id;
          const fetchedProf = profMap[r.user_id] || {};
          const contactPhone = contactsMap.get(r.user_id) || "";
          return {
            user_id: r.user_id,
            profiles: {
              display_name: isMe
                ? profile.display_name || fetchedProf.display_name || "You"
                : fetchedProf.display_name || "Member",
              avatar_url: isMe ? profile.avatar_url || fetchedProf.avatar_url : fetchedProf.avatar_url,
              reg_no: isMe ? profile.reg_no || fetchedProf.reg_no : fetchedProf.reg_no,
              gender: isMe ? profile.gender || fetchedProf.gender : fetchedProf.gender,
              bio: isMe ? profile.bio || fetchedProf.bio : fetchedProf.bio,
              phone_number: isMe ? profile.phone_number || contactPhone : contactPhone,
              is_student_verified: isMe ? profile.is_student_verified : fetchedProf.is_student_verified,
            },
          };
        });

        setMembers(formatted);
      } catch (e) {
        logger.error("fetchMembers error:", e);
      }
    },
    [selectedLoop, session?.user?.id, userLoops, userJoinedLoops, setView, setSelectedLoop, profile]
  );

  // Fetch messages on mount or loop change (instant 0ms cache check)
  useEffect(() => {
    if (!selectedLoop?.id) return;
    if (currentLoopIdRef.current !== selectedLoop.id) {
      currentLoopIdRef.current = selectedLoop.id;
      const cached = messageCache.get(selectedLoop.id);
      if (cached) {
        setMessages(cached);
      } else if (typeof window !== "undefined") {
        try {
          const localCached = localStorage.getItem(`loop_messages_${selectedLoop.id}`);
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
  }, [selectedLoop?.id, fetchMessages, fetchMembers]);

  // Poll messages every 3s when tab is visible
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;

    const poll = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessages(loopId);
      }
    };

    const intervalId = setInterval(poll, 3000);
    pollIntervalRef.current = intervalId;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
        fetchMembers(loopId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      pollIntervalRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedLoop?.id, fetchMessages, fetchMembers]);

  // Members polling - refresh every 5s
  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;
    const memberPoll = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMembers(loopId);
      }
    }, 5000);
    return () => clearInterval(memberPoll);
  }, [selectedLoop?.id, fetchMembers]);

  const loadMoreMessages = async () => {
    if (!selectedLoop?.id || messages.length === 0 || isLoadingMore) return;
    setIsLoadingMore(true);

    const oldestMessage = messages[0];
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)"
      )
      .eq("loop_id", selectedLoop.id)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

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
    if (!newMessage.trim() || !selectedLoop) return;
    const content = newMessage.trim();
    setNewMessage("");

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
        loop_id: inserted.loop_id || selectedLoop.id,
        user_id: inserted.user_id || session.user.id,
        created_at: inserted.created_at || new Date().toISOString(),
        reactions: (inserted.reactions && typeof inserted.reactions === "object"
          ? inserted.reactions
          : {}) as Message["reactions"],
        profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url },
      };
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === optimisticId ? realMsg : m));
        messageCache.set(selectedLoop.id, next);
        try {
          localStorage.setItem(`loop_messages_${selectedLoop.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const handleOpenReturnLoop = async (returnLoopId: string) => {
    triggerHaptic(10);
    const existing = activeLoops.find((l) => l.id === returnLoopId);
    if (existing) {
      setSelectedLoop(existing);
      setView("ride-details");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("loops")
        .select(`
          *,
          loop_members (
            user_id,
            profiles:user_id (display_name, avatar_url, gender, reg_no, bio, is_student_verified)
          )
        `)
        .eq("id", returnLoopId)
        .single();

      if (error || !data) {
        toast.error("Unable to load return ride details");
        return;
      }
      setSelectedLoop(data as unknown as Loop);
      setView("ride-details");
    } catch {
      toast.error("Failed to open return ride");
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
    if ("button" in e && e.button !== 0) return;

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
              localStorage.setItem(`loop_messages_${selectedLoop.id}`, JSON.stringify(next));
            } catch {}
            return next;
          });

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
      : selectedLoop?.participants_limit || 4;
    const emptySeats = Math.max(0, (selectedLoop?.participants_limit || 4) - members.length);
    const timeStr = formatDepartureFull(selectedLoop?.departure_time);
    const fromStr = selectedLoop?.start_point || "VIT-AP Campus";
    const femaleTag = selectedLoop?.is_female_only ? "\nPreference: Female passengers only" : "";
    const shareUrl =
      typeof window !== "undefined"
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
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    openWhatsApp({ text: rawShareMessage });
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
    holdTimerRef,
    touchStartPosRef,
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
