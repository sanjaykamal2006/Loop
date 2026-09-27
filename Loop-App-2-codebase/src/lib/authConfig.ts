/**
 * Institutional Domains allowed for student & faculty registrations on LOOP.
 * Substring matching is strictly prohibited to prevent spoof domains (e.g. fakevitap.com, vitapstudent.xyz).
 */
export const ALLOWED_INSTITUTIONAL_DOMAINS = [
  "vitapstudent.ac.in", // VIT-AP Students
  "vitap.ac.in",        // VIT-AP Faculty & Staff
] as const;

/**
 * Hardcoded whitelist of up to 10 outside email addresses (e.g. admins, testers, advisors).
 * These exact email addresses bypass the institutional domain check for signups.
 * Edit this array to replace placeholder emails with your real addresses.
 */
export const EXTERNAL_EMAIL_WHITELIST: string[] = [
  "admin@loop.com",        // 1. Primary Admin
  "tester1@gmail.com",     // 2. Beta Tester 1
  "tester2@gmail.com",     // 3. Beta Tester 2
  "advisor@vit.ac.in",     // 4. Project Advisor
  "developer@gmail.com",   // 5. Developer Personal
  "tester3@yahoo.com",     // 6. External Tester 3
  "auditor@secops.io",     // 7. Security Auditor
  "partner@vitap.edu.in",  // 8. University Partner
  "guest1@outlook.com",    // 9. Guest Reviewer 1
  "guest2@outlook.com",    // 10. Guest Reviewer 2
];

export const INSTITUTIONAL_ERROR_MESSAGE =
  "LOOP is only available to VIT-AP students and faculty. Please use your institutional email.";

/**
 * Validates whether an email belongs to an allowed institutional domain or the whitelist.
 * Uses strict exact matching (no substring matches).
 */
export function isAllowedInstitutionalEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const normalized = email.toLowerCase().trim();
  const domain = normalized.split("@")[1] || "";

  // 1. Exact institutional domain allow-list check
  if ((ALLOWED_INSTITUTIONAL_DOMAINS as readonly string[]).includes(domain)) {
    return true;
  }

  // 2. Exact external whitelist check
  const cleanWhitelist = EXTERNAL_EMAIL_WHITELIST.map((e) => e.toLowerCase().trim());
  if (cleanWhitelist.includes(normalized)) {
    return true;
  }

  // 3. Environment variable admin whitelist support
  const envWhitelist = (
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    process.env.ADMIN_EMAILS ||
    process.env.ALLOWED_EXTERNAL_EMAILS ||
    ""
  )
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (envWhitelist.includes(normalized)) {
    return true;
  }

  return false;
}
