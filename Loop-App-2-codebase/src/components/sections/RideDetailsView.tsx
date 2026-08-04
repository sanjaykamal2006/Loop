"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";

import { MapPin, Clock, Trash2, LogOut as LeaveIcon, XCircle, UserMinus, Receipt, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { LoopMember } from "@/lib/types";
import UserProfileModal, { UserProfileData } from "./UserProfileModal";

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
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);

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
      .select("user_id, profiles:user_id (display_name, gender, reg_no, bio)")
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

  const updateLoopStatus = async (status: "ended") => {
    if (!selectedLoop || !isCreator) return;
    const { error } = await supabase
      .from("loops")
      .update({ status })
      .eq("id", selectedLoop.id);

    if (error) {
      toast.error("Failed to update loop status");
    } else {
      toast.success("Loop ended");
      setSelectedLoop({ ...selectedLoop, status });
      fetchLoops();
      setView("home");
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
      {/* Destination */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
          <MapPin size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Destination</p>
          <h3 className="font-black text-base uppercase tracking-tight">{selectedLoop.destination}</h3>
        </div>
      </div>

      {/* Starting Time */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
          <Clock size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Starting Time</p>
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
          <div className="flex items-center justify-between w-full">
            <div>
              <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Total Fare</p>
              <h3 className="font-black text-lg">
                {selectedLoop.total_fare ? `₹${selectedLoop.total_fare}` : "Not Set"}
              </h3>
            </div>
            
            <div className="text-right">
              <p className={`text-[9px] font-bold ${mutedText} uppercase tracking-wider`}>Split (Per Person)</p>
              <h3 className="font-black text-lg text-[#FFC554]">
                {selectedLoop.total_fare ? `₹${Math.ceil((selectedLoop.total_fare) / Math.max(1, loopMembers.length))}` : "—"}
              </h3>
            </div>
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
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => setSelectedUser({
                    user_id: member.user_id,
                    display_name: member.profiles?.display_name || "Member",
                    reg_no: member.profiles?.reg_no,
                    gender: member.profiles?.gender,
                    bio: member.profiles?.bio,
                  })}
                >
                  {member.profiles?.avatar_url ? (
                    <img src={member.profiles.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FFC554]/20 border border-[#FFC554]/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-[#FFC554]">
                        {(member.profiles?.display_name || "M").substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-bold truncate">{member.profiles?.display_name || "Member"}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-black ${mutedText} capitalize`}>
                    {member.profiles?.gender || "—"}
                  </span>
                  {isCreator && member.user_id !== session.user.id && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMember(member.user_id);
                      }}
                      aria-label="Remove member"
                      className="w-6 h-6 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90"
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

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={() => (isJoined ? enterChat() : joinLoop(selectedLoop))}
          disabled={isJoining}
          className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98]"
        >
          {isJoined ? "Open Chat" : "Join Loop"}
        </button>

        {isCreator && (
          <button
            onClick={() => updateLoopStatus("ended")}
            className="w-full h-12 bg-red-500 text-white font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <XCircle size={16} strokeWidth={2.5} />
            End Loop
          </button>
        )}

        {isCreator && (
          <button
            onClick={() => deleteLoop(selectedLoop.id)}
            className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-500/70 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5`}
          >
            <Trash2 size={13} strokeWidth={2.5} />
            Delete Loop
          </button>
        )}

        {isJoined && !isCreator && (
          <button
            onClick={() => leaveLoop(selectedLoop.id)}
            className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-500/70 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5`}
          >
            <LeaveIcon size={13} strokeWidth={2.5} />
            Leave Loop
          </button>
        )}
      </div>

      <UserProfileModal user={selectedUser} isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
