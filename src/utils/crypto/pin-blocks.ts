/**
 * ISO 9564 PIN block encoding and decoding, plus PIN verification values.
 *
 * These are the standard, publicly specified algorithms used to build and
 * check PIN blocks in terminal and host testing. Formats 0 and 3 bind the PIN
 * to the PAN; formats 1 and 2 do not.
 */

import { decryptHex, encryptHex, xorHex } from "./block-ciphers";

export type PinBlockFormat = "0" | "1" | "2" | "3";

const cleanHex = (v: string) => v.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
const cleanDigits = (v: string) => v.replace(/[^0-9]/g, "");

function assertPin(pin: string): string {
  const digits = cleanDigits(pin);
  if (digits.length < 4 || digits.length > 12) {
    throw new Error(`PIN must be 4–12 digits; got ${digits.length}.`);
  }
  return digits;
}

/**
 * The PAN block for formats 0 and 3: twelve digits of the PAN, taken as the
 * rightmost twelve excluding the check digit, right-aligned in 16 nibbles.
 */
export function panBlock(pan: string): string {
  const digits = cleanDigits(pan);
  if (digits.length < 13) {
    throw new Error(`PAN must be at least 13 digits; got ${digits.length}.`);
  }
  const withoutCheckDigit = digits.substring(0, digits.length - 1);
  const twelve = withoutCheckDigit.slice(-12).padStart(12, "0");
  return `0000${twelve}`;
}

/**
 * Build a clear PIN block.
 *
 * `padNibbles` supplies the random padding for formats 1 and 3 so the result
 * stays deterministic and testable; omit it and a fixed pad is used.
 */
export function encodePinBlock(
  format: PinBlockFormat,
  pin: string,
  pan?: string,
  padNibbles?: string
): string {
  const digits = assertPin(pin);
  const length = digits.length.toString(16).toUpperCase();

  switch (format) {
    case "0": {
      if (!pan) throw new Error("Format 0 needs a PAN.");
      const block = `0${length}${digits}`.padEnd(16, "F");
      return xorHex(block, panBlock(pan));
    }
    case "1": {
      // Format 1 pads with random nibbles and carries no PAN.
      const pad = (padNibbles ?? "A".repeat(14)).toUpperCase();
      const block = `1${length}${digits}${pad}`.substring(0, 16);
      return block.padEnd(16, "A");
    }
    case "2": {
      return `2${length}${digits}`.padEnd(16, "F");
    }
    case "3": {
      if (!pan) throw new Error("Format 3 needs a PAN.");
      // Format 3 pads with random nibbles in the range A–F.
      const pad = (padNibbles ?? "A".repeat(14)).toUpperCase();
      const block = `3${length}${digits}${pad}`.substring(0, 16).padEnd(16, "A");
      return xorHex(block, panBlock(pan));
    }
  }
}

export type DecodedPinBlock = {
  format: PinBlockFormat;
  pin: string;
  /** The block after the PAN has been XORed back out, for formats 0 and 3. */
  clearBlock: string;
  warnings: string[];
};

/** Recover the PIN from a clear PIN block. */
export function decodePinBlock(
  blockHex: string,
  pan?: string
): DecodedPinBlock {
  const block = cleanHex(blockHex);
  if (block.length !== 16) {
    throw new Error(`A PIN block is 8 bytes (16 hex digits); got ${
      block.length
    }.`);
  }

  const warnings: string[] = [];
  const declaredFormat = block[0];

  // Formats 0 and 3 are XORed with the PAN block, so the format nibble is only
  // readable after the PAN is removed. Try that first when a PAN is supplied.
  let working = block;
  if (pan) {
    const unmasked = xorHex(block, panBlock(pan));
    if (unmasked[0] === "0" || unmasked[0] === "3") {
      working = unmasked;
    } else if (declaredFormat !== "1" && declaredFormat !== "2") {
      warnings.push(
        `After removing the PAN the first nibble is ${unmasked[0]}, which is not a format 0 or 3 marker. The PAN or the block may be wrong.`
      );
      working = unmasked;
    }
  }

  const format = working[0] as PinBlockFormat;
  if (!["0", "1", "2", "3"].includes(format)) {
    throw new Error(
      `First nibble is ${format}, which is not a supported PIN block format (0–3).${
        pan ? "" : " Formats 0 and 3 need the PAN to unmask."
      }`
    );
  }
  if ((format === "0" || format === "3") && !pan) {
    warnings.push(
      "This looks like format 0 or 3, which is XORed with the PAN — supply the PAN or the recovered PIN will be wrong."
    );
  }

  const pinLength = parseInt(working[1], 16);
  if (Number.isNaN(pinLength) || pinLength < 4 || pinLength > 12) {
    throw new Error(
      `The length nibble decodes to ${working[1]} (${pinLength}), outside the valid 4–12 range.`
    );
  }

  const pin = working.substring(2, 2 + pinLength);
  if (!/^\d+$/.test(pin)) {
    warnings.push(
      `The recovered PIN "${pin}" contains non-decimal digits, so the block or PAN is probably incorrect.`
    );
  }

  return { format, pin, clearBlock: working, warnings };
}

/**
 * Decimalise a hex string using the IBM 3624 method: take decimal digits in
 * order, then map the hex letters through the decimalisation table.
 */
export function decimalise(
  hex: string,
  table = "0123456789012345"
): string {
  const cleaned = cleanHex(hex);
  const digits: string[] = [];
  const letters: string[] = [];

  for (const ch of cleaned) {
    if (ch >= "0" && ch <= "9") digits.push(ch);
    else letters.push(table[parseInt(ch, 16)]);
  }

  return digits.join("") + letters.join("");
}

