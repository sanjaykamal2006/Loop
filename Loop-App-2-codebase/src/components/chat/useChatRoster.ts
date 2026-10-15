"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { toast } from "@/components/ui/NativeToast";
import type { Loop, LoopMember, Profile, View } from "@/lib/types";
import type { Session } from "@supabase/supabase-js";
import type { UserProfileData } from "@/components/sections/UserProfileModal";

interface UseChatRosterOptions {
  session: Session;
  selectedLoop: Loop | null;
  setSelectedLoop: (loop: Loop | null) => void;
  profile: Profile;
  userJoinedLoops: string[];
  userLoops: string[];
  setView: (view: View) => void;
}

export function useChatRoster({
  session,
  selectedLoop,
  setSelectedLoop,
  profile,
  userJoinedLoops,
  userLoops,
  setView,
}: UseChatRosterOptions) {
  const [members, setMembers] = useState<LoopMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);

  const fetchMembers = useCallback(
    async (loopId: string) => {
      try {
        const { data: memberRows, error: memErr } = await supabase
          .from("loop_members")
          .select("user_id")
          .eq("loop_id", loopId);

        if (memErr) {
          logger.warn("fetchMembers query error:", memErr);
          return;
        }

        const rawMemberRows = memberRows || [];
        const userIds = Array.from(new Set(rawMemberRows.map((r: { user_id: string }) => r.user_id)));

        if (!selectedLoop) return;
        const isCreator = selectedLoop.creator_id === session?.user?.id || userLoops.includes(selectedLoop.id);
        const isMember = userIds.includes(session?.user?.id) || userJoinedLoops.includes(selectedLoop.id);

        if (!isCreator && !isMember) {
          const { data: checkRow } = await supabase
            .from("loop_members")
            .select("id")
            .eq("loop_id", loopId)
            .eq("user_id", session?.user?.id)
            .maybeSingle();

          if (!checkRow) {
            toast.info("You must join this loop to view its chat");
            setView("home");
            setSelectedLoop(null);
            return;
          }
          if (session?.user?.id && !userIds.includes(session.user.id)) {
            userIds.push(session.user.id);
          }
        } else if (session?.user?.id && !userIds.includes(session.user.id)) {
          userIds.push(session.user.id);
        }

        const [{ data: profs }, { data: contacts }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, avatar_url, reg_no, gender, bio, is_student_verified")
            .in("id", userIds),
          supabase.rpc("get_loop_contacts", { target_loop_id: loopId }),
        ]);

        type ProfileData = {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          reg_no: string | null;
          gender: string | null;
          bio: string | null;
          is_student_verified: boolean | null;
        };

        const profMap: Record<string, ProfileData> = {};
        if (profs) {
          (profs as ProfileData[]).forEach((p) => {
            profMap[p.id] = p;
          });
        }

        const contactsMap = new Map<string, string>();
        if (contacts && Array.isArray(contacts)) {
          (contacts as { user_id?: string; phone_number?: string }[]).forEach((c) => {
            if (c.user_id && c.phone_number) {
              contactsMap.set(c.user_id, c.phone_number);
            }
          });
        }

        const memberList: { user_id: string }[] = [...rawMemberRows];
        if (session?.user?.id && !memberList.some((r) => r.user_id === session.user.id)) {
          memberList.push({ user_id: session.user.id });
        }

        const formatted = memberList.map((r) => {
          const isMe = r.user_id === session.user.id;
          const fetchedProf = profMap[r.user_id] || {};
          const contactPhone = contactsMap.get(r.user_id) || "";
          return {
            user_id: r.user_id,
            profiles: {
              display_name: isMe
                ? profile.display_name || fetchedProf.display_name || "You"
                : fetchedProf.display_name || "Member",
              avatar_url: isMe ? profile.avatar_url || fetchedProf.avatar_url : fetchedProf.avatar_url,
              reg_no: isMe ? profile.reg_no || fetchedProf.reg_no : fetchedProf.reg_no,
              gender: isMe ? profile.gender || fetchedProf.gender : fetchedProf.gender,
              bio: isMe ? profile.bio || fetchedProf.bio : fetchedProf.bio,
              phone_number: isMe ? profile.phone_number || contactPhone : contactPhone,
              is_student_verified: isMe ? profile.is_student_verified : fetchedProf.is_student_verified,
            },
          };
        });

        setMembers(formatted);
      } catch (e) {
        logger.error("fetchMembers error:", e);
      }
    },
    [selectedLoop, session?.user?.id, userLoops, userJoinedLoops, setView, setSelectedLoop, profile]
  );

  return {
    members,
    setMembers,
    selectedUser,
    setSelectedUser,
    fetchMembers,
  };
}
