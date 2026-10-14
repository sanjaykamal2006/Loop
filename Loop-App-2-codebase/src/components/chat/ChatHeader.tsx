"use client";

import React from "react";
import { Share2, MapPin, Search, ShieldAlert, X } from "lucide-react";
import FastAvatar from "@/components/ui/FastAvatar";
import type { LoopMember, Profile } from "@/lib/types";
import type { UserProfileData } from "@/components/sections/UserProfileModal";

interface ChatHeaderProps {
  members: LoopMember[];
  sessionUserId: string;
  currentProfile: Profile;
  avatarErrors: Record<string, boolean>;
  isDark: boolean;
  border: string;
  cardBg: string;
  mutedText: string;
  onSelectUser: (user: UserProfileData) => void;
  onViewRideDetails: () => void;
  onTriggerSos: () => void;
  hasEmergencyContacts: boolean;
  onShareLocation: () => void;
  isSharingLocation: boolean;
  onShareInvite: () => void;
  isMessageSearchOpen: boolean;
  onCloseSearch: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  matchingCount: number;
}

export function ChatHeader({
  members,
  sessionUserId,
  currentProfile,
  avatarErrors: _avatarErrors,
  isDark,
  border,
  cardBg,
  mutedText,
  onSelectUser,
  onViewRideDetails,
  onTriggerSos,
  hasEmergencyContacts,
  onShareLocation,
  isSharingLocation,
  onShareInvite,
  isMessageSearchOpen,
  onCloseSearch,
  searchQuery,
  setSearchQuery,
  matchingCount,
}: ChatHeaderProps) {
  return (
    <>
      {/* Roster & Controls Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${border} ${cardBg} z-20 shadow-sm shrink-0`}>
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide flex-1 py-0.5">
          {members.map((m) => {
            const isMe = m.user_id === sessionUserId;
            const memberAvatar = isMe ? (currentProfile.avatar_url || m.profiles?.avatar_url) : m.profiles?.avatar_url;
            const memberName = isMe ? (currentProfile.display_name || m.profiles?.display_name || "You") : (m.profiles?.display_name || "Member");

            return (
              <div
                key={m.user_id}
                onClick={() =>
                  onSelectUser({
                    user_id: m.user_id,
                    display_name: memberName,
                    avatar_url: memberAvatar,
                    reg_no: isMe ? currentProfile.reg_no : m.profiles?.reg_no,
                    gender: isMe ? currentProfile.gender : m.profiles?.gender,
                    bio: isMe ? currentProfile.bio : m.profiles?.bio,
                    phone_number: isMe ? currentProfile.phone_number : m.profiles?.phone_number,
                    is_student_verified: isMe ? currentProfile.is_student_verified : m.profiles?.is_student_verified,
                  })
                }
                className="cursor-pointer active:scale-90 transition-transform group shrink-0"
                title={memberName}
              >
                <FastAvatar
                  src={memberAvatar}
                  name={memberName}
                  sizeClassName="w-10 h-10"
                  borderClassName="border-2 border-white/20 shadow-md"
                  priority={true}
                  initialsClassName={`text-xs font-black ${isDark ? "text-[#FFC554]" : "text-[#881337]"} tracking-tight`}
                  fallbackBgClassName={isDark ? "bg-[#FFC554]/20" : "bg-[#881337]/15"}
                />
              </div>
            );
          })}
          {/* Info Button to go back to Ride Details */}
          <button
            onClick={onViewRideDetails}
            aria-label="View ride details"
            className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all shrink-0 ml-1 shadow-sm ${
              isDark
                ? "bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                : "bg-black/5 hover:bg-black/10 border border-black/10 text-black"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <button
            onClick={onTriggerSos}
            aria-label="Emergency SOS"
            title={!hasEmergencyContacts ? "Add emergency contact to enable SOS" : "Emergency SOS"}
            className="h-8 px-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 shadow-sm shadow-red-600/30 transition-all shrink-0 cursor-pointer"
          >
            <ShieldAlert size={12} strokeWidth={2.6} />
            <span>SOS</span>
          </button>

          <button
            onClick={onShareLocation}
            disabled={isSharingLocation}
            aria-label="Share current location pin"
            className={`h-8 px-2.5 rounded-full ${
              isDark
                ? "bg-[#FFC554]/15 text-[#FFC554] border-[#FFC554]/30 hover:bg-[#FFC554]/25"
                : "bg-[#881337]/10 text-[#881337] border-[#881337]/25 hover:bg-[#881337]/20"
            } text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 shadow-sm transition-all shrink-0`}
          >
            <MapPin size={12} strokeWidth={2.5} className={isSharingLocation ? "animate-pulse" : ""} />
            <span>{isSharingLocation ? "..." : "Spot"}</span>
          </button>

          <button
            onClick={onShareInvite}
            aria-label="Share ride invite"
            className="h-8 px-2.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 shadow-sm hover:bg-emerald-500/25 transition-all shrink-0"
          >
            <Share2 size={12} strokeWidth={2.5} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* In-Chat Message Search Bar */}
      {isMessageSearchOpen && (
        <div className={`px-4 py-2 border-b ${border} ${cardBg} flex items-center gap-2 animate-fade-in shrink-0`}>
          <div className="relative flex-1">
            <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages in chat..."
              autoFocus
              className={`w-full h-8 pl-9 pr-8 rounded-full ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-xs font-medium outline-none ${
                isDark ? "focus:border-[#FFC554]" : "focus:border-[#881337]"
              } transition-colors`}
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
            <span
              className={`text-[10px] font-bold shrink-0 ${
                matchingCount > 0 ? (isDark ? "text-[#FFC554]" : "text-[#881337]") : mutedText
              }`}
            >
              {matchingCount} {matchingCount === 1 ? "match" : "matches"}
            </span>
          )}
          <button onClick={onCloseSearch} className={`text-xs font-bold ${mutedText} hover:opacity-100 px-1`}>
            Done
          </button>
        </div>
      )}
    </>
  );
}
