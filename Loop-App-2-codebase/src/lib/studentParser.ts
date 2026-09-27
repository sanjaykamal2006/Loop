import {
  ALLOWED_INSTITUTIONAL_DOMAINS,
  EXTERNAL_EMAIL_WHITELIST,
  INSTITUTIONAL_ERROR_MESSAGE,
  isAllowedInstitutionalEmail,
} from "./authConfig";

export {
  ALLOWED_INSTITUTIONAL_DOMAINS,
  EXTERNAL_EMAIL_WHITELIST,
  INSTITUTIONAL_ERROR_MESSAGE,
  isAllowedInstitutionalEmail,
};

export interface ParsedStudentInfo {
  displayName: string;
  regNo: string;
  isStudentDomain: boolean;
  isVitAp: boolean;
  campus: string;
}

/**
 * Parses college emails to automatically extract roll numbers and clean student names.
 * Examples:
 * - sanjay.21bce1234@vitapstudent.ac.in -> { displayName: "Sanjay", regNo: "21BCE1234", isVitAp: true }
 * - sanjay.kamal.21bce1234@vitapstudent.ac.in -> { displayName: "Sanjay Kamal", regNo: "21BCE1234", isVitAp: true }
 * - nithya.24mic7119@vitapstudent.ac.in -> { displayName: "Nithya", regNo: "24MIC7119", isVitAp: true }
 */
export function parseStudentEmail(email: string): ParsedStudentInfo {
  if (!email || !email.includes("@")) {
    return {
      displayName: "User",
      regNo: "",
      isStudentDomain: false,
      isVitAp: false,
      campus: "College",
    };
  }

  const [rawPrefix, rawDomain = ""] = email.toLowerCase().trim().split("@");

  // Strict exact institutional match
  const isVitAp = (ALLOWED_INSTITUTIONAL_DOMAINS as readonly string[]).includes(rawDomain);
  const isStudentDomain = isVitAp || isAllowedInstitutionalEmail(email);

  // Matches VIT-AP & standard Indian college roll numbers:
  // e.g. 21BCE1234, 24MIC7119, 22BCS012, 23BCE7111, RA2111003010123
  const rollMatch = rawPrefix.match(/\b(?:\d{2}[a-z]{2,5}\d{3,5}|[a-z]{1,3}\d{6,14}|\d{2}[a-z]{3}\d{4})\b/i);
  const regNo = rollMatch ? rollMatch[0].toUpperCase() : "";

  // Strip the roll number from prefix to get clean student name
  let cleanPrefix = rawPrefix;
  if (rollMatch) {
    cleanPrefix = rawPrefix.replace(rollMatch[0], "").replace(/^[._-]+|[._-]+$/g, "");
  }

  // Remove trailing numbers and format words into Title Case
  const nameParts = cleanPrefix
    .split(/[._-]+/)
    .map((p) => p.replace(/\d+/g, "").trim())
    .filter(Boolean);

  let displayName = nameParts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  if (!displayName) {
    displayName = regNo ? `Student ${regNo}` : rawPrefix;
  }

  return {
    displayName,
    regNo,
    isStudentDomain,
    isVitAp,
    campus: isVitAp ? "VIT-AP University" : "College",
  };
}

/**
 * Validates if the email is an authorized college student email or whitelisted account.
 */
export function isAllowedStudentEmail(email: string): { allowed: boolean; reason?: string } {
  if (isAllowedInstitutionalEmail(email)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: INSTITUTIONAL_ERROR_MESSAGE,
  };
}

/**
 * Asynchronously checks if an email is eligible to sign up or log in.
 * - If logging in (isLogin=true), allows existing users to proceed to password check.
 * - If signing up (isLogin=false), strictly enforces institutional domains & whitelist.
 */
export async function validateEmailWithQuota(
  email: string,
  isLogin: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  // Existing users logging in are always allowed through to Supabase auth
  if (isLogin) {
    return { allowed: true };
  }

  const syncCheck = isAllowedStudentEmail(email);
  if (syncCheck.allowed) {
    return { allowed: true };
  }

  // Check dynamic server-side allowed_external_emails table
  try {
    const res = await fetch("/api/auth/validate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), isLogin: false }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.allowed) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: data?.reason || INSTITUTIONAL_ERROR_MESSAGE,
    };
  } catch (err) {
    return {
      allowed: false,
      reason: INSTITUTIONAL_ERROR_MESSAGE,
    };
  }
}

