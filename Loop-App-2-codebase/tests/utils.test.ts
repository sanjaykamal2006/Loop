import { describe, it, expect } from "vitest";
import { sanitizeIndianPhoneNumber, cn } from "@/lib/utils";

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
});
