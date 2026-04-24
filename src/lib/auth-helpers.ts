// Convert mobile number to a synthetic email so we can use Supabase email/password
// as the underlying auth while showing a mobile-first UX.
export function mobileToEmail(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return `m${digits}@upishield.app`;
}

export function normalizeMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  // Assume Indian numbers if 10 digits
  return digits.length === 10 ? `91${digits}` : digits;
}

export function isValidMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export const DEMO_EMAIL = "demo@upishield.app";
export const DEMO_PASSWORD = "DemoShield2025!";