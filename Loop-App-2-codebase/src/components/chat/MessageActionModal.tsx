"use client";

import React from "react";
import { Edit2, Copy, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import { getMapsUrlFromMessage } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { parseReturnTripMessage } from "./chatUtils";
import { useModalA11y } from "@/lib/hooks/useModalA11y";

interface MessageActionModalProps {
  actionMenuMsg: Message | null;
  sessionUserId: string;
  isHost: boolean;
  isDark: boolean;
  cardBg: string;
  border: string;
  text: string;
  mutedText: string;
  formatTime: (iso: string) => string;
  onClose: () => void;
  onStartEdit: (msg: Message) => void;
  onDeleteMessage: (msgId: string) => void;
}

export function MessageActionModal({
  actionMenuMsg,
  sessionUserId,
  isHost,
  isDark,
  cardBg,
  border,
  text,
  mutedText,
  formatTime,
  onClose,
  onStartEdit,
  onDeleteMessage,
}: MessageActionModalProps) {
  const modalRef = useModalA11y(Boolean(actionMenuMsg), onClose);
  if (!actionMenuMsg) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Message actions"
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-sm ${cardBg} border ${border} sm:rounded-[28px] rounded-t-[28px] p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200`}
      >
        {/* Drawer drag handle for mobile */}
        <div className="w-10 h-1 rounded-full bg-zinc-500/30 mx-auto sm:hidden -mt-1 mb-2" />

        {/* Message Quote Preview */}
        <div
          className={`p-3 rounded-2xl ${
            isDark ? "bg-white/5 border border-white/5" : "bg-black/5 border border-black/5"
          } space-y-1`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                actionMenuMsg.user_id === sessionUserId
                  ? isDark
                    ? "text-[#FFC554]"
                    : "text-[#881337]"
                  : mutedText
              }`}
            >
              {actionMenuMsg.user_id === sessionUserId ? "You" : actionMenuMsg.profiles?.display_name || "Member"}
            </span>
            <span className={`text-[9px] ${mutedText}`}>{formatTime(actionMenuMsg.created_at)}</span>
          </div>
          <p className={`text-xs font-medium line-clamp-3 break-words ${text} opacity-90`}>
            {parseReturnTripMessage(actionMenuMsg.content).displayText}
          </p>
        </div>

        {/* Actions List */}
        <div className="space-y-2">
          {/* Edit Message - Only for message owner and not location/return message */}
          {actionMenuMsg.user_id === sessionUserId &&
            !getMapsUrlFromMessage(actionMenuMsg.content) &&
            !parseReturnTripMessage(actionMenuMsg.content).isReturn && (
              <button
                onClick={() => {
                  const target = actionMenuMsg;
                  onClose();
                  onStartEdit(target);
                }}
                className={`w-full h-12 px-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] ${
                  isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-900"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl ${
                    isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
                  } flex items-center justify-center shrink-0`}
                >
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
              const returnInfo = parseReturnTripMessage(actionMenuMsg.content);
              const textToCopy = mapsUrl || (returnInfo.isReturn ? returnInfo.displayText : actionMenuMsg.content);
              navigator.clipboard.writeText(textToCopy);
              toast.success(mapsUrl ? "Location link copied!" : "Message copied!");
              onClose();
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
          {(actionMenuMsg.user_id === sessionUserId || isHost) && (
            <button
              onClick={() => {
                const targetId = actionMenuMsg.id;
                onClose();
                onDeleteMessage(targetId);
              }}
              className="w-full h-12 px-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 size={15} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight text-red-400">Delete Message</p>
                <p className="text-[10px] text-red-400/70">
                  {actionMenuMsg.user_id === sessionUserId
                    ? "Permanently remove this message"
                    : "Remove message as ride host"}
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className={`w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${
            isDark ? "bg-white/10 hover:bg-white/15 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-zinc-700"
          }`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
