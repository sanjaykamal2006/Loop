"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { triggerHaptic } from "@/lib/haptics";
import type { Message } from "@/lib/types";

export function useMessageHoldActions() {
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

  const startHold = useCallback((msg: Message, e: React.TouchEvent | React.MouseEvent) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    didTriggerHoldRef.current = false;
    setHoldingMsgId(msg.id);

    const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchStartPosRef.current = { x, y };

    holdTimerRef.current = setTimeout(() => {
      didTriggerHoldRef.current = true;
      triggerHaptic(20);
      setActionMenuMsg(msg);
      setHoldingMsgId(null);
      holdTimerRef.current = null;
    }, 450);
  }, []);

  const moveHold = useCallback((e: React.TouchEvent | React.MouseEvent) => {
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
  }, []);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingMsgId(null);
  }, []);

  const startEditMessage = useCallback((msg: Message) => {
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
    setActionMenuMsg(null);
  }, []);

  return {
    editingMsgId,
    setEditingMsgId,
    editingContent,
    setEditingContent,
    actionMenuMsg,
    setActionMenuMsg,
    holdingMsgId,
    setHoldingMsgId,
    didTriggerHoldRef,
    startHold,
    moveHold,
    endHold,
    startEditMessage,
  };
}
