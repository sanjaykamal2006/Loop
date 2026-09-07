import { triggerHaptic } from "./haptics";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("Service Worker registration failed:", err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      triggerHaptic(15);
      // Try to register service worker if not already registered
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

export async function sendLocalNotification(
  title: string,
  options?: NotificationOptions & { url?: string }
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  triggerHaptic(20);

  const defaultOptions: NotificationOptions = {
    icon: "/logo.png",
    badge: "/icon.png",
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, defaultOptions);
        return true;
      }
    }

    // Fallback to standard Notification constructor
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn("Error displaying notification:", err);
    return false;
  }
}
