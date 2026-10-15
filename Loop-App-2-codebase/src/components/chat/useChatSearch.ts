"use client";

import { useState, useMemo } from "react";
import type { Message } from "@/lib/types";

export function useChatSearch(
  messages: Message[],
  sessionUserId: string,
  currentDisplayName?: string | null
) {
  const [searchQuery, setSearchQuery] = useState("");

  const matchingMsgIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    for (const m of messages) {
      const isMe = m.user_id === sessionUserId;
      const senderName = isMe ? currentDisplayName || "You" : m.profiles?.display_name || "";
      if (m.content.toLowerCase().includes(q) || senderName.toLowerCase().includes(q)) {
        matches.add(m.id);
      }
    }
    return matches;
  }, [messages, searchQuery, sessionUserId, currentDisplayName]);

  return {
    searchQuery,
    setSearchQuery,
    matchingMsgIds,
  };
}
