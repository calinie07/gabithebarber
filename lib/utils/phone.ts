/**
 * Normalize Romanian phone numbers to E.164-ish +40XXXXXXXXX.
 * No SMS verification — uniqueness only.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }

  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    digits = `+${rest}`;
  } else {
    const only = digits.replace(/\D/g, "");
    if (only.startsWith("40")) {
      digits = `+${only}`;
    } else if (only.startsWith("0") && only.length >= 10) {
      digits = `+40${only.slice(1)}`;
    } else if (only.length === 9) {
      digits = `+40${only}`;
    } else {
      digits = `+${only}`;
    }
  }

  // Basic sanity: + and at least 10 digits total
  const digitCount = digits.replace(/\D/g, "").length;
  if (digitCount < 10 || digitCount > 15) {
    return null;
  }

  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone) ?? phone;
  if (n.startsWith("+40") && n.length === 12) {
    return `+40 ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
  }
  return n;
}
