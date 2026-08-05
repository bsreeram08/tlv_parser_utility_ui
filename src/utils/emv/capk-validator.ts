/**
 * CA public key (CAPK) validator.
 *
 * A scheme CA public key entry carries its own SHA-1 checksum over
 * RID ‖ index ‖ modulus ‖ exponent. When a key is edited by hand or mangled in
 * transit, the modulus changes but the checksum is often left untouched — the
 * config still looks well-formed, and the kernel rejects the key at
 * initialisation, which can leave a terminal stuck in a boot loop rather than
 * failing one transaction. Recomputing the checksum catches that class of
 * corruption before the config is signed and pushed.
 */

import sha1 from "crypto-js/sha1";
import hexEncoding from "crypto-js/enc-hex";

/** Modulus lengths (in bits) that EMV scheme CA keys actually use. */
const VALID_MODULUS_BITS = [1024, 1152, 1408, 1536, 1984, 2048];

/** Scheme RIDs, for a friendlier label. */
const RID_NAMES: Record<string, string> = {
  A000000003: "Visa",
  A000000004: "Mastercard",
  A000000025: "American Express",
  A000000065: "JCB",
  A000000152: "Discover / Diners",
  A000000333: "UnionPay",
  A000001523: "Dankort / other",
};

export type CapkInput = {
  /** Registered Application Provider Identifier, 5 bytes hex. */
  readonly rid: string;
  /** Key index, 1 byte hex. */
  readonly index: string;
  readonly modulus: string;
  readonly exponent: string;
  /** Expected SHA-1 checksum, 20 bytes hex. Optional — omit to just compute. */
  readonly checksum?: string;
  /** Expiry date as MMYY, optional. */
  readonly expiry?: string;
};

export type CapkIssue = {
  readonly severity: "error" | "warning";
  readonly field: "rid" | "index" | "modulus" | "exponent" | "checksum" | "expiry";
  readonly message: string;
};

export type CapkValidation = {
  readonly schemeName?: string;
  readonly modulusBits: number;
  /** Recomputed SHA-1 over RID ‖ index ‖ modulus ‖ exponent, uppercase hex. */
  readonly computedChecksum: string;
  /** True only when a checksum was supplied and it matches. */
  readonly checksumMatches: boolean | null;
  readonly issues: CapkIssue[];
};

const clean = (value: string) => value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();

/** SHA-1 over the concatenated hex fields, per EMV Book 2. */
export function computeCapkChecksum(
  rid: string,
  index: string,
  modulus: string,
  exponent: string
): string {
  const payload = clean(rid) + clean(index) + clean(modulus) + clean(exponent);
  return sha1(hexEncoding.parse(payload)).toString(hexEncoding).toUpperCase();
}

export function validateCapk(input: CapkInput): CapkValidation {
  const issues: CapkIssue[] = [];

  const rid = clean(input.rid);
  const index = clean(input.index);
  const modulus = clean(input.modulus);
  const exponent = clean(input.exponent);
  const checksum = input.checksum ? clean(input.checksum) : "";

  /* --- RID ---------------------------------------------------------------- */
  if (rid.length !== 10) {
    issues.push({
      severity: "error",
      field: "rid",
      message: `RID must be 5 bytes (10 hex digits); got ${rid.length} digits.`,
    });
  }

  /* --- Index -------------------------------------------------------------- */
  if (index.length !== 2) {
    issues.push({
      severity: "error",
      field: "index",
      message: `Key index must be 1 byte (2 hex digits); got ${index.length} digits.`,
    });
  }

  /* --- Modulus ------------------------------------------------------------ */
  // An odd digit count is the signature of a character inserted or dropped
  // mid-value — exactly how a mangled modulus presents.
  if (modulus.length % 2 !== 0) {
    issues.push({
      severity: "error",
      field: "modulus",
      message: `Modulus has ${modulus.length} hex digits, which is odd — it cannot be a whole number of bytes. A character was probably inserted or lost.`,
    });
  }
  if (modulus.length === 0) {
    issues.push({
      severity: "error",
      field: "modulus",
      message: "Modulus is empty.",
    });
  }

  const modulusBits = Math.floor(modulus.length / 2) * 8;
  if (modulus.length > 0 && !VALID_MODULUS_BITS.includes(modulusBits)) {
    issues.push({
      severity: "warning",
      field: "modulus",
      message: `Modulus is ${modulusBits} bits (${
        modulus.length / 2
      } bytes). EMV scheme CA keys are normally ${VALID_MODULUS_BITS.join(
        ", "
      )} bits.`,
    });
  }
  if (modulus.length > 0 && !/^[0-9A-F]+$/.test(modulus)) {
    issues.push({
      severity: "error",
      field: "modulus",
      message: "Modulus contains non-hexadecimal characters.",
    });
  }
  // A leading zero byte means the stated length overstates the real key size.
  if (modulus.startsWith("00")) {
    issues.push({
      severity: "warning",
      field: "modulus",
      message:
        "Modulus starts with a zero byte, so the effective key is smaller than its length suggests. Check for accidental padding.",
    });
  }

  /* --- Exponent ----------------------------------------------------------- */
  const exponentValue = exponent ? parseInt(exponent, 16) : NaN;
  if (!exponent) {
    issues.push({
      severity: "error",
      field: "exponent",
      message: "Exponent is empty.",
    });
  } else if (exponentValue !== 3 && exponentValue !== 65537) {
    issues.push({
      severity: "warning",
      field: "exponent",
      message: `Exponent is 0x${exponent} (${exponentValue}). EMV CA keys use 3 (03) or 65537 (010001).`,
    });
  }

  /* --- Expiry ------------------------------------------------------------- */
  if (input.expiry) {
    const expiry = clean(input.expiry);
    if (expiry.length !== 4) {
      issues.push({
        severity: "warning",
        field: "expiry",
        message: `Expiry should be 4 digits (MMYY); got "${input.expiry}".`,
      });
    } else {
      const month = parseInt(expiry.substring(0, 2), 10);
      if (month < 1 || month > 12) {
        issues.push({
          severity: "error",
          field: "expiry",
          message: `Expiry month "${expiry.substring(
            0,
            2
          )}" is not 01–12. Note the field is MMYY, not YYMM.`,
        });
      }
    }
  }

  /* --- Checksum ----------------------------------------------------------- */
  const computedChecksum = computeCapkChecksum(rid, index, modulus, exponent);
  let checksumMatches: boolean | null = null;

  if (input.checksum) {
    if (checksum.length !== 40) {
      issues.push({
        severity: "error",
        field: "checksum",
        message: `Checksum must be a 20-byte SHA-1 (40 hex digits); got ${checksum.length} digits.`,
      });
    }
    checksumMatches = checksum === computedChecksum;
    if (!checksumMatches) {
      issues.push({
        severity: "error",
        field: "checksum",
        message: `Checksum does not match. Stated ${checksum || "(empty)"}, computed ${computedChecksum}. Either the key data is corrupt or the checksum was not regenerated after an edit.`,
      });
    }
  }

  return {
    schemeName: RID_NAMES[rid],
    modulusBits,
    computedChecksum,
    checksumMatches,
    issues,
  };
}
