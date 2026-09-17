"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";

import { MapPin, Clock, Trash2, LogOut as LeaveIcon, XCircle, CheckCircle2, UserMinus, Receipt, Check, X, ArrowLeft, Edit3, Share2, Shield, Phone, MessageCircle, ShieldCheck, Repeat } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import type { LoopMember } from "@/lib/types";
import UserProfileModal, { UserProfileData } from "./UserProfileModal";
import EditLoopModal from "./EditLoopModal";
import FastAvatar from "@/components/ui/FastAvatar";
import { SteeringWheelIcon } from "@/components/ui/VehicleIcons";
import { triggerHaptic } from "@/lib/haptics";
import { formatDepartureFull } from "@/lib/dateFormatter";

const membersCache: Record<string, LoopMember[]> = {};

export default function RideDetailsView() {
  const {
    session,
    profile,
    selectedLoop,
    userJoinedLoops,
    userLoops,
    joinLoop,
    deleteLoop,
    leaveLoop,
    isJoining,
    isDeleting,
    setSelectedLoop,
    setView,
    fetchLoops,
    formatTime,
    theme,
    setChatSource,
    setCreatePrefill,
  } = useLoop();
  const { bg, border, cardBg, mutedText } = theme;

  const [loopMembers, setLoopMembers] = useState<LoopMember[]>(() => {
    if (selectedLoop?.id && membersCache[selectedLoop.id]) {
      return membersCache[selectedLoop.id];
    }
    return [];
  });
  const [isLoadingMembers, setIsLoadingMembers] = useState(() => {
    return !(selectedLoop?.id && membersCache[selectedLoop.id]);
  });
  const [fareInput, setFareInput] = useState<string>("");
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTimePast = selectedLoop?.departure_time
    ? new Date(selectedLoop.departure_time).getTime() < Date.now()
    : false;
  const isPast =
    selectedLoop?.status === "ended" ||
    selectedLoop?.status === "cancelled" ||
    isTimePast;

  useEffect(() => {
    if (selectedLoop) {
      setFareInput(selectedLoop.total_fare?.toString() || "");
    }
  }, [selectedLoop?.total_fare]);

  useEffect(() => {
    if (!selectedLoop) {
      setView("home");
      return;
    }
    const isCreator = selectedLoop.creator_id === session?.user?.id || userLoops.includes(selectedLoop.id);
    if (selectedLoop.is_female_only && profile.gender && profile.gender !== "female" && !isCreator) {
      toast.error("This ride is restricted to female students only.");
      setView("home");
    }
  }, [selectedLoop, session?.user?.id, userLoops, profile.gender, setView]);

  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;
    if (membersCache[loopId]) {
      setLoopMembers(membersCache[loopId]);
      setIsLoadingMembers(false);
    } else {
      setIsLoadingMembers(true);
    }
    fetchLoopMembers(loopId);

    const memberSub = supabase
      .channel(`members-${loopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loop_members",
          filter: `loop_id=eq.${loopId}`,
        },
        () => {
          fetchLoopMembers(loopId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberSub);
    };
  }, [selectedLoop?.id]);

  const fetchLoopMembers = async (loopId: string) => {
    try {
      const isAuthorized = Boolean(
        selectedLoop &&
        (selectedLoop.creator_id === session?.user?.id ||
          userLoops.includes(selectedLoop.id) ||
          userJoinedLoops.includes(selectedLoop.id))
      );

      const [membersRes, contactsRes] = await Promise.all([
        supabase
          .from("loop_members")
          .select("user_id, profiles:user_id (display_name, avatar_url, gender, reg_no, bio, is_student_verified)")
          .eq("loop_id", loopId),
        isAuthorized
          ? supabase.rpc("get_loop_contacts", { target_loop_id: loopId })
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!membersRes.error && membersRes.data) {
        const contactsMap = new Map<string, string>();
        if (contactsRes?.data && Array.isArray(contactsRes.data)) {
          contactsRes.data.forEach((c: any) => {
            if (c.user_id && c.phone_number) {
              contactsMap.set(c.user_id, c.phone_number);
            }
          });
        }

        const mems = (membersRes.data as any[]).map((m: any) => {
          const phone = contactsMap.get(m.user_id) || "";
          return {
            ...m,
            profiles: {
              ...m.profiles,
              phone_number: phone,
            },
          };
        }) as LoopMember[];

        membersCache[loopId] = mems;
        setLoopMembers(mems);
      }
    } catch (err) {
      console.error("fetchLoopMembers error:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const enterChat = () => {
    if (!selectedLoop) return;
    setChatSource("ride-details");
    setView("chat");
  };

  const removeMember = async (userId: string) => {
    if (!selectedLoop || !isCreator || isPast) return;
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

  const saveTotalFare = async () => {
    if (!selectedLoop || !isCreator || isPast) return;
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
      fetchLoops(true);
      setSelectedLoop({ ...selectedLoop, total_fare: val });
    }
  };

  const handleShareLoop = async () => {
    triggerHaptic(12);
    if (!selectedLoop) return;
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/?loop=${selectedLoop.id}`
      : `https://loop-demo-app.vercel.app/?loop=${selectedLoop.id}`;

    const seatsLeft = Math.max(0, selectedLoop.participants_limit - (loopMembers.length || 1));
    const totalOfferedSeats = selectedLoop.is_driver_offering
      ? Math.max(1, selectedLoop.participants_limit - 1)
      : selectedLoop.participants_limit;
    const femaleNote = selectedLoop.is_female_only ? "\nPreference: Female passengers only" : "";
    const start = selectedLoop.start_point || "VIT-AP Campus";

    const text = `LOOP — Ride to ${selectedLoop.destination}\nFrom: ${start}\nSchedule: ${formatDepartureFull(selectedLoop.departure_time)}\nSeats Available: ${seatsLeft} of ${totalOfferedSeats}${femaleNote}\n\nJoin this ride:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          text: text,
        });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  if (!selectedLoop) return null;

  const isCreator = Boolean(selectedLoop && (selectedLoop.creator_id === session?.user?.id || userLoops.includes(selectedLoop.id)));
  const isJoined = userJoinedLoops.includes(selectedLoop.id);

  return (
    <div className="space-y-2.5 pt-1">
      {/* Archived / Past Status Banner */}
      {isPast && (
        <div className={`p-3.5 ${cardBg} border ${selectedLoop.status === 'cancelled' ? 'border-red-500/20' : 'border-emerald-500/20'} rounded-[24px] flex items-center justify-between shadow-sm`}>
          <div className="flex items-center gap-2.5">
            {selectedLoop.status === 'cancelled' ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                <XCircle size={18} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
            )}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                {selectedLoop.status === 'cancelled' ? 'Ride Cancelled' : 'Ride Completed'}
              </h4>
              <p className={`text-[10px] font-bold ${mutedText}`}>Archived ride (read-only)</p>
            </div>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${selectedLoop.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            Archived
          </span>
        </div>
      )}

      {/* Destination */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
          <MapPin size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Destination</p>
            {selectedLoop.purpose === "return" && (
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/35 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <Repeat size={10} strokeWidth={2.5} />
                <span>Return Ride</span>
              </span>
            )}
          </div>
          <h3 className="font-black text-base uppercase tracking-tight">{selectedLoop.destination}</h3>
        </div>
      </div>

      {/* Starting Time / Schedule */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className="w-9 h-9 rounded-xl bg-[#FFC554]/10 flex items-center justify-center text-[#FFC554]">
          <Clock size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Schedule</p>
          <h3 className="font-black text-base sm:text-lg text-[#FFC554]">
            {formatDepartureFull(selectedLoop.departure_time)}
          </h3>
        </div>
      </div>

      {/* Fare Splitter or Student Driver Personal Ride Info */}
      {selectedLoop.is_driver_offering ? (
        <div className={`p-4 ${cardBg} border border-[#FFC554]/30 rounded-[28px] flex items-center justify-between shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFC554]/15 border border-[#FFC554]/25 flex items-center justify-center text-[#FFC554] shrink-0">
              <SteeringWheelIcon size={20} />
            </div>
            <div>
              <p className={`text-[9px] font-black ${mutedText} uppercase tracking-wider`}>Student Driver</p>
              <h4 className="font-black text-sm uppercase text-[#FFC554]">
                Personal {selectedLoop.vehicle_type || "Vehicle"} Drop
              </h4>
            </div>
          </div>
          <span className={`text-[9px] font-black text-[#FFC554] bg-[#FFC554]/10 border border-[#FFC554]/25 px-2.5 py-1 rounded-full uppercase tracking-wider`}>
            Coordinate in chat
          </span>
        </div>
      ) : (
        <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={14} className={mutedText} strokeWidth={2.5} />
              <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Fare Splitter</p>
            </div>
            {isCreator && !isEditingFare && !isPast && (
              <button onClick={() => setIsEditingFare(true)} className={`text-[10px] font-black text-[#FFC554] uppercase tracking-wider active:scale-95`}>
                {selectedLoop.total_fare ? "Edit Fare" : "Set Fare"}
              </button>
            )}
          </div>

          {isEditingFare && !isPast ? (
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
      )}

      {/* Peer-to-Peer Non-Commercial Safety Disclaimer */}
      <div className="flex items-center justify-between px-2.5 py-0.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500">
          <Shield size={11} className="text-[#FFC554]/70 shrink-0" />
          <span>Peer-to-peer non-commercial cost sharing</span>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-terms-modal"))}
          className="text-[9px] font-black text-[#FFC554] underline hover:opacity-80 active:scale-95 transition-all shrink-0"
        >
          Safety Policy
        </button>
      </div>

      {/* Passengers */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] space-y-3`}>
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>
            {selectedLoop.is_driver_offering ? "Driver & Passengers" : "Passengers"}
          </p>
          <span className="text-xs font-black text-[#FFC554]">
            {isLoadingMembers
              ? `${selectedLoop.member_count || 1}/${selectedLoop.participants_limit}`
              : `${loopMembers.length}/${selectedLoop.participants_limit}`}
          </span>
        </div>
        
        {isLoadingMembers ? (
          <div className="space-y-2">
            {Array.from({ length: Math.max(1, selectedLoop.member_count || 1) }).map((_, i) => (
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
              const isMe = member.user_id === session.user.id;
              const avatar = member.profiles?.avatar_url || (isMe ? profile.avatar_url : undefined);
              const displayName = (isMe && profile.display_name) ? profile.display_name : (member.profiles?.display_name || "Member");
              const regNo = (isMe && profile.reg_no) ? profile.reg_no : member.profiles?.reg_no;
              const gender = (isMe && profile.gender) ? profile.gender : member.profiles?.gender;
              const bio = (isMe && profile.bio) ? profile.bio : member.profiles?.bio;
              const phone = (isMe && profile.phone_number) ? profile.phone_number : member.profiles?.phone_number;
              const isStudentVerified = (isMe && profile.is_student_verified) ? profile.is_student_verified : member.profiles?.is_student_verified;
              const canDirectContact = (isJoined || isCreator) && !isMe;

              return (
                <div
                  key={member.user_id || i}
                  className={`flex items-center justify-between px-3 py-2.5 ${bg} border ${border} rounded-2xl`}
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => setSelectedUser({
                      user_id: member.user_id,
                      display_name: displayName,
                      avatar_url: avatar,
                      reg_no: regNo,
                      gender: gender,
                      bio: bio,
                      phone_number: (canDirectContact || isMe) ? phone : undefined,
                      is_student_verified: isStudentVerified,
                    })}
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
                        {member.user_id === selectedLoop.creator_id && selectedLoop.is_driver_offering ? (
                          <span className="text-[8px] bg-[#FFC554]/15 border border-[#FFC554]/25 text-[#FFC554] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                            Driver
                          </span>
                        ) : member.user_id === selectedLoop.creator_id ? (
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
                              href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hey ${displayName}, reaching out regarding our LOOP ride to ${selectedLoop?.destination || "our destination"}.`)}`}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMember(member.user_id);
                        }}
                        aria-label="Remove member"
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center active:scale-90 ml-1 transition-colors"
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

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {isPast ? (
          <button
            onClick={() => setView("past-loops")}
            className={`w-full py-3.5 ${cardBg} border ${border} rounded-[22px] text-xs font-black uppercase tracking-wider active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm`}
          >
            <ArrowLeft size={16} />
            Back to Ride History
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                triggerHaptic(12);
                if (isJoined) enterChat();
                else joinLoop(selectedLoop);
              }}
              disabled={isJoining}
              className="w-full h-12 bg-[#FFC554] text-black font-black rounded-[22px] text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 active:scale-[0.98]"
            >
              {isJoining ? "Joining..." : isJoined ? "Open Chat" : "Join Loop"}
            </button>

            {/* WhatsApp / Social Share */}
            <button
              onClick={handleShareLoop}
              className="w-full py-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] font-black text-[10px] uppercase tracking-[0.2em] rounded-[20px] active:scale-[0.98] flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Share2 size={13} strokeWidth={2.5} />
              Share Loop (WhatsApp / Friends)
            </button>

            {isCreator && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className={`w-full py-3 ${cardBg} border border-[#FFC554]/30 hover:border-[#FFC554]/60 rounded-[20px] text-[#FFC554] font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-colors shadow-sm`}
              >
                <Edit3 size={13} strokeWidth={2.5} />
                Edit Ride Details
              </button>
            )}

            {isCreator && selectedLoop.purpose !== "return" && (
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setCreatePrefill({
                    startPoint: selectedLoop.destination,
                    destination: selectedLoop.start_point,
                    isReturn: true,
                  });
                  setView("create");
                }}
                className={`w-full py-3 ${cardBg} border border-indigo-500/30 hover:border-indigo-500/60 rounded-[20px] text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-colors shadow-sm`}
              >
                <Repeat size={13} strokeWidth={2.5} />
                Plan Return Ride
              </button>
            )}

            {isCreator && (
              showDeleteConfirm ? (
                <div className="flex gap-2 animate-fade-in">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className={`flex-1 py-3 ${cardBg} border ${border} rounded-[20px] text-xs font-bold text-zinc-400 active:scale-[0.98] disabled:opacity-50`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      deleteLoop(selectedLoop.id);
                    }}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-[20px] active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Trash2 size={13} strokeWidth={2.5} className={isDeleting ? "animate-spin" : ""} />
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className={`w-full py-3 ${cardBg} border ${border} rounded-[20px] text-red-400 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50`}
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  Delete Loop
                </button>
              )
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
          </>
        )}
      </div>

      <UserProfileModal user={selectedUser} isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} />

      {selectedLoop && (
        <EditLoopModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          loop={selectedLoop}
          currentMemberCount={loopMembers.length}
          onUpdated={(updated) => {
            setSelectedLoop(updated);
            fetchLoops(true);
          }}
        />
      )}
    </div>
  );
}
