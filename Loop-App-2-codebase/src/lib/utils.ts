export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Normalizes Indian phone numbers from messy paste or input values
 * (e.g. "+91 88256 80623", "08825680623", "+91-88256-80623", "91 88256 80623").
 * Returns clean 10-digit phone number string.
 */
export function sanitizeIndianPhoneNumber(input: string): string {
  if (!input) return "";

  // Remove all non-digits (spaces, hyphens, plus, parenthesis, hidden Unicode marks)
  let digits = input.replace(/\D/g, "");

  // Handle international prefix 0091
  if (digits.length > 12 && digits.startsWith("0091")) {
    digits = digits.slice(4);
  }

  // Handle country code 91 if total length is greater than 10
  // (Prevents stripping 91 from valid 10-digit numbers starting with 91, e.g. 9123456789)
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // Handle leading 0 (trunk prefix) if total length is greater than 10
  while (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Limit to maximum 10 digits
  return digits.slice(0, 10);
}
