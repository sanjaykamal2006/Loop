/**
 * Student Email & Identity Parser for College Campuses
 * Detects educational domains, extracts student roll numbers and formatted names.
 */

export interface ParsedStudentInfo {
  displayName: string;
  regNo: string;
  isStudentDomain: boolean;
}

/**
 * Parses college emails to automatically extract roll numbers and clean student names.
 * Examples:
 * - nithya.24mic7119@vitstudent.ac.in -> { displayName: "Nithya", regNo: "24MIC7119", isStudentDomain: true }
 * - sanjay.kamal.21bce1234@vitap.ac.in -> { displayName: "Sanjay Kamal", regNo: "21BCE1234", isStudentDomain: true }
 * - 21bce1045@college.edu -> { displayName: "Student 21BCE1045", regNo: "21BCE1045", isStudentDomain: true }
 * - adityapraharaj6@gmail.com -> { displayName: "Aditya Praharaj", regNo: "", isStudentDomain: false }
 */
export function parseStudentEmail(email: string): ParsedStudentInfo {
  if (!email || !email.includes("@")) {
    return { displayName: "User", regNo: "", isStudentDomain: false };
  }

  const [rawPrefix, rawDomain = ""] = email.toLowerCase().trim().split("@");

  // Check if domain is an educational institution or student domain
  const isStudentDomain =
    rawDomain.endsWith(".ac.in") ||
    rawDomain.endsWith(".edu.in") ||
    rawDomain.endsWith(".edu") ||
    rawDomain.includes("student") ||
    rawDomain.includes("college") ||
    rawDomain.includes("univ") ||
    rawDomain.includes("vitap") ||
    rawDomain.includes("vit.ac.in") ||
    rawDomain.includes("srmist") ||
    rawDomain.includes("bits-pilani");

  // Matches standard Indian college roll/reg numbers:
  // e.g. 24MIC7119, 21BCE1234, 22BCS012, RA2111003010123, 2021BCSE001, 19BEE024
  const rollMatch = rawPrefix.match(/\b(?:\d{2}[a-z]{2,5}\d{3,5}|[a-z]{1,3}\d{6,14}|\d{2}[a-z]{3}\d{4})\b/i);
  const regNo = rollMatch ? rollMatch[0].toUpperCase() : "";

  // Clean prefix to get student name
  let cleanPrefix = rawPrefix;
  if (rollMatch) {
    cleanPrefix = rawPrefix.replace(rollMatch[0], "").replace(/^[._-]+|[._-]+$/g, "");
  }

  // Remove lone trailing digits and split name parts
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

  return { displayName, regNo, isStudentDomain };
}

/**
 * Validates if the email is an authorized college student email or a developer account.
 */
export function isAllowedStudentEmail(email: string): { allowed: boolean; reason?: string } {
  const trimmed = (email || "").toLowerCase().trim();
  if (!trimmed.includes("@")) {
    return { allowed: false, reason: "Please enter a valid email address." };
  }

  // Developer & Core Team whitelist - never lock out existing admins & testers
  const developerWhitelist = [
    "sanjaykamal2006@gmail.com",
    "ngommalove69@gmail.com",
    "sanjaykamal1908@gmail.com",
    "sanjaykamal001@gmail.com",
    "sanjaykamal480@gmail.com",
    "dsmokshith2006@gmail.com",
    "loop.developer8@gmail.com",
    "adityapraharaj6@gmail.com",
    "nithya.polavarapu@gmail.com",
  ];

  if (developerWhitelist.includes(trimmed)) {
    return { allowed: true };
  }

  const domain = trimmed.split("@")[1] || "";
  const isEducational =
    domain.endsWith(".ac.in") ||
    domain.endsWith(".edu.in") ||
    domain.endsWith(".edu") ||
    domain.includes("student") ||
    domain.includes("college") ||
    domain.includes("univ") ||
    domain.includes("vitap") ||
    domain.includes("vit.ac.in") ||
    domain.includes("srmist") ||
    domain.includes("bits-pilani");

  if (!isEducational) {
    return {
      allowed: false,
      reason: "🎓 College rides require a verified student email (@college.ac.in or .edu). Please sign up with your college email.",
    };
  }

  return { allowed: true };
}
