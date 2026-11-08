import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import type { Database } from "./database.types";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface SendPushOptions {
  userIds: string[];
  payload: PushPayload;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  pruned: number;
}

/**
 * Configure VAPID details for web-push library using environment variables.
 * Returns true if configured properly, false otherwise.
 */
export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@loop-vitap.edu";

  if (!publicKey || !privateKey) {
    logger.warn("Web Push VAPID keys not configured. Skipping push send.");
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (err) {
    logger.error("Failed to configure Web Push VAPID details:", err);
    return false;
  }
}

/**
 * Server-side Web Push dispatcher.
 * Dispatches encrypted Web Push notifications to all active subscriptions of target users.
 * Automatically prunes expired (404/410) subscriptions from the database.
 */
export async function sendWebPushNotification({
  userIds,
  payload,
}: SendPushOptions): Promise<SendPushResult> {
  const result: SendPushResult = { sent: 0, failed: 0, pruned: 0 };

  if (!userIds || userIds.length === 0) {
    return result;
  }

  const isConfigured = configureWebPush();
  if (!isConfigured) {
    return result;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error("Supabase service role credentials not configured for web push");
    return result;
  }

  const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey);

  // Fetch all subscriptions for the target users
  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (error || !subscriptions || subscriptions.length === 0) {
    if (error) {
      logger.error("Failed to query push_subscriptions:", error.message);
    }
    return result;
  }

  const stringPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag,
  });

  const endpointsToPrune: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, stringPayload);
        result.sent++;
      } catch (pushErr: unknown) {
        result.failed++;
        const statusCode = (pushErr as { statusCode?: number })?.statusCode;
        // 404 or 410 Gone means the subscription has expired or was revoked by the user/browser
        if (statusCode === 404 || statusCode === 410) {
          endpointsToPrune.push(sub.endpoint);
        } else {
          logger.warn(`Push delivery failed for user ${sub.user_id}:`, pushErr);
        }
      }
    })
  );

  // Prune dead subscriptions in batch
  if (endpointsToPrune.length > 0) {
    const { error: pruneError } = await adminClient
      .from("push_subscriptions")
      .delete()
      .in("endpoint", endpointsToPrune);

    if (pruneError) {
      logger.warn("Failed to prune expired push subscriptions:", pruneError.message);
    } else {
      result.pruned = endpointsToPrune.length;
    }
  }

  return result;
}
