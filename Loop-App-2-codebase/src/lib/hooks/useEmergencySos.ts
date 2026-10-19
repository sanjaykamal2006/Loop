"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { triggerHaptic } from "@/lib/haptics";
import type { Session } from "@supabase/supabase-js";
import type { Loop, EmergencyContact } from "@/lib/types";

interface UseEmergencySosOptions {
  session: Session;
  activeLoops: Loop[];
  userJoinedLoops: string[];
  userLoops: string[];
  selectedLoop: Loop | null;
}

export function useEmergencySos({
  session,
  activeLoops,
  userJoinedLoops,
  userLoops,
  selectedLoop,
}: UseEmergencySosOptions) {
  // Emergency SOS & Safety (Up to 3 Contacts)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedList = localStorage.getItem(`loop_emergency_contacts_${session.user.id}`);
        if (cachedList) {
          const parsed = JSON.parse(cachedList);
          if (Array.isArray(parsed)) return parsed.slice(0, 3);
        }
        // Backward compatibility migration from single contact
        const singleCached = localStorage.getItem(`loop_emergency_contact_${session.user.id}`);
        if (singleCached) {
          const parsedSingle = JSON.parse(singleCached);
          if (parsedSingle && parsedSingle.phone) {
            return [{ ...parsedSingle, id: parsedSingle.id || "c-1" }];
          }
        }
      } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
    }
    return [];
  });
  const [showSosModal, setShowSosModal] = useState(false);
  const [showEmergencyContactModal, setShowEmergencyContactModal] = useState(false);

  const fetchEmergencyContacts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("id, name, phone, relation")
        .order("created_at", { ascending: true })
        .limit(3);

      if (!error) {
        if (data && data.length > 0) {
          setEmergencyContacts(data);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(data));
            } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
          }
        } else if (typeof window !== "undefined") {
          // If cloud table was just created, sync any existing local contacts up to the database
          const cached = localStorage.getItem(`loop_emergency_contacts_${session.user.id}`);
          if (cached) {
            try {
              const localList: EmergencyContact[] = JSON.parse(cached);
              if (Array.isArray(localList) && localList.length > 0) {
                const payload = localList.slice(0, 3).map((c) => ({
                  user_id: session.user.id,
                  name: c.name.trim(),
                  phone: c.phone.trim(),
                  relation: c.relation || "Parent",
                }));
                const { data: inserted, error: insertError } = await supabase
                  .from("emergency_contacts")
                  .insert(payload)
                  .select("id, name, phone, relation");

                if (!insertError && inserted && inserted.length > 0) {
                  setEmergencyContacts(inserted);
                  localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(inserted));
                }
              }
            } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
          }
        }
      }
    } catch {
      // Offline fallback: continue with localStorage
    }
  }, [session.user.id]);

  useEffect(() => {
    fetchEmergencyContacts();
  }, [fetchEmergencyContacts]);

  const saveEmergencyContacts = useCallback(
    async (contacts: EmergencyContact[]) => {
      const trimmed = contacts.slice(0, 3);
      setEmergencyContacts(trimmed);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(trimmed));
          if (trimmed.length > 0) {
            localStorage.setItem(`loop_emergency_contact_${session.user.id}`, JSON.stringify(trimmed[0]));
          } else {
            localStorage.removeItem(`loop_emergency_contact_${session.user.id}`);
          }
        } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
      }

      // Safe Cloud Synchronization (Atomic RPC with safe non-destructive fallback)
      try {
        const payload = trimmed.map((c) => ({
          name: c.name.trim(),
          phone: c.phone.trim(),
          relation: c.relation || "Parent",
        }));

        // 1. Attempt atomic stored procedure (executes within single DB transaction)
        const { data: rpcData, error: rpcError } = await supabase.rpc("sync_emergency_contacts", {
          contacts_payload: payload,
        });

        if (!rpcError && rpcData) {
          setEmergencyContacts(rpcData as unknown as EmergencyContact[]);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(rpcData));
            } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
          }
          return;
        }

        // 2. Fallback: Safe differential sync (inserts before deleting old IDs)
        const { data: existing } = await supabase
          .from("emergency_contacts")
          .select("id")
          .eq("user_id", session.user.id);

        const existingIds = (existing || []).map((e: { id: string }) => e.id);

        if (trimmed.length > 0) {
          const insertPayload = trimmed.map((c) => ({
            user_id: session.user.id,
            name: c.name.trim(),
            phone: c.phone.trim(),
            relation: c.relation || "Parent",
          }));
          const { data: inserted, error: insertError } = await supabase
            .from("emergency_contacts")
            .insert(insertPayload)
            .select("id, name, phone, relation");

          if (!insertError && inserted && inserted.length > 0) {
            if (existingIds.length > 0) {
              await supabase.from("emergency_contacts").delete().in("id", existingIds);
            }
            setEmergencyContacts(inserted as EmergencyContact[]);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(`loop_emergency_contacts_${session.user.id}`, JSON.stringify(inserted));
              } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
            }
          }
        } else if (existingIds.length > 0) {
          await supabase.from("emergency_contacts").delete().in("id", existingIds);
        }
      } catch (dbErr) {
        logger.warn("Emergency contacts database sync notice:", dbErr);
      }
    },
    [session.user.id]
  );

  const saveEmergencyContact = useCallback(
    (contact: EmergencyContact | null) => {
      if (contact) {
        saveEmergencyContacts([contact]);
      } else {
        saveEmergencyContacts([]);
      }
    },
    [saveEmergencyContacts]
  );

  const emergencyContact = emergencyContacts[0] || null;

  const triggerSos = useCallback(() => {
    triggerHaptic(20);
    setShowSosModal(true);
  }, []);

  // State-Leased Client Emergency Buffer: automatically provision local manifest lease
  // when user has an active joined/created loop, and purge when ride ends or user leaves
  useEffect(() => {
    if (typeof window === "undefined" || !session?.user?.id) return;
    const leaseKey = `loop_manifest_lease_${session.user.id}`;
    try {
      const activeUserLoop =
        (selectedLoop && (userJoinedLoops.includes(selectedLoop.id) || userLoops.includes(selectedLoop.id))
          ? selectedLoop
          : null) ||
        activeLoops.find((l) => userJoinedLoops.includes(l.id) || userLoops.includes(l.id)) ||
        null;

      if (activeUserLoop) {
        const depTimeMs = new Date(activeUserLoop.departure_time).getTime();
        const leaseTtlMs = Number.isFinite(depTimeMs) ? depTimeMs + 5 * 60 * 60 * 1000 : Date.now() + 5 * 60 * 60 * 1000;
        if (Date.now() < leaseTtlMs) {
          localStorage.setItem(
            leaseKey,
            JSON.stringify({
              ...activeUserLoop,
              lease_ttl: leaseTtlMs,
            })
          );
          return;
        }
      }
      localStorage.removeItem(leaseKey);
    } catch (err) { logger.error("src/lib/hooks/useEmergencySos.ts: swallowed non-fatal error", err); }
  }, [activeLoops, userJoinedLoops, userLoops, selectedLoop, session?.user?.id]);

  return {
    emergencyContact,
    emergencyContacts,
    saveEmergencyContact,
    saveEmergencyContacts,
    showSosModal,
    setShowSosModal,
    showEmergencyContactModal,
    setShowEmergencyContactModal,
    triggerSos,
  };
}
