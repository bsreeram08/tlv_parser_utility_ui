/**
 * Pure decoders for payment data structures carried inside TLV values.
 * No React here — the components in `components/ui/tlv-tags/` render these.
 */

import { getTagInfo } from "./tag-registry";

/* ------------------------------------------------------------------ Track 2 */

export type Track2Data = {
  readonly pan: string;
  readonly expiry: string; // YYMM as found
  readonly serviceCode: string;
  readonly discretionaryData: string;
  /** True when the PAN passes the Luhn check. */
  readonly panValid: boolean;
  readonly errors: string[];
};

/** Luhn (mod-10) check over a digit string. */
export function luhnCheck(digits: string): boolean {
  if (!/^\d{2,}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Mask all but the first 6 and last 4 digits of a PAN. */
export function maskPan(pan: string): string {
  if (pan.length <= 10) return "*".repeat(pan.length);
  return `${pan.slice(0, 6)}${"*".repeat(pan.length - 10)}${pan.slice(-4)}`;
}

/**
 * Decode Track 2 Equivalent Data (tag 57) or Track 2 Data (tag 9F6B).
 * Layout: PAN, 'D' separator, expiry YYMM, 3-digit service code,
 * discretionary data, optional 'F' padding.
 */
export function decodeTrack2(hexValue: string): Track2Data {
  const errors: string[] = [];
  const nibbles = hexValue.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();

  // Trailing 'F' is padding to a whole byte, not data.
  const trimmed = nibbles.replace(/F+$/, "");
  const sepIndex = trimmed.indexOf("D");

  if (sepIndex === -1) {
    errors.push("No 'D' field separator found — not valid Track 2 data");
    return {
      pan: trimmed,
      expiry: "",
      serviceCode: "",
      discretionaryData: "",
      panValid: false,
      errors,
    };
  }

  const pan = trimmed.substring(0, sepIndex);
  const rest = trimmed.substring(sepIndex + 1);
  const expiry = rest.substring(0, 4);
  const serviceCode = rest.substring(4, 7);
  const discretionaryData = rest.substring(7);

  if (!/^\d+$/.test(pan)) errors.push("PAN contains non-decimal digits");
  if (expiry.length < 4) errors.push("Expiry date truncated");
  if (serviceCode.length < 3) errors.push("Service code truncated");

  const month = parseInt(expiry.substring(2, 4), 10);
  if (expiry.length === 4 && (month < 1 || month > 12)) {
    errors.push(`Expiry month ${expiry.substring(2, 4)} is not 01–12`);
  }

  const panValid = luhnCheck(pan);
  if (pan && !panValid) errors.push("PAN fails the Luhn check");

  return {
    pan,
    expiry,
    serviceCode,
    discretionaryData,
    panValid,
    errors,
  };
}

/** ISO 7813 service code digit meanings. */
export const SERVICE_CODE_DIGITS: readonly Readonly<
  Record<string, string>
>[] = [
  {
    "1": "International interchange",
    "2": "International interchange, IC should be used where feasible",
    "5": "National interchange only, except under bilateral agreement",
    "6": "National interchange only, IC should be used where feasible",
    "7": "Private / no interchange except under bilateral agreement",
    "9": "Test card",
  },
  {
    "0": "Normal authorization",
    "2": "Authorization by issuer (online)",
    "4": "Authorization by issuer unless explicit bilateral agreement applies",
  },
  {
    "0": "No restrictions, PIN required",
    "1": "No restrictions",
    "2": "Goods and services only (no cash)",
    "3": "ATM only, PIN required",
    "4": "Cash only",
    "5": "Goods and services only, PIN required",
    "6": "No restrictions, use PIN where feasible",
    "7": "Goods and services only, use PIN where feasible",
  },
];

export const SERVICE_CODE_LABELS = [
  "Interchange and technology",
  "Authorization processing",
  "Allowed services and PIN requirements",
] as const;

/* ---------------------------------------------------------------- CVM List */

/** CVM codes — low 6 bits of CV Rule byte 1. EMV 4.4 Book 3, Annex C3. */
export const CVM_CODES: Readonly<Record<number, string>> = {
  0x00: "Fail CVM processing",
  0x01: "Plaintext PIN verification performed by ICC",
  0x02: "Enciphered PIN verified online",
  0x03: "Plaintext PIN verification by ICC and signature (paper)",
  0x04: "Enciphered PIN verification performed by ICC",
  0x05: "Enciphered PIN verification by ICC and signature (paper)",
  0x1e: "Signature (paper)",
  0x1f: "No CVM required",
  0x3f: "No CVM performed / kernel-specific",
};

/** CVM condition codes — CV Rule byte 2. EMV 4.4 Book 3, Annex C3. */
export const CVM_CONDITIONS: Readonly<Record<number, string>> = {
  0x00: "Always",
  0x01: "If unattended cash",
  0x02: "If not unattended cash, not manual cash, not purchase with cashback",
  0x03: "If terminal supports the CVM",
  0x04: "If manual cash",
  0x05: "If purchase with cashback",
  0x06: "If transaction is in the application currency and under X value",
  0x07: "If transaction is in the application currency and over X value",
  0x08: "If transaction is in the application currency and under Y value",
  0x09: "If transaction is in the application currency and over Y value",
};

export type CvmRule = {
  readonly raw: string;
  readonly methodCode: number;
  readonly method: string;
  /** True when byte 1 bit 7 is set: try the next rule if this CVM fails. */
  readonly continueOnFailure: boolean;
  readonly conditionCode: number;
  readonly condition: string;
};

export type CvmList = {
  /** Amount X, raw 4-byte binary value. */
  readonly amountX: number;
  /** Amount Y, raw 4-byte binary value. */
  readonly amountY: number;
  readonly rules: CvmRule[];
  readonly errors: string[];
};

/** Decode a CVM List (tag 8E). */
export function decodeCvmList(hexValue: string): CvmList {
  const errors: string[] = [];
  const hex = hexValue.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();

  if (hex.length < 16) {
    errors.push("CVM List must be at least 8 bytes (amount X and amount Y)");
    return { amountX: 0, amountY: 0, rules: [], errors };
  }

  const amountX = parseInt(hex.substring(0, 8), 16);
  const amountY = parseInt(hex.substring(8, 16), 16);

  const ruleHex = hex.substring(16);
  if (ruleHex.length % 4 !== 0) {
    errors.push("Trailing bytes: CV Rules must come in 2-byte pairs");
  }

  const rules: CvmRule[] = [];
  for (let i = 0; i + 4 <= ruleHex.length; i += 4) {
    const raw = ruleHex.substring(i, i + 4);
    const byte1 = parseInt(raw.substring(0, 2), 16);
    const byte2 = parseInt(raw.substring(2, 4), 16);
    const methodCode = byte1 & 0x3f;
    rules.push({
      raw,
      methodCode,
      method: CVM_CODES[methodCode] ?? `Unknown CVM code 0x${methodCode.toString(16).toUpperCase()}`,
      continueOnFailure: (byte1 & 0x40) !== 0,
      conditionCode: byte2,
      condition:
        CVM_CONDITIONS[byte2] ??
        `Unknown / payment-system-specific condition 0x${byte2
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}`,
    });
  }

  if (rules.length === 0) errors.push("No CV Rules present");

  return { amountX, amountY, rules, errors };
}

/* --------------------------------------------------------------------- DOL */

export type DolEntry = {
  readonly tag: string;
  readonly name: string;
  readonly length: number;
  /** Byte offset of this entry's data within the assembled DOL value. */
  readonly dataOffset: number;
};

export type DolDecoding = {
  readonly entries: DolEntry[];
  /** Total bytes the terminal must supply for this list. */
  readonly totalBytes: number;
  readonly errors: string[];
};

/**
 * Decode a Data Object List (tag-and-length list): PDOL (9F38), CDOL1 (8C),
 * CDOL2 (8D), TDOL (97), Log Format (9F4F). Values are tag + length pairs
 * with no data.
 */
export function decodeDol(hexValue: string): DolDecoding {
  const errors: string[] = [];
  const hex = hexValue.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  const entries: DolEntry[] = [];

  let pos = 0;
  let dataOffset = 0;

  while (pos < hex.length) {
    if (pos + 2 > hex.length) {
      errors.push(`Truncated tag at byte ${pos / 2}`);
      break;
    }

    // BER-TLV tag: subsequent bytes follow while the high bit is set.
    let tag = hex.substring(pos, pos + 2);
    pos += 2;
    if ((parseInt(tag, 16) & 0x1f) === 0x1f) {
      let guard = 0;
      while (pos + 2 <= hex.length) {
        const next = hex.substring(pos, pos + 2);
        pos += 2;
        tag += next;
        if ((parseInt(next, 16) & 0x80) === 0) break;
        if (++guard > 8) {
          errors.push("Tag longer than 10 bytes — malformed list");
          break;
        }
      }
    }

    if (pos + 2 > hex.length) {
      errors.push(`Tag ${tag} has no length byte`);
      break;
    }

    const length = parseInt(hex.substring(pos, pos + 2), 16);
    pos += 2;

    entries.push({
      tag,
      name: getTagInfo(tag)?.name ?? "Unknown tag",
      length,
      dataOffset,
    });
    dataOffset += length;
  }

  if (entries.length === 0) errors.push("No tag-length pairs found");

  return { entries, totalBytes: dataOffset, errors };
}
