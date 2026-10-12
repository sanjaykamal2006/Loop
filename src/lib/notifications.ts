import { triggerHaptic } from "./haptics";
import { logger } from "./logger";

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export function isNotificationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("loop_notifications_enabled");
  if (stored === "false") return false;
  if (!isNotificationSupported()) return false;
  return Notification.permission === "granted";
}

export function setNotificationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("loop_notifications_enabled", enabled ? "true" : "false");
}

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio("https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Proactively warm the App Shell cache with all currently loaded Next.js JS/CSS chunks
    // so even on a user's very first session (without refreshing), closing & reopening in Airplane Mode hydrates React
    const warmAppShell = async () => {
      try {
        const assetUrls = new Set<string>(["/", "/manifest.webmanifest", window.location.pathname]);
        document
          .querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[rel="stylesheet"][href]')
          .forEach((el) => {
            const rawUrl = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
            if (rawUrl && rawUrl.startsWith(window.location.origin)) {
              assetUrls.add(rawUrl);
            }
          });
        const urls = Array.from(assetUrls);

        if ("caches" in window) {
          const cache = await window.caches.open("loop-app-shell-v2");
          await Promise.allSettled(
            urls.map(async (u) => {
              const existing = await cache.match(u);
              if (!existing) {
                const res = await fetch(u);
                if (res && res.status === 200) {
                  await cache.put(u, res);
                }
              }
            })
          );
        }

        const activeWorker =
          registration.active || registration.waiting || registration.installing || navigator.serviceWorker.controller;
        if (activeWorker) {
          activeWorker.postMessage({ type: "WARM_APP_SHELL", urls });
        }
      } catch {}
    };

    warmAppShell();
    return registration;
  } catch (err) {
    logger.warn("Service Worker registration failed:", err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  reason?: "ios_not_pwa" | "blocked" | "unsupported" | "denied" | "default" | "error";
}> {
  if (typeof window === "undefined") {
    return { granted: false, reason: "unsupported" };
  }

  // On iOS Safari, web notifications strictly require PWA mode (Add to Home Screen)
  if (isIOS() && !isStandalonePWA()) {
    return { granted: false, reason: "ios_not_pwa" };
  }

  if (!("Notification" in window)) {
    return { granted: false, reason: "unsupported" };
  }

  if (Notification.permission === "denied") {
    return { granted: false, reason: "blocked" };
  }

  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setNotificationEnabled(true);
      triggerHaptic(20);
      registerServiceWorker();
      return { granted: true };
    }
    return { granted: false, reason: result as any };
  } catch (err) {
    logger.error("Error requesting notification permission:", err);
    return { granted: false, reason: "error" };
  }
}

export async function sendLocalNotification(
  title: string,
  options?: NotificationOptions & { url?: string }
): Promise<boolean> {
  if (!isNotificationEnabled()) {
    return false;
  }

  // Always trigger sound and tactile haptic feedback
  playNotificationSound();
  triggerHaptic(25);

  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const defaultOptions: any = {
    icon: "/logo.png",
    badge: "/icon.png",
    vibrate: [100, 50, 100],
    ...options,
  };

  // 1. Try Service Worker with 600ms timeout to avoid hanging
  if ("serviceWorker" in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        const timeoutPromise = new Promise<undefined>((r) => setTimeout(() => r(undefined), 600));
        reg = await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
      }

      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          options: defaultOptions,
        });
        return true;
      }
    } catch (err) {
      logger.warn("SW notification attempt failed:", err);
    }
  }

  // 2. Fallback to standard browser Notification constructor
  try {
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    logger.warn("Standard Notification constructor failed:", err);
    return false;
  }
}
