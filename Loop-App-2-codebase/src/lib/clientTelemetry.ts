"use client";

import { logger, type StructuredLogEntry } from "@/lib/logger";

const MAX_REPORTS_PER_SESSION = 20;
const DEDUPE_WINDOW_MS = 60_000;

let reportsSent = 0;
let installed = false;
const lastSeen = new Map<string, number>();

/**
 * Best-effort client error sink. Forwards errors to /api/telemetry, where the
 * server writes them as structured JSON into the hosting provider's logs.
 * Free, first-party, and deliberately capped so a render loop cannot flood it.
 */
export function reportClientError(entry: StructuredLogEntry): void {
  if (typeof window === "undefined") return;
  if (reportsSent >= MAX_REPORTS_PER_SESSION) return;

  const signature = `${entry.message}|${entry.error?.message ?? ""}|${entry.error?.digest ?? ""}`;
  const now = Date.now();
  const last = lastSeen.get(signature) ?? 0;
  if (now - last < DEDUPE_WINDOW_MS) return;
  lastSeen.set(signature, now);
  reportsSent += 1;

  const body = JSON.stringify({
    message: entry.message,
    name: entry.error?.name,
    stack: entry.error?.stack,
    digest: entry.error?.digest,
    path: window.location.pathname,
    timestamp: entry.timestamp,
  });

  try {
    if (typeof navigator.sendBeacon === "function") {
      // text/plain keeps this a CORS-safelisted beacon; the route accepts it.
      navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "text/plain" }));
    } else {
      void fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let telemetry failures affect the user experience.
  }
}

/** Catches errors React boundaries cannot see (async listeners, timers, promises). */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    logger.error("Unhandled window error", event.error ?? event.message);
    reportClientError({
      level: "error",
      message: "Unhandled window error: " + (event.error?.name ?? "Error"),
      timestamp: new Date().toISOString(),
      error: {
        name: event.error?.name ?? "Error",
        message: String(event.error?.message ?? event.message ?? "unknown"),
        stack: event.error?.stack,
        digest: (event.error as { digest?: string } | undefined)?.digest,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection", event.reason);
    const reason = event.reason as { name?: string; message?: string; stack?: string; digest?: string } | undefined;
    reportClientError({
      level: "error",
      message: "Unhandled promise rejection: " + (reason?.name ?? "Error"),
      timestamp: new Date().toISOString(),
      error: {
        name: reason?.name ?? "Error",
        message: String(reason?.message ?? "unknown rejection"),
        stack: reason?.stack,
        digest: reason?.digest,
      },
    });
  });
}
