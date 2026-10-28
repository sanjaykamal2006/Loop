"use client";

import React, { useState } from "react";
import { useLoop } from "@/lib/LoopContext";
import { 
  X, 
  FileText, 
  Phone, 
  MessageCircle, 
  ShieldCheck, 
  Lock, 
  Copy, 
  Check, 
  GraduationCap,
  User
} from "lucide-react";
import FastAvatar from "@/components/ui/FastAvatar";
import { sanitizeIndianPhoneNumber } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { toast } from "@/components/ui/NativeToast";
import { useModalA11y } from "@/lib/hooks/useModalA11y";

export interface UserProfileData {
  user_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  reg_no?: string | null;
  gender?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  is_student_verified?: boolean | null;
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
  const { isDark, mutedText, accentText } = theme;
  const currentUserId = session?.user?.id;
  const [copiedRegNo, setCopiedRegNo] = useState(false);
  const modalRef = useModalA11y(isOpen && Boolean(user), onClose);

  if (!isOpen || !user) return null;

  const isMe = user.user_id === currentUserId;
  const avatarUrl = user.avatar_url || (isMe ? profile.avatar_url : undefined);
  const rawRegNo = (user.reg_no || "").trim().toUpperCase();

  // Extract Batch if Reg No starts with 2 digits (e.g. 26BEE... -> '26 Batch)
  const batchMatch = rawRegNo.match(/^(\d{2})/);
  const batchTag = batchMatch ? `'${batchMatch[1]} Batch` : null;