/**
 * Visa PIN Verification Value.
 *
 * The transformed security parameter is the rightmost eleven PAN digits
 * (excluding the check digit), the key index, and the four PIN digits. That is
 * 3DES encrypted and decimalised to four digits.
 */
export function visaPvv(
  pan: string,
  pinKeyIndex: string,
  pin: string,
  pvvKeyHex: string
): string {
  const panDigits = cleanDigits(pan);
  const pinDigits = cleanDigits(pin);
  const index = cleanDigits(pinKeyIndex);

  if (panDigits.length < 13) throw new Error("PAN must be at least 13 digits.");
  if (pinDigits.length !== 4) {
    throw new Error("Visa PVV is defined for a 4-digit PIN.");
  }
  if (index.length !== 1) throw new Error("PIN key index must be one digit.");

  const withoutCheckDigit = panDigits.substring(0, panDigits.length - 1);
  const eleven = withoutCheckDigit.slice(-11).padStart(11, "0");
  const tsp = `${eleven}${index}${pinDigits}`;

  const encrypted = encryptHex({
    algorithm: "3DES",
    keyHex: pvvKeyHex,
    dataHex: tsp,
  });

  // Decimalise by taking decimal digits first, then hex letters minus 10.
  let out = "";
  for (const ch of encrypted) {
    if (out.length === 4) break;
    if (ch >= "0" && ch <= "9") out += ch;
  }
  for (const ch of encrypted) {
    if (out.length === 4) break;
    if (ch >= "A" && ch <= "F") out += String(parseInt(ch, 16) - 10);
  }
  return out;
}

/**
 * IBM 3624 natural PIN: encrypt the validation data with the PIN generation
 * key, decimalise, and take the first `length` digits.
 */
export function ibm3624NaturalPin(
  validationDataHex: string,
  keyHex: string,
  length = 4,
  table?: string
): string {
  const encrypted = encryptHex({
    algorithm: "3DES",
    keyHex,
    dataHex: cleanHex(validationDataHex),
  });
  return decimalise(encrypted, table).substring(0, length);
}

/**
 * IBM 3624 offset: the digit-wise difference, modulo 10, between the customer's
 * chosen PIN and the natural PIN derived from the validation data.
 */
export function ibm3624Offset(
  validationDataHex: string,
  keyHex: string,
  customerPin: string,
  table?: string
): { naturalPin: string; offset: string } {
  const pin = cleanDigits(customerPin);
  if (pin.length < 4) throw new Error("PIN must be at least 4 digits.");

  const naturalPin = ibm3624NaturalPin(
    validationDataHex,
    keyHex,
    pin.length,
    table
  );

  let offset = "";
  for (let i = 0; i < pin.length; i++) {
    offset += String(
      (Number(pin[i]) - Number(naturalPin[i]) + 10) % 10
    );
  }
  return { naturalPin, offset };
}

/** Recover the PIN from an IBM 3624 offset. */
export function ibm3624PinFromOffset(
  validationDataHex: string,
  keyHex: string,
  offset: string,
  table?: string
): string {
  const offsetDigits = cleanDigits(offset);
  const naturalPin = ibm3624NaturalPin(
    validationDataHex,
    keyHex,
    offsetDigits.length,
    table
  );
  let pin = "";
  for (let i = 0; i < offsetDigits.length; i++) {
    pin += String((Number(naturalPin[i]) + Number(offsetDigits[i])) % 10);
  }
  return pin;
}

/**
 * Card verification value (CVV / CVC / CVV2, same algorithm with different
 * service codes). The PAN, expiry and service code form a 16-byte block; the
 * left half is DES encrypted, XORed with the right half, then 3DES applied,
 * and the result decimalised to three digits.
 */
export function cardVerificationValue(
  pan: string,
  expiryYYMM: string,
  serviceCode: string,
  cvkAHex: string,
  cvkBHex: string
): string {
  const panDigits = cleanDigits(pan);
  const expiry = cleanDigits(expiryYYMM);
  const service = cleanDigits(serviceCode);

  if (panDigits.length < 13) throw new Error("PAN must be at least 13 digits.");
  if (expiry.length !== 4) throw new Error("Expiry must be 4 digits (YYMM).");
  if (service.length !== 3) throw new Error("Service code must be 3 digits.");

  const keyA = cleanHex(cvkAHex);
  const keyB = cleanHex(cvkBHex);
  if (keyA.length !== 16 || keyB.length !== 16) {
    throw new Error("CVK A and CVK B are each 8 bytes (16 hex digits).");
  }

  const block = `${panDigits}${expiry}${service}`.padEnd(32, "0").substring(0, 32);
  const left = block.substring(0, 16);
  const right = block.substring(16, 32);

  const step1 = encryptHex({ algorithm: "DES", keyHex: keyA, dataHex: left });
  const step2 = xorHex(step1, right);
  // 3DES with K1=CVK A, K2=CVK B.
  const step3 = encryptHex({
    algorithm: "3DES",
    keyHex: keyA + keyB,
    dataHex: step2,
  });

  let out = "";
  for (const ch of step3) {
    if (out.length === 3) break;
    if (ch >= "0" && ch <= "9") out += ch;
  }
  for (const ch of step3) {
    if (out.length === 3) break;
    if (ch >= "A" && ch <= "F") out += String(parseInt(ch, 16) - 10);
  }
  return out;
}

/** Re-export so PIN tools can round-trip an encrypted block in one place. */
export { encryptHex, decryptHex };
