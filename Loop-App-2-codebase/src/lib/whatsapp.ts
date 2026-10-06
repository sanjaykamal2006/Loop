import { sanitizeIndianPhoneNumber } from "./utils";

export interface WhatsAppOptions {
  phone?: string;
  text?: string;
}

/**
 * Returns true if the client environment is a mobile device (iOS/Android).
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Generates the optimal WhatsApp URL:
 * - On mobile (iOS / Android), uses the custom 'whatsapp://send' protocol scheme
 *   so the mobile OS switches directly to the native WhatsApp app without opening a browser tab.
 * - On desktop, falls back to Web WhatsApp ('https://web.whatsapp.com/send').
 */
export function getWhatsAppUrl({ phone, text }: WhatsAppOptions): string {
  const clean = phone ? sanitizeIndianPhoneNumber(phone) : "";
  const phoneParam = clean ? `91${clean}` : "";
  const encodedText = text ? encodeURIComponent(text) : "";

  if (isMobileDevice()) {
    return phoneParam
      ? `whatsapp://send?phone=${phoneParam}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
  }

  return phoneParam
    ? `https://web.whatsapp.com/send?phone=${phoneParam}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Opens WhatsApp directly:
 * - On mobile, navigates window.location.href to 'whatsapp://' to immediately launch
 *   the native app without opening a blank/loading browser tab.
 * - On desktop, opens web.whatsapp.com in a new tab.
 */
export function openWhatsApp(options: WhatsAppOptions): void {
  if (typeof window === "undefined") return;

  const url = getWhatsAppUrl(options);

  if (isMobileDevice()) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
