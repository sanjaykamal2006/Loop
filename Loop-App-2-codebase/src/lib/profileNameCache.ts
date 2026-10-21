"use client";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * Dedupes display-name lookups fired by realtime message handlers: the same
 * incoming INSERT used to be profile-fetched once by the unread handler
 * (useLoopDirectory) and again by the chat-list preview handler
 * (ChatListView). With this cache every sender id costs at most one profile
 * read per five minutes.
 */
const NAME_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { name: string; at: number }>();

export async function getProfileDisplayName(userId: string): Promise<string | null> {
  if (!userId) return null;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < NAME_TTL_MS) return hit.name || null;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = data?.display_name ?? null;
    cache.set(userId, { name: name ?? "", at: Date.now() });
    return name;
  } catch (err) {
    logger.error("profileNameCache lookup failed:", err);
    // Stale but known beats unknown when the network hiccups mid-toast.
    return hit?.name ?? null;
  }
}

export function clearProfileNameCache(): void {
  cache.clear();
}
