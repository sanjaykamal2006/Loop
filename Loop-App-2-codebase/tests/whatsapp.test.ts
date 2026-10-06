import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getWhatsAppUrl, openWhatsApp, isMobileDevice } from "@/lib/whatsapp";

describe("whatsapp utility", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getWhatsAppUrl", () => {
    it("should generate native whatsapp:// protocol url for mobile user agent", () => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
      );

      const url = getWhatsAppUrl({
        phone: "+91 98765 43210",
        text: "Emergency Alert",
      });

      expect(url).toBe("whatsapp://send?phone=919876543210&text=Emergency%20Alert");
    });

    it("should generate web.whatsapp.com url for desktop user agent", () => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
      );

      const url = getWhatsAppUrl({
        phone: "9876543210",
        text: "Coordinating ride",
      });

      expect(url).toBe("https://web.whatsapp.com/send?phone=919876543210&text=Coordinating%20ride");
    });

    it("should handle text-only share without phone number", () => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 Mobile Safari/537.36"
      );

      const url = getWhatsAppUrl({
        text: "Join my loop ride",
      });

      expect(url).toBe("whatsapp://send?text=Join%20my%20loop%20ride");
    });
  });

  describe("isMobileDevice", () => {
    it("should return true for Android user agents", () => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (Linux; Android 12; Pixel 6) Mobile Safari/537.36"
      );
      expect(isMobileDevice()).toBe(true);
    });

    it("should return false for desktop Windows user agent", () => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );
      expect(isMobileDevice()).toBe(false);
    });
  });
});
