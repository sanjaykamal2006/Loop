/**
 * Student Email & Identity Parser for VIT-AP Campus
 * Parses: name.rollno@vitapstudent.ac.in
 * Automatically extracts student full name and roll number.
 */

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

  const isVitAp =
    rawDomain === "vitapstudent.ac.in" ||
    rawDomain === "vitap.ac.in" ||
    rawDomain.includes("vitap");

  const isStudentDomain =
    isVitAp ||
    rawDomain.endsWith(".ac.in") ||
    rawDomain.endsWith(".edu.in") ||
    rawDomain.endsWith(".edu") ||
    rawDomain.includes("student") ||
    rawDomain.includes("college") ||
    rawDomain.includes("univ");

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
 * Validates if the email is an authorized college student email or a developer account.
 */
export function isAllowedStudentEmail(email: string): { allowed: boolean; reason?: string } {
  const trimmed = (email || "").toLowerCase().trim();
  if (!trimmed.includes("@")) {
    return { allowed: false, reason: "Please enter a valid email address." };
  }

  // Configurable admin/developer whitelist from environment
  const envWhitelist = (
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    process.env.ADMIN_EMAILS ||
    ""
  )
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (envWhitelist.includes(trimmed)) {
    return { allowed: true };
  }

  const domain = trimmed.split("@")[1] || "";
  const isVitAp =
    domain === "vitapstudent.ac.in" ||
    domain === "vitap.ac.in" ||
    domain.includes("vitap");

  const isEducational =
    isVitAp ||
    domain.endsWith(".ac.in") ||
    domain.endsWith(".edu.in") ||
    domain.endsWith(".edu") ||
    domain.includes("student");

  if (!isEducational) {
    return {
      allowed: false,
      reason: "🎓 Please use your official VIT-AP student email (name.rollno@vitapstudent.ac.in).",
    };
  }

  return { allowed: true };
}

/**
 * Asynchronously checks if an email is eligible to sign up or log in.
 * - Educational domains & Developer whitelist: instantaneous client-side allow (0ms latency).
 * - External domains: queries /api/auth/validate-email to enforce the upcoming 5 external slots quota.
 */
export async function validateEmailWithQuota(
  email: string,
  isLogin: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  const syncCheck = isAllowedStudentEmail(email);
  if (syncCheck.allowed) {
    return { allowed: true };
  }

  // If format is invalid, return immediately
  if (!email || !email.includes("@")) {
    return { allowed: false, reason: "Please enter a valid email address." };
  }

  try {
    const res = await fetch("/api/auth/validate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), isLogin }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        allowed: false,
        reason: data?.reason || "🎓 Please use your official VIT-AP student email.",
      };
    }

    return {
      allowed: Boolean(data?.allowed),
      reason: data?.reason,
    };
  } catch (err) {
    // If network fails during login, allow attempt through to Supabase auth
    if (isLogin) return { allowed: true };
    return {
      allowed: false,
      reason: "Could not verify email quota. Please check your connection and try again.",
    };
  }
}

