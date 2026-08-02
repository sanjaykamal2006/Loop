"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { toast } from "sonner";
import { Send, Edit2, Check, X } from "lucide-react";
import type { Message } from "@/lib/types";

export default function ChatView() {
  const { session, selectedLoop, profile, formatTime, theme } = useLoop();
  const { border, cardBg, mutedText, text } = theme;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages on mount
  useEffect(() => {
    if (!selectedLoop) return;
    setMessages([]);
    fetchMessages(selectedLoop.id);
  }, [selectedLoop]);

  // Real-time chat & presence subscription
  useEffect(() => {
    if (!selectedLoop) return;
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          if (payload.new.loop_id !== loopId) return;
          if (payload.new.user_id === session.user.id) return;
          const { data } = await supabase
            .from("messages")
            .select("id, loop_id, user_id, content, created_at, edited_at, reactions, profiles:user_id (display_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as Message];
            });
            requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
          }
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
  }, [selectedLoop, session.user.id]);

  const fetchMessages = async (loopId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, loop_id, user_id, content, created_at, edited_at, reactions, profiles:user_id (display_name, avatar_url)")
      .eq("loop_id", loopId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView());
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
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));

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
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMessage(content);
    } else {
      const realMsg: Message = {
        ...inserted,
        profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url },
      };
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? realMsg : m)));
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
    const usersWithEmoji = existing[emoji] || [];
    const hasReacted = usersWithEmoji.includes(session.user.id);
    
    let newUsers;
    if (hasReacted) {
      newUsers = usersWithEmoji.filter((id: string) => id !== session.user.id);
    } else {
      newUsers = [...usersWithEmoji, session.user.id];
    }
    
    const newReactions = { ...existing };
    if (newUsers.length > 0) newReactions[emoji] = newUsers;
    else delete newReactions[emoji];
    
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

  if (!selectedLoop) return null;

  return (
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
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
                  <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
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
                    <div
                      className={`px-4 py-2.5 text-[13px] font-medium shadow-sm ${
                        isMe
                          ? `bg-[#FFC554] text-black rounded-[18px] rounded-tr-[4px] ${isOptimistic ? "opacity-60" : ""}`
                          : `${cardBg} border ${border} ${text} rounded-[18px] rounded-tl-[4px]`
                      }`}
                    >
                      {msg.content}
                    </div>
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
                    {/* Edit button */}
                    {isMe && !isOptimistic && (
                      <button
                        onClick={() => startEditMessage(msg)}
                        className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-focus-within:opacity-100 active:opacity-100"
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        <Edit2 size={10} />
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
      <div className="shrink-0 px-4 pb-5 pt-2">
        <div className={`${cardBg} border ${border} rounded-[24px] p-1.5 flex gap-2 shadow-xl items-center`}>
          <input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Message..."
            className="flex-1 bg-transparent px-4 text-sm font-medium outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-[#FFC554] text-black rounded-[16px] flex items-center justify-center active:scale-90  shrink-0 disabled:opacity-40"
          >
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
