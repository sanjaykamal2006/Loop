"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useLoop } from "@/lib/LoopContext";
import { MapPin, Clock, XCircle, CheckCircle2, Shield, Repeat, Users } from "lucide-react";
import { toast } from "@/components/ui/NativeToast";
import type { LoopMember } from "@/lib/types";
import UserProfileModal, { UserProfileData } from "./UserProfileModal";
import EditLoopModal from "./EditLoopModal";
import { triggerHaptic } from "@/lib/haptics";
import { formatDepartureFull } from "@/lib/dateFormatter";
import { LRUCache } from "@/lib/cache";
import { openWhatsApp } from "@/lib/whatsapp";
import { FareSplitterCard } from "@/components/ride/FareSplitterCard";
import { PassengerList } from "@/components/ride/PassengerList";
import { RideActionButtons } from "@/components/ride/RideActionButtons";

const membersCache = new LRUCache<string, LoopMember[]>({ maxSize: 30 });

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
    theme,
    setChatSource,
    setCreatePrefill,
    triggerSos,
    emergencyContacts = [],
    setShowTermsModal,
  } = useLoop();
  const { isDark, border, cardBg, mutedText } = theme;

  const getOfflineFallbackMembers = useCallback((loopId?: string): LoopMember[] => {
    if (!loopId) return [];
    const fromMem = membersCache.get(loopId);
    if (fromMem && fromMem.length > 0) return fromMem;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`loop_members_${loopId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (err) { logger.error("src/components/sections/RideDetailsView.tsx: swallowed non-fatal error", err); }
    }
    if (selectedLoop && (selectedLoop.creator_id === session?.user?.id || userLoops.includes(loopId))) {
      return [
        {
          user_id: session?.user?.id || selectedLoop.creator_id || "creator",
          profiles: {
            display_name: profile.display_name || selectedLoop.creator?.display_name || "You",
            avatar_url: profile.avatar_url || selectedLoop.creator?.avatar_url,
            gender: profile.gender || "",
            reg_no: profile.reg_no || selectedLoop.creator?.reg_no,
            bio: profile.bio,
            phone_number: profile.phone_number,
            is_student_verified: profile.is_student_verified,
          },
        },
      ];
    }
    return [];
  }, [selectedLoop, session?.user?.id, userLoops, profile]);

  const [loopMembers, setLoopMembers] = useState<LoopMember[]>(() =>
    getOfflineFallbackMembers(selectedLoop?.id)
  );
  const [isLoadingMembers, setIsLoadingMembers] = useState(() => {
    return getOfflineFallbackMembers(selectedLoop?.id).length === 0;
  });
  const [fareInput, setFareInput] = useState<string>("");
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTimePast = useMemo(() => {
    return selectedLoop?.departure_time
      ? new Date(selectedLoop.departure_time).getTime() < Date.now()
      : false;
  }, [selectedLoop?.departure_time]);

  const isPast =
    selectedLoop?.status === "ended" ||
    selectedLoop?.status === "cancelled" ||
    isTimePast;

  useEffect(() => {
    if (selectedLoop) {
      setFareInput(selectedLoop.total_fare?.toString() || "");
    }
  }, [selectedLoop, selectedLoop?.total_fare]);

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

  const fetchLoopMembers = useCallback(async (loopId: string) => {
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
          contactsRes.data.forEach((c) => {
            if (c.user_id && c.phone_number) {
              contactsMap.set(c.user_id, c.phone_number);
            }
          });
        }

        const mems = (membersRes.data as unknown as LoopMember[]).map((m) => {
          const phone = contactsMap.get(m.user_id) || "";
          return {
            ...m,
            profiles: m.profiles
              ? {
                  ...m.profiles,
                  phone_number: phone,
                }
              : null,
          };
        });

        membersCache.set(loopId, mems);
        setLoopMembers(mems);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`loop_members_${loopId}`, JSON.stringify(mems));
          } catch (err) { logger.error("src/components/sections/RideDetailsView.tsx: swallowed non-fatal error", err); }
        }
      }
    } catch (err) {
      logger.error("fetchLoopMembers error:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [selectedLoop, session?.user?.id, userLoops, userJoinedLoops]);

  useEffect(() => {
    if (!selectedLoop?.id) return;
    const loopId = selectedLoop.id;
    const cached = getOfflineFallbackMembers(loopId);
    if (cached.length > 0) {
      setLoopMembers(cached);
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
  }, [selectedLoop?.id, fetchLoopMembers, getOfflineFallbackMembers]);


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
      : `https://loop-app.runs-on.dev/?loop=${selectedLoop.id}`;

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
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    openWhatsApp({ text });
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

      {/* Female-Only Ride Banner */}
      {selectedLoop.is_female_only && (
        <div className="p-3.5 rounded-[24px] bg-pink-500/10 border border-pink-500/30 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
            <Users size={16} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-pink-400">Female-Only Ride</span>
            <p className="text-[10px] text-pink-300/80 font-medium leading-relaxed mt-0.5">
              Based on self-reported gender at signup. Not independently verified.
            </p>
          </div>
        </div>
      )}

      {/* Destination Card */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className={`w-9 h-9 rounded-xl ${isDark ? "bg-[#FFC554]/10 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"} flex items-center justify-center`}>
          <MapPin size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Destination</p>
            {selectedLoop.purpose === "return" && isCreator && (
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/35 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <Repeat size={10} strokeWidth={2.5} />
                <span>Return Ride</span>
              </span>
            )}
          </div>
          <h3 className="font-black text-base uppercase tracking-tight">{selectedLoop.destination}</h3>
        </div>
      </div>

      {/* Starting Time / Schedule Card */}
      <div className={`p-4 ${cardBg} border ${border} rounded-[28px] flex items-center gap-4`}>
        <div className={`w-9 h-9 rounded-xl ${isDark ? "bg-[#FFC554]/10 text-[#FFC554]" : "bg-[#881337]/10 text-[#881337]"} flex items-center justify-center`}>
          <Clock size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-[10px] font-black ${mutedText} uppercase tracking-wider`}>Schedule</p>
          <h3 className={`font-black text-base sm:text-lg ${isDark ? "text-[#FFC554]" : "text-[#881337]"}`}>
            {formatDepartureFull(selectedLoop.departure_time)}
          </h3>
        </div>
      </div>

      {/* Fare Splitter or Student Driver Personal Ride Info */}
      <FareSplitterCard
        loop={selectedLoop}
        isCreator={isCreator}
        isPast={isPast}
        memberCount={loopMembers.length}
        fareInput={fareInput}
        setFareInput={setFareInput}
        isEditingFare={isEditingFare}
        setIsEditingFare={setIsEditingFare}
        onSaveFare={saveTotalFare}
        theme={theme}
      />

      {/* Peer-to-Peer Non-Commercial Safety Disclaimer */}
      <div className="flex items-center justify-between px-2.5 py-0.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500">
          <Shield size={11} className="text-[#FFC554]/70 shrink-0" />
          <span>Peer-to-peer non-commercial cost sharing</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="text-[9px] font-black text-[#FFC554] underline hover:opacity-80 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          Safety Policy
        </button>
      </div>

      {/* Passengers Roster */}
      <PassengerList
        loop={selectedLoop}
        loopMembers={loopMembers}
        isLoadingMembers={isLoadingMembers}
        sessionUserId={session.user.id}
        profile={profile}
        isCreator={isCreator}
        isJoined={isJoined}
        isPast={isPast}
        onSelectUser={setSelectedUser}
        onRemoveMember={removeMember}
        theme={theme}
      />

      {/* Bottom Action Buttons */}
      <RideActionButtons
        loop={selectedLoop}
        isPast={isPast}
        isCreator={isCreator}
        isJoined={isJoined}
        isJoining={isJoining}
        isDeleting={isDeleting}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        emergencyContactsCount={emergencyContacts.length}
        onJoin={() => joinLoop(selectedLoop)}
        onEnterChat={enterChat}
        onShareLoop={handleShareLoop}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onPlanReturnRide={() => {
          triggerHaptic(10);
          setCreatePrefill({
            startPoint: selectedLoop.destination,
            destination: selectedLoop.start_point || undefined,
            isReturn: true,
          });
          setView("create");
        }}
        onTriggerSos={triggerSos}
        onDeleteLoop={() => deleteLoop(selectedLoop.id)}
        onLeaveLoop={() => leaveLoop(selectedLoop.id)}
        onBackToHistory={() => setView("past-loops")}
        theme={theme}
      />

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
