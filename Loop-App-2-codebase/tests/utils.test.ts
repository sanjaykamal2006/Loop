import { describe, it, expect } from "vitest";
import { sanitizeIndianPhoneNumber, cn, getMapsUrlFromMessage } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names and filter falsy values", () => {
      expect(cn("btn", false && "hidden", "btn-primary", undefined, null, "active")).toBe("btn btn-primary active");
    });
  });

  describe("sanitizeIndianPhoneNumber", () => {
    it("should sanitize standard 10-digit phone number", () => {
      expect(sanitizeIndianPhoneNumber("9876543210")).toBe("9876543210");
    });

    it("should strip +91 prefix and formatting characters", () => {
      expect(sanitizeIndianPhoneNumber("+91 98765 43210")).toBe("9876543210");
      expect(sanitizeIndianPhoneNumber("+91-98765-43210")).toBe("9876543210");
      expect(sanitizeIndianPhoneNumber("+919876543210")).toBe("9876543210");
    });

    it("should handle 0091 international dialing prefix", () => {
      expect(sanitizeIndianPhoneNumber("0091 9876543210")).toBe("9876543210");
    });

    it("should handle leading trunk 0 prefix", () => {
      expect(sanitizeIndianPhoneNumber("09876543210")).toBe("9876543210");
    });

    it("should NOT strip 91 from valid 10-digit numbers that start with 91", () => {
      expect(sanitizeIndianPhoneNumber("9123456789")).toBe("9123456789");
    });

    it("should handle empty or invalid inputs gracefully", () => {
      expect(sanitizeIndianPhoneNumber("")).toBe("");
      expect(sanitizeIndianPhoneNumber("abc")).toBe("");
    });
  });

  describe("getMapsUrlFromMessage", () => {
    it("should extract coordinate query parameter into standard google maps URL", () => {
      const result = getMapsUrlFromMessage("I am waiting here: https://example.com?q=16.4951,80.4992");
      expect(result).toBe("https://maps.google.com/maps?q=16.4951,80.4992");
    });

    it("should validate and allow authentic maps.google.com URLs", () => {
      const url = "https://maps.google.com/maps?q=16.4951,80.4992";
      expect(getMapsUrlFromMessage(`My location is ${url}`)).toBe(url);
    });

    it("should validate and allow maps.app.goo.gl short links", () => {
      const url = "https://maps.app.goo.gl/abCdEf12345";
      expect(getMapsUrlFromMessage(`Meet here: ${url}`)).toBe(url);
    });

    it("should validate and allow google.com/maps paths", () => {
      const url = "https://www.google.com/maps/place/VIT-AP";
      expect(getMapsUrlFromMessage(url)).toBe(url);
    });

    it("REJECTS phishing attacks embedding malicious links alongside google.com/maps text", () => {
      const phishingMessage = "google.com/maps https://evil-phishing-site.com/login";
      expect(getMapsUrlFromMessage(phishingMessage)).toBeNull();
    });

    it("REJECTS spoofed domain names mimicking Google", () => {
      const spoofed = "https://maps.google.com.attacker.com/evil";
      expect(getMapsUrlFromMessage(spoofed)).toBeNull();
      const fakeGoogle = "https://google.com.evil.com/maps";
      expect(getMapsUrlFromMessage(fakeGoogle)).toBeNull();
    });

    it("returns null for empty or non-location messages", () => {
      expect(getMapsUrlFromMessage("")).toBeNull();
      expect(getMapsUrlFromMessage("Hey are you at the gate?")).toBeNull();
    });
  });
});
