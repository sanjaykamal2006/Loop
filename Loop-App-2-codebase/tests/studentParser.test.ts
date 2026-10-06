import { describe, it, expect } from "vitest";
import { parseStudentEmail, isAllowedStudentEmail } from "@/lib/studentParser";

describe("studentParser", () => {
  describe("parseStudentEmail", () => {
    it("should parse standard VIT-AP student email with name and roll number", () => {
      const parsed = parseStudentEmail("sanjay.21bce1234@vitapstudent.ac.in");
      expect(parsed.displayName).toBe("Sanjay");
      expect(parsed.regNo).toBe("21BCE1234");
      expect(parsed.isVitAp).toBe(true);
      expect(parsed.isStudentDomain).toBe(true);
      expect(parsed.campus).toBe("VIT-AP University");
    });

    it("should parse multi-part student names with dots and hyphens", () => {
      const parsed = parseStudentEmail("sanjay.kamal.24mic7119@vitapstudent.ac.in");
      expect(parsed.displayName).toBe("Sanjay Kamal");
      expect(parsed.regNo).toBe("24MIC7119");
      expect(parsed.isVitAp).toBe(true);
    });

    it("should format title case properly even for messy casing", () => {
      const parsed = parseStudentEmail("NITHYA.PRIYA.23BCS012@vitapstudent.ac.in");
      expect(parsed.displayName).toBe("Nithya Priya");
      expect(parsed.regNo).toBe("23BCS012");
      expect(parsed.isVitAp).toBe(true);
    });

    it("should parse faculty email correctly with empty roll number", () => {
      const parsed = parseStudentEmail("hod.scope@vitap.ac.in");
      expect(parsed.displayName).toBe("Hod Scope");
      expect(parsed.regNo).toBe("");
      expect(parsed.isVitAp).toBe(true);
      expect(parsed.isStudentDomain).toBe(true);
      expect(parsed.campus).toBe("VIT-AP University");
    });

    it("should handle external whitelisted emails", () => {
      const parsed = parseStudentEmail("sanjaykamal2006@gmail.com");
      expect(parsed.displayName).toBe("Sanjaykamal");
      expect(parsed.regNo).toBe("");
      expect(parsed.isVitAp).toBe(false);
      expect(parsed.isStudentDomain).toBe(true);
      expect(parsed.campus).toBe("College");
    });

    it("should handle invalid or empty inputs gracefully", () => {
      const invalid = parseStudentEmail("");
      expect(invalid.displayName).toBe("User");
      expect(invalid.regNo).toBe("");
      expect(invalid.isStudentDomain).toBe(false);
      expect(invalid.isVitAp).toBe(false);

      const noAt = parseStudentEmail("invalid-email-string");
      expect(noAt.displayName).toBe("User");
      expect(noAt.regNo).toBe("");
      expect(noAt.isStudentDomain).toBe(false);
    });
  });

  describe("isAllowedStudentEmail", () => {
    it("should allow valid institutional student emails", () => {
      const res = isAllowedStudentEmail("john.doe.21bce1000@vitapstudent.ac.in");
      expect(res.allowed).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("should allow valid institutional faculty emails", () => {
      const res = isAllowedStudentEmail("faculty.member@vitap.ac.in");
      expect(res.allowed).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("should allow hardcoded whitelist emails", () => {
      const res = isAllowedStudentEmail("sanjaykamal2006@gmail.com");
      expect(res.allowed).toBe(true);
    });

    it("should strictly reject plus-addressing (+) in institutional emails", () => {
      const res = isAllowedStudentEmail("john+test@vitapstudent.ac.in");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Plus-addressing");
    });

    it("should strictly reject unauthorized personal emails", () => {
      const res = isAllowedStudentEmail("random.user@gmail.com");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("VIT-AP students and faculty");
    });

    it("should reject lookalike/spoof domains", () => {
      expect(isAllowedStudentEmail("attacker@vitapstudent.ac.in.fake.com").allowed).toBe(false);
      expect(isAllowedStudentEmail("attacker@fakevitapstudent.ac.in").allowed).toBe(false);
      expect(isAllowedStudentEmail("attacker@vitapstudent.xyz").allowed).toBe(false);
    });
  });
});
