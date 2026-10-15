"use client";

import React from "react";
import { ArrowLeft, Share2, Edit3, Repeat, ShieldAlert, Trash2, LogOut as LeaveIcon } from "lucide-react";
import type { Loop, ThemeClasses } from "@/lib/types";

interface RideActionButtonsProps {
  loop: Loop;
  isPast: boolean;
  isCreator: boolean;
  isJoined: boolean;
  isJoining: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  emergencyContactsCount: number;
  onJoin: () => void;
  onEnterChat: () => void;
  onShareLoop: () => void;
  onOpenEditModal: () => void;
  onPlanReturnRide: () => void;
  onTriggerSos: () => void;
  onDeleteLoop: () => void;
  onLeaveLoop: () => void;
  onBackToHistory: () => void;
  theme: ThemeClasses;
}

export function RideActionButtons({
  loop,
  isPast,
  isCreator,
  isJoined,
  isJoining,
  isDeleting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  emergencyContactsCount,
  onJoin,
  onEnterChat,
  onShareLoop,
  onOpenEditModal,
  onPlanReturnRide,
  onTriggerSos,
  onDeleteLoop,
  onLeaveLoop,
  onBackToHistory,
  theme,
}: RideActionButtonsProps) {
  const { isDark, border, cardBg } = theme;

  if (isPast) {
    return (
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onBackToHistory}
          className={`w-full py-3.5 ${cardBg} border ${border} rounded-[22px] text-xs font-black uppercase tracking-wider active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm cursor-pointer`}
        >
          <ArrowLeft size={16} />
          Back to Ride History
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      {loop.is_female_only && !isJoined && (
        <p className="text-[10px] text-center text-pink-400 font-bold px-2 py-0.5">
          Female-Only Ride: Based on self-reported gender at signup. Not independently verified.
        </p>
      )}

      {/* Primary Action Button: Join Loop or Open Chat */}
      <button
        type="button"
        onClick={isJoined ? onEnterChat : onJoin}
        disabled={isJoining}
        className={`w-full h-12 ${
          isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
        } font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer`}
      >
        {isJoining ? "Joining..." : isJoined ? "Open Chat" : "Join Loop"}
      </button>

      {/* WhatsApp / Social Share */}
      <button
        type="button"
        onClick={onShareLoop}
        className="w-full py-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] font-black text-[10px] uppercase tracking-[0.2em] rounded-[20px] active:scale-[0.98] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
      >
        <Share2 size={13} strokeWidth={2.5} />
        Share Loop (WhatsApp / Friends)
      </button>

      {/* Edit Ride Details (Host only) */}
      {isCreator && (
        <button
          type="button"
          onClick={onOpenEditModal}
          className={`w-full py-3 ${cardBg} ${
            isDark
              ? "border border-[#FFC554]/30 hover:border-[#FFC554]/60 text-[#FFC554]"
              : "border border-[#881337]/30 hover:border-[#881337]/60 text-[#881337]"
          } rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer`}
        >
          <Edit3 size={13} strokeWidth={2.5} />
          Edit Ride Details
        </button>
      )}

      {/* Plan Return Ride (Host only, non-return rides) */}
      {isCreator && loop.purpose !== "return" && (
        <button
          type="button"
          onClick={onPlanReturnRide}
          className={`w-full py-3 ${cardBg} border border-indigo-500/30 hover:border-indigo-500/60 rounded-[20px] text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer`}
        >
          <Repeat size={13} strokeWidth={2.5} />
          Plan Return Ride
        </button>
      )}

      {/* Emergency SOS */}
      <button
        type="button"
        onClick={onTriggerSos}
        aria-label="Emergency SOS"
        className={`w-full py-3 ${
          emergencyContactsCount === 0
            ? "bg-red-600/10 hover:bg-red-600/20 border border-red-500/25 text-red-400/80"
            : "bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 hover:border-red-500/70 text-red-400 hover:text-red-300"
        } rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer`}
      >
        <ShieldAlert size={14} strokeWidth={2.5} />
        <span>{emergencyContactsCount === 0 ? "Setup Emergency Contact (Required for SOS)" : "Emergency SOS"}</span>
      </button>

      {/* Delete Loop (Host only) */}
      {isCreator && (
        showDeleteConfirm ? (
          <div className="flex gap-2 animate-fade-in">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className={`flex-1 py-3 ${cardBg} border ${border} rounded-[20px] text-xs font-bold text-zinc-400 active:scale-[0.98] disabled:opacity-50 cursor-pointer`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDeleteLoop}
              disabled={isDeleting}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-[20px] active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={13} strokeWidth={2.5} className={isDeleting ? "animate-spin" : ""} />
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-400 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer`}
          >
            <Trash2 size={13} strokeWidth={2.5} />
            Delete Loop
          </button>
        )
      )}

      {/* Leave Loop (Passenger only) */}
      {isJoined && !isCreator && (
        <button
          type="button"
          onClick={onLeaveLoop}
          className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-500/70 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer`}
        >
          <LeaveIcon size={13} strokeWidth={2.5} />
          Leave Loop
        </button>
      )}
    </div>
  );
}
