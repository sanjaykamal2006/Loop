"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { motion } from "framer-motion";
import { MapPin, Clock, Trash2, LogOut as LeaveIcon } from "lucide-react";
import type { LoopMember } from "@/lib/types";

export default function RideDetailsView() {
  const {
    session,
    selectedLoop,
    userJoinedLoops,
    userLoops,
    joinLoop,
    deleteLoop,
    leaveLoop,
    isJoining,
    setSelectedLoop,
    setView,
    fetchLoops,
    formatTime,
    theme,
  } = useLoop();
  const { bg, border, cardBg, mutedText } = theme;

  const [loopMembers, setLoopMembers] = useState<LoopMember[]>([]);

  useEffect(() => {
    if (!selectedLoop) return;
    fetchLoopMembers(selectedLoop.id);

    const memberSub = supabase
      .channel(`members-${selectedLoop.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loop_members",
          filter: `loop_id=eq.${selectedLoop.id}`,
        },
        () => {
          fetchLoopMembers(selectedLoop.id);
          fetchLoops();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberSub);
    };
  }, [selectedLoop]);

  const fetchLoopMembers = async (loopId: string) => {
    const { data, error } = await supabase
      .from("loop_members")
      .select("user_id, profiles:user_id (display_name, gender)")
      .eq("loop_id", loopId);

    if (!error && data) setLoopMembers(data as LoopMember[]);
  };

  const enterChat = () => {
    if (!selectedLoop) return;
    setView("chat");
  };

  if (!selectedLoop) return null;

  const isCreator = userLoops.includes(selectedLoop.id);
  const isJoined = userJoinedLoops.includes(selectedLoop.id);

  return (
    <div className="space-y-2.5 pt-1">
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
          <MapPin size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Destination</p>
          <h3 className="font-black text-base uppercase tracking-tight">{selectedLoop.destination}</h3>
        </div>
      </div>

      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
          <Clock size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Departure</p>
          <h3 className="font-black text-xl text-[#FFC554]">{formatTime(selectedLoop.departure_time)}</h3>
        </div>
      </div>

      {/* Passengers */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Passengers</p>
          <span className="text-xs font-black text-[#FFC554]">
            {loopMembers.length}/{selectedLoop.participants_limit}
          </span>
        </div>
        {loopMembers.length > 0 && (
          <div className="space-y-2">
            {loopMembers.map((member, i) => (
              <div
                key={member.user_id || i}
                className={`flex items-center justify-between px-3 py-2.5 ${bg} border ${border} rounded-2xl`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${
                      member.profiles?.gender === "female"
                        ? "bg-pink-500/15 text-pink-400"
                        : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {(member.profiles?.display_name || "M").substring(0, 1).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold">{member.profiles?.display_name || "Member"}</span>
                </div>
                <span className={`text-[10px] font-black ${mutedText} capitalize`}>
                  {member.profiles?.gender || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => (isJoined ? enterChat() : joinLoop(selectedLoop))}
          disabled={isJoining}
          className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {isJoined ? "Open Chat" : "Join Loop"}
        </motion.button>

        {/* Leave Loop — for joined non-creators */}
        {isJoined && !isCreator && (
          <button
            onClick={() => leaveLoop(selectedLoop.id)}
            className={`w-full h-10 ${cardBg} border border-orange-500/20 text-orange-500 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
          >
            <LeaveIcon size={13} /> Leave Loop
          </button>
        )}

        {/* Delete Loop — for creators only */}
        {isCreator && (
          <button
            onClick={() => deleteLoop(selectedLoop.id)}
            className={`w-full h-10 ${cardBg} border border-red-500/20 text-red-500 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
          >
            <Trash2 size={13} /> Delete Loop
          </button>
        )}
      </div>
    </div>
  );
}
