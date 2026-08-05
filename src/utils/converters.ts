/**
 * Small conversion and card-number utilities.
 */

import { luhnCheck } from "./tlv/payment-decoders";

const cleanHex = (v: string) => v.replace(/[^0-9a-fA-F]/g, "").toUpperCase();

/* ------------------------------------------------------------- text / hex */

export function asciiToHex(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0xff) {
      throw new Error(
        `"${ch}" is outside the single-byte range — this converter handles 8-bit characters only.`
      );
    }
    out += code.toString(16).padStart(2, "0").toUpperCase();
  }
  return out;
}

export function hexToAscii(hex: string): string {
  const clean = cleanHex(hex);
  if (clean.length % 2 !== 0) {
    throw new Error("Hex input must have an even number of digits.");
  }
  return (clean.match(/.{2}/g) ?? [])
    .map((byte: string) => {
      const code = parseInt(byte, 16);
      // Keep non-printable bytes visible rather than emitting control chars.
      return code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : ".";
    })
    .join("");
}

/* ---------------------------------------------------------------- base64 */

export function hexToBase64(hex: string): string {
  const clean = cleanHex(hex);
  if (clean.length % 2 !== 0) {
    throw new Error("Hex input must have an even number of digits.");
  }
  const bytes = (clean.match(/.{2}/g) ?? []).map((b: string) =>
    parseInt(b, 16)
  );
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToHex(base64: string): string {
  const trimmed = base64.trim().replace(/\s+/g, "");
  let binary: string;
  try {
    binary = atob(trimmed);
  } catch {
    throw new Error("Not valid base64.");
  }
  let out = "";
  for (let i = 0; i < binary.length; i++) {
    out += binary.charCodeAt(i).toString(16).padStart(2, "0").toUpperCase();
  }
  return out;
}

/* --------------------------------------------------------------- bitwise */

export type BitwiseOperation = "AND" | "OR" | "XOR" | "NOT";

/** Bitwise operations over hex strings of equal length (NOT takes one input). */
export function bitwise(
  operation: BitwiseOperation,
  a: string,
  b = ""
): string {
  const left = cleanHex(a);

  if (operation === "NOT") {
    let out = "";
    for (const ch of left) {
      out += (15 - parseInt(ch, 16)).toString(16).toUpperCase();
    }
    return out;
  }

  const right = cleanHex(b);
  if (left.length !== right.length) {
    throw new Error(
      `${operation} needs equal-length inputs; got ${left.length / 2} and ${
        right.length / 2
      } bytes.`
    );
  }

  let out = "";
  for (let i = 0; i < left.length; i++) {
    const x = parseInt(left[i], 16);
    const y = parseInt(right[i], 16);
    const result =
      operation === "AND" ? x & y : operation === "OR" ? x | y : x ^ y;
    out += result.toString(16).toUpperCase();
  }
  return out;
}

/* ----------------------------------------------------------- Julian date */

/**
 * Convert a calendar date to the CYYDDD form used in card and clearing data:
 * one century digit, two year digits, three day-of-year digits.
 */
export function toJulianCyyddd(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) throw new Error("Date must be in YYYY-MM-DD form.");

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${isoDate} is not a real calendar date.`);
  }

  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear =
    Math.floor((date.getTime() - startOfYear) / 86_400_000) + 1;

  // Century digit: 0 for 1900s, 1 for 2000s, and so on.
  const century = Math.floor(year / 100) - 19;
  if (century < 0 || century > 9) {
    throw new Error(`Year ${year} is outside the range CYYDDD can express.`);
  }

  return `${century}${String(year % 100).padStart(2, "0")}${String(
    dayOfYear
  ).padStart(3, "0")}`;
}

/** Convert CYYDDD back to an ISO date. */
export function fromJulianCyyddd(cyyddd: string): string {
  const clean = cyyddd.replace(/[^0-9]/g, "");
  if (clean.length !== 6) {
    throw new Error("CYYDDD must be exactly 6 digits.");
  }
  const century = Number(clean[0]);
  const year = 1900 + century * 100 + Number(clean.substring(1, 3));
  const dayOfYear = Number(clean.substring(3, 6));

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  if (dayOfYear < 1 || dayOfYear > daysInYear) {
    throw new Error(
      `Day ${dayOfYear} is out of range for ${year}, which has ${daysInYear} days.`
    );
  }

  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return date.toISOString().substring(0, 10);
}

/* ------------------------------------------------------- card numbers */

/** Compute the Luhn check digit for a PAN supplied without one. */
export function luhnCheckDigit(partialPan: string): string {
  const digits = partialPan.replace(/[^0-9]/g, "");
  if (digits.length === 0) throw new Error("Enter at least one digit.");

  let sum = 0;
  // The check digit will sit at the end, so the rightmost supplied digit is
  // doubled.
  let double = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return String((10 - (sum % 10)) % 10);
}

/** Append a valid Luhn check digit. */
export function completePan(partialPan: string): string {
  const digits = partialPan.replace(/[^0-9]/g, "");
  return digits + luhnCheckDigit(digits);
}

export type GeneratedCard = { pan: string; valid: boolean };

/**
 * Generate test PANs from a BIN. Digits between the BIN and the check digit are
 * filled from `seed` so output is reproducible — these are structurally valid
 * numbers for testing, not numbers that exist.
 */
export function generateTestPans(
  bin: string,
  length: number,
  count: number,
  seed = 1
): GeneratedCard[] {
  const prefix = bin.replace(/[^0-9]/g, "");
  if (prefix.length === 0) throw new Error("Enter a BIN.");
  if (length < prefix.length + 1 || length > 19) {
    throw new Error(
      `Length must be between ${prefix.length + 1} and 19 digits.`
    );
  }
  if (count < 1 || count > 100) throw new Error("Count must be 1–100.");

  const bodyLength = length - prefix.length - 1;
  const out: GeneratedCard[] = [];

  // A small linear congruential generator: deterministic, no Math.random.
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return (state >>> 16) % 10;
  };

  for (let i = 0; i < count; i++) {
    let body = "";
    for (let j = 0; j < bodyLength; j++) body += String(next());
    const pan = completePan(prefix + body);
    out.push({ pan, valid: luhnCheck(pan) });
  }
  return out;
}

/* ------------------------------------------------------ ISO 8583 bitmap */

export type BitmapDecoding = {
  fields: number[];
  /** True when bit 1 is set, meaning a secondary bitmap follows. */
  hasSecondary: boolean;
  bits: string;
};

/** Decode an ISO 8583 primary (and optional secondary) bitmap from hex. */
export function decodeIso8583Bitmap(hex: string): BitmapDecoding {
  const clean = cleanHex(hex);
  if (clean.length !== 16 && clean.length !== 32) {
    throw new Error(
      `A bitmap is 8 bytes (16 hex digits), or 16 bytes with a secondary bitmap; got ${
        clean.length / 2
      } bytes.`
    );
  }

  let bits = "";
  for (const ch of clean) {
    bits += parseInt(ch, 16).toString(2).padStart(4, "0");
  }

  const fields: number[] = [];
  for (let i = 0; i < bits.length; i++) {
    // Bit 1 of the primary bitmap flags a secondary bitmap, not a data field.
    if (bits[i] === "1" && i !== 0) fields.push(i + 1);
  }

  return { fields, hasSecondary: bits[0] === "1", bits };
}

/** Build a bitmap hex string from a list of present field numbers. */
export function encodeIso8583Bitmap(fields: number[]): string {
  const needsSecondary = fields.some((f) => f > 64);
  const size = needsSecondary ? 128 : 64;
  const bits = new Array(size).fill("0");

  for (const field of fields) {
    if (field < 2 || field > size) {
      throw new Error(`Field ${field} is outside the range 2–${size}.`);
    }
    bits[field - 1] = "1";
  }
  if (needsSecondary) bits[0] = "1";

  let out = "";
  for (let i = 0; i < size; i += 4) {
    out += parseInt(bits.slice(i, i + 4).join(""), 2)
      .toString(16)
      .toUpperCase();
  }
  return out;
}
