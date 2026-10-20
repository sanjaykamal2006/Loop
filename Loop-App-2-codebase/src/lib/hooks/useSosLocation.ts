"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

export interface SosLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface UseSosLocation {
  location: SosLocation | null;
  isLocating: boolean;
  locError: string | null;
}

/**
 * Fetches a fresh GPS fix every time the SOS modal opens.
 *
 * Previously SosModal kept `location` state across opens, so a stale fix from a
 * prior session could be sent in an emergency message. This hook guarantees a
 * clean slate on each open: it resets location + error immediately and only
 * stores coordinates from the current open session.
 */
export function useSosLocation(isOpen = true): UseSosLocation {
  const [location, setLocation] = useState<SosLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Clean-slate guarantee: never leak coordinates from a previous session.
    setLocation(null);
    setLocError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("GPS not supported on this device");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsLocating(false);
      },
      (err) => {
        logger.warn("SOS Geolocation error:", err);
        setLocError("Could not retrieve GPS pin. Sharing ride details.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [isOpen]);

  return { location, isLocating, locError };
}
