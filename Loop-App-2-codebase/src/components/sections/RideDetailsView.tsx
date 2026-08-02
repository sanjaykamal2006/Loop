"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";

import { MapPin, Clock, Trash2, LogOut as LeaveIcon, Play, XCircle, UserMinus, Receipt, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
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
  const [fareInput, setFareInput] = useState<string>("");
  const [isEditingFare, setIsEditingFare] = useState(false);

  useEffect(() => {
    if (selectedLoop) {
      setFareInput(selectedLoop.total_fare?.toString() || "");
    }
  }, [selectedLoop?.total_fare]);

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

    if (!error && data) setLoopMembers(data as unknown as LoopMember[]);
  };

  const enterChat = () => {
    if (!selectedLoop) return;
    setView("chat");
  };

  const removeMember = async (userId: string) => {
    if (!selectedLoop || !isCreator) return;
    const { error } = await supabase
      .from("loop_members")
      .delete()
      .match({ loop_id: selectedLoop.id, user_id: userId });
    
    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      fetchLoopMembers(selectedLoop.id);
    }
  };

  const updateLoopStatus = async (status: "in_progress" | "cancelled" | "ended") => {
    if (!selectedLoop || !isCreator) return;
    const { error } = await supabase
      .from("loops")
      .update({ status })
      .eq("id", selectedLoop.id);

    if (error) {
      toast.error("Failed to update loop status");
    } else {
      toast.success(status === 'cancelled' ? "Loop cancelled" : status === 'ended' ? "Loop ended" : "Journey started!");
      setSelectedLoop({ ...selectedLoop, status });
      fetchLoops();
      if (status === 'cancelled' || status === 'ended') {
        setView("home");
      }
    }
  };

  const saveTotalFare = async () => {
    if (!selectedLoop || !isCreator) return;
    const val = parseInt(fareInput);
    if (isNaN(val) || val < 0) return toast.error("Invalid fare amount");
    
    const { error } = await supabase
      .from("loops")
      .update({ total_fare: val })
      .eq("id", selectedLoop.id);
      
    if (error) {
      toast.error("Failed to update fare");
    } else {
      toast.success("Fare updated");
      setIsEditingFare(false);
      fetchLoops();
      setSelectedLoop({ ...selectedLoop, total_fare: val });
    }
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

      {/* Fare Splitter */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={14} className={mutedText} strokeWidth={2.5} />
            <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Fare Splitter</p>
          </div>
          {isCreator && !isEditingFare && (
            <button onClick={() => setIsEditingFare(true)} className={`text-[10px] font-black text-[#FFC554] uppercase tracking-wider active:scale-95`}>
              {selectedLoop.total_fare ? "Edit Fare" : "Set Fare"}
            </button>
          )}
        </div>

        {isEditingFare ? (
          <div className="flex items-center gap-2">
            <div className={`flex-1 flex items-center h-10 ${bg} border ${border} rounded-[16px] px-3`}>
              <span className={`font-black ${mutedText} mr-2`}>₹</span>
              <input 
                type="number" 
                value={fareInput} 
                onChange={e => setFareInput(e.target.value)} 
                placeholder="Total Fare"
                className="flex-1 bg-transparent text-sm font-bold outline-none"
                autoFocus
              />
            </div>
            <button onClick={saveTotalFare} className="w-10 h-10 bg-green-500/10 text-green-500 flex items-center justify-center rounded-[16px] active:scale-95">
              <Check size={16} strokeWidth={3} />
            </button>
            <button onClick={() => setIsEditingFare(false)} className={`w-10 h-10 ${cardBg} border border-red-500/20 text-red-500 flex items-center justify-center rounded-[16px] active:scale-95`}>
              <X size={16} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[9px] font-bold ${mutedText} uppercase`}>Total Fare</p>
              <h3 className="font-black text-lg">
                {selectedLoop.total_fare ? `₹${selectedLoop.total_fare}` : "—"}
              </h3>
            </div>
              {((selectedLoop.total_fare || 0) > 0) && loopMembers.length > 0 && (
                <div className="text-right">
                  <p className={`text-[9px] font-bold ${mutedText} uppercase`}>Your Share</p>
                  <h3 className="font-black text-lg text-[#FFC554]">
                    ₹{Math.ceil((selectedLoop.total_fare || 0) / loopMembers.length)}
                  </h3>
                </div>
              )}
          </div>
        )}
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
                  {member.profiles?.avatar_url ? (
                    <img src={member.profiles.avatar_url} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black ${
                        member.profiles?.gender === "female"
                          ? "bg-pink-500/15 text-pink-400"
                          : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {(member.profiles?.display_name || "M").substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-bold">{member.profiles?.display_name || "Member"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black ${mutedText} capitalize`}>
                    {member.profiles?.gender || "—"}
                  </span>
                  {isCreator && member.user_id !== session.user.id && (
                    <button 
                      onClick={() => removeMember(member.user_id)}
                      className="w-6 h-6 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90 "
                    >
                      <UserMinus size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={() => (isJoined ? enterChat() : joinLoop(selectedLoop))}
          disabled={isJoining}
          className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98] "
        >
          {isJoined ? "Open Chat" : "Join Loop"}
        </button>

        {isCreator && selectedLoop.status === 'open' && (
          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={() => updateLoopStatus('in_progress')}
              className="flex-1 h-11 bg-green-500 text-black font-black rounded-[20px] text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] "
            >
              <Play size={14} fill="currentColor" /> Start Journey
            </button>
            <button
              onClick={() => updateLoopStatus('cancelled')}
              className={`flex-1 h-11 ${cardBg} border border-red-500/30 text-red-500 font-black rounded-[20px] text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 active:scale-[0.98] `}
            >
              <XCircle size={14} /> Cancel Loop
            </button>
          </div>
        )}
        {isCreator && selectedLoop.status === 'in_progress' && (
          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={() => updateLoopStatus('ended')}
              className={`w-full h-11 bg-red-500 text-white font-black rounded-[20px] text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 active:scale-[0.98] `}
            >
              End Journey
            </button>
          </div>
        )}

        {/* Leave Loop — for joined non-creators */}
        {isJoined && !isCreator && (
          <button
            onClick={() => leaveLoop(selectedLoop.id)}
            className={`w-full h-10 ${cardBg} border border-orange-500/20 text-orange-500 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] `}
          >
            <LeaveIcon size={13} /> Leave Loop
          </button>
        )}

        {/* Delete Loop — for creators only */}
        {isCreator && (
          <button
            onClick={() => deleteLoop(selectedLoop.id)}
            className={`w-full h-10 ${cardBg} border border-red-500/20 text-red-500 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] `}
          >
            <Trash2 size={13} /> Delete Loop
          </button>
        )}
      </div>
    </div>
  );
}
