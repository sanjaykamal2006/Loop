import { describe, it, expect, vi } from "vitest";

// The external whitelist is env-sourced (no personal emails in the bundle).
// vi.hoisted: must run before the module import — the list is captured at init.
vi.hoisted(() => {
  process.env.EXTERNAL_EMAIL_WHITELIST = "test-admin@example.com";
});

import {
  ALLOWED_INSTITUTIONAL_DOMAINS,
  INSTITUTIONAL_ERROR_MESSAGE,
  PLUS_ADDRESSING_ERROR_MESSAGE,
  hasPlusAddressing,
  isAllowedInstitutionalEmail,
} from "@/lib/authConfig";

describe("authConfig", () => {
  describe("Constants", () => {
    it("should define allowed institutional domains", () => {
      expect(ALLOWED_INSTITUTIONAL_DOMAINS).toContain("vitapstudent.ac.in");
      expect(ALLOWED_INSTITUTIONAL_DOMAINS).toContain("vitap.ac.in");
    });

    it("should define meaningful error messages", () => {
      expect(INSTITUTIONAL_ERROR_MESSAGE).toBeTruthy();
      expect(PLUS_ADDRESSING_ERROR_MESSAGE).toBeTruthy();
    });
  });

  describe("hasPlusAddressing", () => {
    it("should detect plus character in local part", () => {
      expect(hasPlusAddressing("student+alias@vitapstudent.ac.in")).toBe(true);
      expect(hasPlusAddressing("student+123@gmail.com")).toBe(true);
      expect(hasPlusAddressing("student+test+456@vitap.ac.in")).toBe(true);
    });

    it("should return false for regular emails", () => {
      expect(hasPlusAddressing("sanjay.24mic7130@vitapstudent.ac.in")).toBe(false);
      expect(hasPlusAddressing("hod.scope@vitap.ac.in")).toBe(false);
      expect(hasPlusAddressing("")).toBe(false);
    });
  });

  describe("isAllowedInstitutionalEmail", () => {
    it("should validate exact domain matches", () => {
      expect(isAllowedInstitutionalEmail("test@vitapstudent.ac.in")).toBe(true);
      expect(isAllowedInstitutionalEmail("prof@vitap.ac.in")).toBe(true);
    });

    it("should ignore uppercase / whitespace differences", () => {
      expect(isAllowedInstitutionalEmail("  SANJAY@VITAPSTUDENT.AC.IN  ")).toBe(true);
    });

    it("should reject plus-addressed variants", () => {
      expect(isAllowedInstitutionalEmail("sanjay+alias@vitapstudent.ac.in")).toBe(false);
    });

    it("should reject subdomain or superdomain spoofing", () => {
      expect(isAllowedInstitutionalEmail("test@sub.vitapstudent.ac.in")).toBe(false);
      expect(isAllowedInstitutionalEmail("test@vitapstudent.ac.in.attacker.org")).toBe(false);
      expect(isAllowedInstitutionalEmail("test@notvitapstudent.ac.in")).toBe(false);
    });

    it("should not match empty whitelist slots against empty input", () => {
      expect(isAllowedInstitutionalEmail("")).toBe(false);
      expect(isAllowedInstitutionalEmail("   ")).toBe(false);
      expect(isAllowedInstitutionalEmail("@")).toBe(false);
    });

    it("should allow env-sourced external whitelist emails", () => {
      expect(isAllowedInstitutionalEmail("test-admin@example.com")).toBe(true);
      // Emails not in the env whitelist (and not institutional) stay rejected.
      expect(isAllowedInstitutionalEmail("someone-else@gmail.com")).toBe(false);
    });
  });
});
