"use client";

import React from "react";
import { Send, Check, X, Navigation, Map as MapIcon, ChevronRight, Search, Repeat, MoreHorizontal } from "lucide-react";
import FastAvatar from "@/components/ui/FastAvatar";
import { getMapsUrlFromMessage } from "@/lib/utils";
import type { Message, Profile, ThemeClasses } from "@/lib/types";
import type { UserProfileData } from "@/components/sections/UserProfileModal";
import { parseReturnTripMessage } from "./chatUtils";

interface MessageListProps {
  messages: Message[];
  sessionUserId: string;
  profile: Profile;
  theme: ThemeClasses;
  formatTime: (iso: string) => string;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  onLoadMoreMessages: () => void;
  searchQuery: string;
  matchingMsgIds: Set<string>;
  editingMsgId: string | null;
  editingContent: string;
  setEditingContent: (val: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  holdingMsgId: string | null;
  startHold: (msg: Message, e: React.TouchEvent | React.MouseEvent) => void;
  moveHold: (e: React.TouchEvent | React.MouseEvent) => void;
  endHold: () => void;
  onActionMenu: (msg: Message) => void;
  onStartEditMessage: (msg: Message) => void;
  onOpenReturnLoop: (loopId: string) => void;
  onSelectUser: (user: UserProfileData) => void;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  didTriggerHoldRef: React.MutableRefObject<boolean>;
}

export function MessageList({
  messages,
  sessionUserId,
  profile,
  theme,
  formatTime,
  hasMoreMessages,
  isLoadingMore,
  onLoadMoreMessages,
  searchQuery,
  matchingMsgIds,
  editingMsgId,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  holdingMsgId,
  startHold,
  moveHold,
  endHold,
  onActionMenu,
  onStartEditMessage,
  onOpenReturnLoop,
  onSelectUser,
  chatScrollRef,
  messagesEndRef,
  didTriggerHoldRef,
}: MessageListProps) {
  const { isDark, border, cardBg, mutedText, text } = theme;

  return (
    <div
      ref={chatScrollRef}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Chat messages"
      className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide space-y-1 pb-4"
    >
      {hasMoreMessages && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMoreMessages}
            disabled={isLoadingMore}
            className={`text-[11px] font-bold ${
              isDark
                ? "text-[#FFC554] bg-[#FFC554]/10 border-[#FFC554]/20 hover:bg-[#FFC554]/20"
                : "text-[#881337] bg-[#881337]/10 border-[#881337]/25 hover:bg-[#881337]/20"
            } border px-3 py-1 rounded-full transition-all active:scale-95 disabled:opacity-50`}
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
          const isMe = msg.user_id === sessionUserId;
          const mapsUrl = getMapsUrlFromMessage(msg.content);
          const isLocationMsg = Boolean(mapsUrl);
          const showSender = (idx === 0 || messages[idx - 1]?.user_id !== msg.user_id) && !isLocationMsg;
          const isEditing = editingMsgId === msg.id;
          const isOptimistic = msg.id.startsWith("opt-");
          const senderName = isMe ? profile.display_name || "You" : msg.profiles?.display_name || "Member";
          const senderAvatar = isMe ? profile.avatar_url : msg.profiles?.avatar_url;
          const isSearchActive = Boolean(searchQuery.trim());
          const isMatch = matchingMsgIds.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${showSender ? "mt-4" : "mt-0.5"}`}
            >
              {showSender && (
                <div
                  onClick={() =>
                    onSelectUser({
                      user_id: msg.user_id,
                      display_name: isMe ? profile.display_name : msg.profiles?.display_name || "Member",
                      avatar_url: isMe ? profile.avatar_url : msg.profiles?.avatar_url,
                      reg_no: isMe ? profile.reg_no : msg.profiles?.reg_no,
                      gender: isMe ? profile.gender : msg.profiles?.gender,
                      bio: isMe ? profile.bio : msg.profiles?.bio,
                      phone_number: isMe ? profile.phone_number : msg.profiles?.phone_number,
                      is_student_verified: isMe ? profile.is_student_verified : msg.profiles?.is_student_verified,
                    })
                  }
                  className={`flex items-center gap-1.5 mb-1 px-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all ${
                    isMe ? "flex-row-reverse" : ""
                  }`}
                >
                  <FastAvatar
                    src={senderAvatar}
                    name={senderName}
                    sizeClassName="w-4 h-4"
                    roundedClassName="rounded-full"
                    initialsText={(senderName || "U").substring(0, 1).toUpperCase()}
                    initialsClassName={`text-[8px] font-bold ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}
                    fallbackBgClassName={isDark ? "bg-[#FFC554]/20" : "bg-[#881337]/15"}
                  />
                  <p
                    className={`text-[10px] font-semibold ${
                      isMe ? (isDark ? "text-[#FFC554]" : "text-[#881337]") : mutedText
                    }`}
                  >
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
                      if (e.key === "Enter") onSaveEdit();
                      if (e.key === "Escape") onCancelEdit();
                    }}
                    className="flex-1 bg-transparent text-[13px] font-medium outline-none"
                  />
                  <button
                    onClick={onSaveEdit}
                    className={`w-7 h-7 rounded-lg ${
                      isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
                    } flex items-center justify-center shrink-0 active:scale-90`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                  <button
                    onClick={onCancelEdit}
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
                        ? isDark
                          ? "ring-2 ring-[#FFC554] rounded-[20px] shadow-[0_0_12px_rgba(255,197,84,0.35)] scale-[1.01] transition-all"
                          : "ring-2 ring-[#881337] rounded-[20px] shadow-[0_0_12px_rgba(136,19,55,0.25)] scale-[1.01] transition-all"
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
                      onActionMenu(msg);
                    }
                  }}
                  onDoubleClick={() => isMe && !isOptimistic && !isLocationMsg && onStartEditMessage(msg)}
                >
                  {!mapsUrl ? (
                    (() => {
                      const returnInfo = parseReturnTripMessage(msg.content);
                      if (returnInfo.isReturn && returnInfo.returnLoopId) {
                        return (
                          <div
                            className={`px-4 py-3 text-[13px] font-medium shadow-sm break-words whitespace-pre-wrap ${
                              isMe
                                ? `${isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"} rounded-[20px] rounded-tr-[4px] ${
                                    isOptimistic ? "opacity-60" : ""
                                  }`
                                : `${cardBg} border ${border} ${text} rounded-[20px] rounded-tl-[4px]`
                            }`}
                          >
                            <p className="font-semibold leading-relaxed">{returnInfo.displayText}</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReturnLoop(returnInfo.returnLoopId!);
                              }}
                              className={`mt-2.5 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-sm ${
                                isMe
                                  ? isDark
                                    ? "bg-black text-white hover:bg-zinc-800"
                                    : "bg-white text-black hover:bg-zinc-100"
                                  : isDark
                                  ? "bg-[#FFC554] text-black hover:bg-[#FFC554]/90"
                                  : "bg-[#881337] text-white hover:bg-[#700f2b]"
                              }`}
                            >
                              <Repeat size={12} strokeWidth={2.5} />
                              <span>View Return Ride</span>
                              <ChevronRight size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div
                          className={`px-4 py-2.5 text-[13px] font-medium shadow-sm break-words whitespace-pre-wrap ${
                            isMe
                              ? `${isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"} rounded-[18px] rounded-tr-[4px] ${
                                  isOptimistic ? "opacity-60" : ""
                                }`
                              : `${cardBg} border ${border} ${text} rounded-[18px] rounded-tl-[4px]`
                          }`}
                        >
                          {msg.content}
                        </div>
                      );
                    })()
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
                        <div
                          className={`w-10 h-10 rounded-full ${
                            isDark ? "bg-[#FFC554]" : "bg-[#881337]"
                          } flex items-center justify-center shrink-0 shadow-sm`}
                        >
                          <Navigation
                            size={18}
                            className={isDark ? "fill-zinc-950 text-zinc-950" : "fill-white text-white"}
                          />
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
                          <span className="text-[10px] font-bold tracking-widest uppercase">OPEN IN MAPS</span>
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
                        onActionMenu(msg);
                      }}
                      aria-label="Message options"
                      className={`absolute ${
                        isMe ? "-left-8" : "-right-8"
                      } top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${
                        isDark
                          ? "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                          : "bg-black/5 hover:bg-black/10 text-black/70 hover:text-black"
                      } hidden md:group-hover:flex items-center justify-center transition-all opacity-0 md:group-hover:opacity-100 shadow-sm`}
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 mt-0.5 px-1">
                <p className={`text-[9px] ${mutedText} opacity-40`}>{formatTime(msg.created_at)}</p>
                {msg.edited_at && <p className={`text-[9px] ${mutedText} opacity-30 italic`}>edited</p>}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
