"use client";

import React from "react";
import { ShieldCheck, MessageCircle, Phone, UserMinus } from "lucide-react";
import FastAvatar from "@/components/ui/FastAvatar";
import { toast } from "@/components/ui/NativeToast";
import type { Loop, LoopMember, Profile, ThemeClasses } from "@/lib/types";
import type { UserProfileData } from "@/components/sections/UserProfileModal";

interface PassengerListProps {
  loop: Loop;
  loopMembers: LoopMember[];
  isLoadingMembers: boolean;
  sessionUserId: string;
  profile: Profile;
  isCreator: boolean;
  isJoined: boolean;
  isPast: boolean;
  onSelectUser: (user: UserProfileData) => void;
  onRemoveMember: (userId: string) => void;
  theme: ThemeClasses;
}

export function PassengerList({
  loop,
  loopMembers,
  isLoadingMembers,
  sessionUserId,
  profile,
  isCreator,
  isJoined,
  isPast,
  onSelectUser,
  onRemoveMember,
  theme,
}: PassengerListProps) {
  const { bg, border, cardBg, mutedText } = theme;

  return (
    <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
          {loop.is_driver_offering ? "Driver & Passengers" : "Passengers"}
        </p>
        <span className="text-xs font-black text-[#FFC554]">
          {isLoadingMembers
            ? `${loop.member_count || 1}/${loop.participants_limit}`
            : `${loopMembers.length}/${loop.participants_limit}`}
        </span>
      </div>

      {isLoadingMembers ? (
        <div className="space-y-2">
          {Array.from({ length: Math.max(1, loop.member_count || 1) }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2.5 ${bg} border ${border} rounded-2xl animate-pulse`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                <div className="h-4 w-28 bg-white/10 rounded-md" />
              </div>
              <div className="h-3 w-10 bg-white/10 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      ) : loopMembers.length > 0 ? (
        <div className="space-y-2">
          {loopMembers.map((member, i) => {
            const isMe = member.user_id === sessionUserId;
            const avatar = member.profiles?.avatar_url || (isMe ? profile.avatar_url : undefined);
            const displayName = isMe && profile.display_name ? profile.display_name : member.profiles?.display_name || "Member";
            const regNo = isMe && profile.reg_no ? profile.reg_no : member.profiles?.reg_no;
            const gender = isMe && profile.gender ? profile.gender : member.profiles?.gender;
            const bio = isMe && profile.bio ? profile.bio : member.profiles?.bio;
            const phone = isMe && profile.phone_number ? profile.phone_number : member.profiles?.phone_number;
            const isStudentVerified = isMe && profile.is_student_verified ? profile.is_student_verified : member.profiles?.is_student_verified;
            const canDirectContact = (isJoined || isCreator) && !isMe;

            return (
              <div
                key={member.user_id || i}
                className={`flex items-center justify-between px-3 py-2.5 ${bg} border ${border} rounded-2xl`}
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() =>
                    onSelectUser({
                      user_id: member.user_id,
                      display_name: displayName,
                      avatar_url: avatar,
                      reg_no: regNo,
                      gender: gender,
                      bio: bio,
                      phone_number: canDirectContact || isMe ? phone : undefined,
                      is_student_verified: isStudentVerified,
                    })
                  }
                >
                  <FastAvatar
                    src={avatar}
                    name={displayName}
                    sizeClassName="w-8 h-8"
                    borderClassName="border border-white/10"
                    initialsClassName="text-xs font-black text-[#FFC554]"
                    fallbackBgClassName="bg-[#FFC554]/20 border border-[#FFC554]/30"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold leading-tight break-words">{displayName}</span>
                      {isStudentVerified && (
                        <span title="Campus Verified Student" className="shrink-0 text-emerald-400">
                          <ShieldCheck size={13} strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {regNo && (
                        <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-zinc-400 truncate max-w-[90px]">
                          {regNo}
                        </span>
                      )}
                      {member.user_id === loop.creator_id && loop.is_driver_offering ? (
                        <span className="text-[8px] bg-[#FFC554]/15 border border-[#FFC554]/25 text-[#FFC554] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                          Driver
                        </span>
                      ) : member.user_id === loop.creator_id ? (
                        <span className="text-[8px] bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Host
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Direct Contact Actions for Confirmed Ride Participants */}
                  {canDirectContact && !isPast && (
                    <div className="flex items-center gap-2 mr-3">
                      {phone ? (
                        <>
                          <a
                            href={`https://wa.me/91${phone}?text=${encodeURIComponent(
                              `Hey ${displayName}, reaching out regarding our LOOP ride to ${loop?.destination || "our destination"}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Message on WhatsApp"
                            className="w-8 h-8 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                          >
                            <MessageCircle size={15} strokeWidth={2.5} />
                          </a>
                          <a
                            href={`tel:+91${phone}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Call passenger"
                            className="w-8 h-8 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                          >
                            <Phone size={15} strokeWidth={2.5} />
                          </a>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info("Phone not shared. Coordinate via in-app chat!");
                          }}
                          title="Phone not shared"
                          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-500 flex items-center justify-center active:scale-90 opacity-60"
                        >
                          <Phone size={14} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  )}

                  <span className={`text-[10px] font-black ${mutedText} capitalize`}>
                    {gender || "—"}
                  </span>

                  {isCreator && !isPast && !isMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMember(member.user_id);
                      }}
                      aria-label="Remove member"
                      className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center active:scale-90 ml-1 transition-colors cursor-pointer"
                    >
                      <UserMinus size={13} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
