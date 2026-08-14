"use client";

import React from "react";
import { useLoop } from "@/lib/LoopContext";
import { X, User, BadgeCheck, FileText } from "lucide-react";

export interface UserProfileData {
  user_id?: string;
  display_name: string;
  avatar_url?: string;
  reg_no?: string;
  gender?: string;
  bio?: string;
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
  const { theme, session } = useLoop();
  const { isDark, cardBg, border, mutedText } = theme;
  const currentUserId = session?.user?.id;

  const maskRegNo = (regNo: string) => regNo.length > 5 ? regNo.substring(0, 5) + '****' : '****';

  if (!isOpen || !user) return null;

  const avatarSrc =
    user.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.display_name || user.user_id || "User")}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-sm ${cardBg} border ${border} rounded-[32px] p-6 flex flex-col items-center relative shadow-2xl overflow-hidden text-center space-y-4`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close profile modal"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-90"
        >
          <X size={16} />
        </button>

        {/* Profile Avatar / Initials */}
        <div className="w-24 h-24 rounded-[28px] bg-[#FFC554] p-1 border-2 border-[#FFC554]/40 flex items-center justify-center shadow-xl overflow-hidden shrink-0 mt-2">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover rounded-[24px]" />
          ) : (
            <span className="text-2xl font-black text-black">
              {user.display_name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Identity Info */}
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight">{user.display_name}</h2>
          <div className="flex items-center justify-center gap-2 pt-0.5">
            {user.reg_no && (
              <span className="text-[10px] bg-[#FFC554]/15 text-[#FFC554] border border-[#FFC554]/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                {user.user_id === currentUserId ? user.reg_no : maskRegNo(user.reg_no)}
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

        {/* Bio Card */}
        <div className={`w-full p-4 ${isDark ? "bg-white/5" : "bg-black/5"} border ${border} rounded-2xl text-left space-y-1`}>
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
          className="w-full py-3 bg-[#FFC554] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md"
        >
          Done
        </button>
      </div>
    </div>
  );
}
