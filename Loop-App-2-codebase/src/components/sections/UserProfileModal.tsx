"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, FileText, Phone, MessageCircle, ShieldCheck } from "lucide-react";

export interface UserProfileData {
  user_id?: string;
  display_name: string;
  avatar_url?: string;
  reg_no?: string;
  gender?: string;
  bio?: string;
  phone_number?: string;
  is_student_verified?: boolean;
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
}: {
  user: UserProfileData | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, session, profile } = useLoop();
  const { isDark, border, mutedText } = theme;
  const currentUserId = session?.user?.id;

  const formatTag = (tag: string, isMe: boolean) => {
    if (isMe) return tag;
    // Only mask if it looks like an academic reg no (e.g. 21BCE1234)
    if (/^\d{2}[A-Za-z]{3}\d+/i.test(tag)) {
      return tag.substring(0, 5) + '****';
    }
    return tag;
  };

  if (!isOpen || !user) return null;

  const avatarUrl = user.avatar_url || (user.user_id === currentUserId ? profile.avatar_url : undefined);

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-sm max-h-[85vh] ${isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"} border ${border} rounded-[32px] p-6 flex flex-col items-center relative shadow-2xl overflow-y-auto scrollbar-hide text-center space-y-4`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close profile modal"
          className={`absolute top-4 right-4 w-8 h-8 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"} flex items-center justify-center active:scale-90 transition-transform`}
        >
          <X size={16} />
        </button>

        {/* Profile Avatar / Initials */}
        <div className="w-24 h-24 rounded-[28px] bg-zinc-800 border-2 border-white/10 flex items-center justify-center shadow-xl overflow-hidden shrink-0 mt-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user.display_name} className="w-full h-full object-cover rounded-[24px]" />
          ) : (
            <div className="w-full h-full bg-[#FFC554] flex items-center justify-center">
              <span className="text-2xl font-black text-black">
                {user.display_name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Identity Info */}
        <div className="space-y-1">
          <h2 className="text-lg font-black tracking-tight uppercase">{user.display_name}</h2>
          <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
            {user.is_student_verified && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} strokeWidth={2.5} />
                <span>VIT-AP Verified Student</span>
              </span>
            )}
            {user.reg_no && (
              <span className="text-[10px] bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                {formatTag(user.reg_no, user.user_id === currentUserId)}
              </span>
            )}
            {user.gender && (
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                user.gender === "female" ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              }`}>
                {user.gender}
              </span>
            )}
          </div>
        </div>

        {/* Direct Contact for Confirmed Ride Co-Members */}
        {user.user_id !== currentUserId && (
          user.phone_number ? (
            <div className="w-full flex gap-2 pt-1">
              <a
                href={`https://wa.me/91${user.phone_number}?text=${encodeURIComponent(`Hey ${user.display_name}! Coordinating our LOOP ride.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                <MessageCircle size={15} strokeWidth={2.5} />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:+91${user.phone_number}`}
                className="flex-1 py-3 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                <Phone size={15} strokeWidth={2.5} />
                <span>Call</span>
              </a>
            </div>
          ) : (
            <div className={`w-full py-2 px-3 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} text-[10px] font-bold ${mutedText} text-center`}>
              🔒 Phone not shared. Coordinate in LOOP in-app chat.
            </div>
          )
        )}

        {/* Bio Card */}
        <div className={`w-full p-3.5 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-left space-y-1`}>
          <div className="flex items-center gap-1.5 opacity-60">
            <FileText size={12} />
            <span className="text-[9px] font-black uppercase tracking-wider">Bio</span>
          </div>
          <p className="text-xs font-bold leading-relaxed opacity-90">
            {user.bio?.trim() ? user.bio : "No bio added yet."}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}
