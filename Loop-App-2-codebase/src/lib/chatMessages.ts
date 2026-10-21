"use client";

import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type InsertedMessageRow = Database["public"]["Tables"]["messages"]["Row"];

/**
 * The one client-side INSERT path into public.messages.
 *
 * User texts and location shares (useChatRoom) and system announcements
 * (EditLoopModal host updates, ReturnTripModal notices) all funnel through
 * here, so the DB-side fair-use caps and the messages RLS policies behave
 * identically for every writer. The server-side account-deletion notice in
 * src/app/api/account/delete/route.ts keeps its own service-role insert —
 * different trust context, deliberately not shared.
 */

/** Shared select list for message reads (fetch, pagination, fallbacks). */
export const MESSAGE_SELECT_COLUMNS =
  "id, loop_id, user_id, content, created_at, edited_at, reactions, profiles!fk_messages_profiles (display_name, avatar_url, reg_no, gender, bio)";

/** PostgREST error shape kept minimal on purpose (only `.message` is consumed). */
export interface InsertMessageError {
  message: string;
}

export async function insertChatMessage(opts: {
  loopId: string;
  /** `user_id` is nullable only for server-side system rows; client callers always send a user. */
  userId: string | null;
  content: string;
}): Promise<{ data: InsertedMessageRow | null; error: InsertMessageError | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ loop_id: opts.loopId, user_id: opts.userId, content: opts.content })
    .select("id, loop_id, user_id, content, created_at, reactions")
    .single();

  if (error && data === null) {
    // Supabase returns `error` with `data: null`; normalize to the shared shape.
    return { data: null, error: { message: error.message } };
  }
  return { data: (data as unknown as InsertedMessageRow | null), error: null };
}

/**
 * Fire-and-forget announcement writer for system messages posted outside the
 * chat room (host updates, return-trip announcements). Failures are logged,
 * never thrown and never toasted — an announcement must never be allowed to
 * fail the surrounding ride action.
 */
export async function postChatAnnouncement(
  loopId: string,
  userId: string,
  content: string
): Promise<void> {
  const { error } = await insertChatMessage({ loopId, userId, content });
  if (error) {
    logger.warn(`chat announcement could not be posted: ${error.message}`);
  }
}
