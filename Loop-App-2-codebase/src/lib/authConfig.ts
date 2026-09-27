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
  "sanjaykamal2006@gmail.com", // 1. Founder
  "",                          // 2. Reserved
  "",                          // 3. Reserved
  "",                          // 4. Reserved
  "",                          // 5. Reserved
  "",                          // 6. Reserved
  "",                          // 7. Reserved
  "",                          // 8. Reserved
  "",                          // 9. Reserved
  "",                          // 10. Reserved
];

export const INSTITUTIONAL_ERROR_MESSAGE =
  "LOOP is only available to VIT-AP students and faculty. Please use your institutional email.";

export const PLUS_ADDRESSING_ERROR_MESSAGE =
  "Plus-addressing (+) is not allowed in email addresses.";

/**
 * Checks if an email contains a '+' in its local part (before the @).
 */
export function hasPlusAddressing(email: string): boolean {
  if (!email || typeof email !== "string" || !email.includes("@")) return false;
  const localPart = email.split("@")[0] || "";
  return localPart.includes("+");
}

/**
 * Validates whether an email belongs to an allowed institutional domain or the whitelist.
 * Uses strict exact matching (no substring matches).
 * Strictly rejects any plus-addressing (+) in the local part.
 * Filters out empty strings so reserved whitelist slots cannot match blank/empty inputs.
 */
export function isAllowedInstitutionalEmail(email: string): boolean {
  if (!email || typeof email !== "string" || !email.includes("@")) return false;
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;

  // Plus-addressing check: immediately reject if '+' is in local part
  if (hasPlusAddressing(normalized)) {
    return false;
  }

  const domain = normalized.split("@")[1]?.trim() || "";
  if (!domain) return false;

  // 1. Exact institutional domain allow-list check
  if ((ALLOWED_INSTITUTIONAL_DOMAINS as readonly string[]).includes(domain)) {
    return true;
  }

  // 2. Exact external whitelist check (strictly ignoring empty strings and reserved slots)
  const cleanWhitelist = EXTERNAL_EMAIL_WHITELIST
    .map((e) => e.toLowerCase().trim())
    .filter((e) => e.length > 0);

  if (cleanWhitelist.includes(normalized)) {
    return true;
  }

  return false;
}