  const handleCopyRegNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rawRegNo) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rawRegNo);
      setCopiedRegNo(true);
      toast.success(`Copied ${rawRegNo} to clipboard!`);
      setTimeout(() => setCopiedRegNo(false), 2000);
    }
  };

  const cleanPhone = user.phone_number ? sanitizeIndianPhoneNumber(user.phone_number) : "";
  const hasPhone = cleanPhone.length === 10;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Student profile"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm max-h-[90vh] ${
          isDark ? "bg-[#000000] border-[#27272A] text-white" : "bg-[#FFFFFF] border-[#DFD9CE] text-[#1C1917]"
        } border rounded-[32px] p-5 sm:p-6 flex flex-col relative shadow-2xl overflow-y-auto scrollbar-hide space-y-4`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-[#27272A]" : "border-[#DFD9CE]"} shrink-0`}>
          <div className="flex items-center gap-2">
            <User size={15} className={accentText} />
            <span className={`text-[11px] font-black uppercase tracking-widest ${accentText}`}>
              Student Profile
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className={`w-8 h-8 rounded-full ${
              isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-black"
            } flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Hero Avatar & Identity */}
        <div className="flex flex-col items-center text-center space-y-2.5 pt-1">
          {/* Avatar with glow */}
          <div className="relative group">
            <div className={`absolute -inset-1.5 rounded-[30px] ${isDark ? "bg-[#FFC554]/20" : "bg-[#881337]/15"} blur-lg opacity-70`} />
            <div className="relative w-24 h-24 rounded-[26px] bg-zinc-900 border-2 border-white/15 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
              <FastAvatar
                src={avatarUrl}
                name={user.display_name}
                sizeClassName="w-full h-full"
                roundedClassName="rounded-[24px]"
                priority={true}
                initialsClassName={`text-2xl font-black ${isDark ? "text-black" : "text-white"}`}
                fallbackBgClassName={isDark ? "bg-[#FFC554]" : "bg-[#881337]"}
              />
            </div>
            {user.is_student_verified && (
              <div 
                title="Verified Campus Student"
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-1 rounded-full border-2 border-black shadow-md"
              >
                <ShieldCheck size={14} strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Student Name */}
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight uppercase leading-tight">
              {user.display_name}
            </h2>
            {isMe && (
              <span className={`text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>
                (This is you)
              </span>
            )}
          </div>

          {/* Identity Badges Row */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
            {user.is_student_verified && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <ShieldCheck size={12} strokeWidth={2.5} />
                <span>VIT-AP Verified</span>
              </span>
            )}

            {batchTag && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                isDark 
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30" 
                  : "bg-purple-600/10 text-purple-700 border border-purple-600/25"
              }`}>
                {batchTag}
              </span>
            )}

            {user.gender && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                user.gender.toLowerCase() === "female" 
                  ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" 
                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              }`}>
                {user.gender}
              </span>
            )}
          </div>
        </div>

        {/* Full Unmasked Registration Number Card */}
        {rawRegNo ? (
          <div 
            onClick={handleCopyRegNo}
            className={`w-full p-3.5 ${
              isDark ? "bg-[#121214] hover:bg-[#18181B]" : "bg-zinc-50 hover:bg-zinc-100"
            } border ${isDark ? "border-[#27272A]" : "border-[#E4E4E7]"} rounded-2xl flex items-center justify-between cursor-pointer transition-colors shadow-sm group`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl ${
                isDark ? "bg-[#FFC554]/15 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"
              } flex items-center justify-center shrink-0`}>
                <GraduationCap size={18} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className={`text-[9px] font-black uppercase tracking-wider ${mutedText}`}>
                  Registration Number
                </span>
                <span className="text-sm font-black tracking-wider uppercase truncate">
                  {rawRegNo}
                </span>
              </div>
            </div>

            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              copiedRegNo 
                ? "bg-emerald-500/20 text-emerald-400" 
                : isDark ? "bg-white/5 text-zinc-400 group-hover:text-white" : "bg-black/5 text-zinc-600"
            } text-[10px] font-bold tracking-wider transition-colors shrink-0`}>
              {copiedRegNo ? (
                <>
                  <Check size={12} strokeWidth={2.5} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} strokeWidth={2.2} />
                  <span>Copy</span>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Direct Contact for Confirmed Ride Co-Members */}
        {!isMe && (
          hasPhone ? (
            <div className="w-full flex gap-2">
              <a
                href={getWhatsAppUrl({
                  phone: cleanPhone,
                  text: `Hey ${user.display_name}! Coordinating our LOOP ride.`,
                })}
                className="flex-1 py-3 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                <MessageCircle size={15} strokeWidth={2.5} />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:+91${cleanPhone}`}
                className="flex-1 py-3 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                <Phone size={15} strokeWidth={2.5} />
                <span>Call</span>
              </a>
            </div>
          ) : (
            <div className={`w-full py-2.5 px-3.5 rounded-2xl ${
              isDark ? "bg-[#121214] border-[#27272A]" : "bg-zinc-50 border-[#E4E4E7]"
            } border text-[11px] font-bold ${mutedText} flex items-center justify-center gap-2 text-center`}>
              <Lock size={13} className="shrink-0 opacity-70" strokeWidth={2.2} />
              <span>Direct phone private • Coordinate via in-app chat</span>
            </div>
          )
        )}

        {/* Bio Card */}
        <div className={`w-full p-3.5 ${
          isDark ? "bg-[#121214] border-[#27272A]" : "bg-zinc-50 border-[#E4E4E7]"
        } border rounded-2xl text-left space-y-1`}>
          <div className="flex items-center gap-1.5 opacity-60">
            <FileText size={12} strokeWidth={2.2} />
            <span className="text-[9px] font-black uppercase tracking-wider">Bio</span>
          </div>
          <p className="text-xs font-medium leading-relaxed opacity-90 break-words">
            {user.bio?.trim() ? user.bio : "No bio added yet."}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className={`w-full h-12 ${
            isDark
              ? "bg-[#FFC554] text-black hover:bg-[#FFD278]"
              : "bg-[#881337] text-white hover:bg-[#9F1239]"
          } font-black text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] shadow-md transition-all flex items-center justify-center cursor-pointer shrink-0`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
