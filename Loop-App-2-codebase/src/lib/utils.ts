export type ClassValue = string | boolean | undefined | null | number;

export function cn(...inputs: (ClassValue | unknown)[]) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Normalizes Indian phone numbers from messy paste or input values
 * (e.g. "+91 88256 80623", "08825680623", "+91-88256-80623", "91 88256 80623").
 * Returns clean 10-digit phone number string.
 */
export function sanitizeIndianPhoneNumber(input: string): string {
  if (!input) return "";

  // Remove all non-digits (spaces, hyphens, plus, parenthesis, hidden Unicode marks)
  let digits = input.replace(/\D/g, "");

  // Handle international prefix 0091
  if (digits.length > 12 && digits.startsWith("0091")) {
    digits = digits.slice(4);
  }

  // Handle country code 91 if total length is greater than 10
  // (Prevents stripping 91 from valid 10-digit numbers starting with 91, e.g. 9123456789)
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // Handle leading 0 (trunk prefix) if total length is greater than 10
  while (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Limit to maximum 10 digits
  return digits.slice(0, 10);
}

/**
 * Safely extracts genuine Google Maps location URLs from message content.
 * Prevents open-redirect / phishing where attacker inputs like "google.com/maps https://evil.com"
 * would mistakenly render as trusted green Google Maps cards.
 */
export function getMapsUrlFromMessage(content: string): string | null {
  if (!content) return null;

  // 1. Direct coordinate format extraction (?q=lat,lng or ?query=lat,lng)
  const coordsMatch = content.match(/[?&]q=([-0-9.]+),([-0-9.]+)/) || content.match(/[?&]query=([-0-9.]+),([-0-9.]+)/);
  if (coordsMatch) {
    return `https://maps.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}`;
  }

  // 2. Strict URL validation
  const urlMatch = content.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    try {
      const parsed = new URL(urlMatch[0]);
      const host = parsed.hostname.toLowerCase();
      const isMapsHost = host === "maps.google.com" || host === "maps.app.goo.gl";
      const isGoogleMapsPath = (host === "google.com" || host === "www.google.com") && parsed.pathname.startsWith("/maps");

      if (isMapsHost || isGoogleMapsPath) {
        return parsed.toString();
      }
    } catch {
      return null;
    }
  }

  return null;
}

