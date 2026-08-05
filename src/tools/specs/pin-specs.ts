/**
 * PIN block, PIN verification and card security value calculators.
 */

import type { CalculatorSpec } from "../types";
import {
  cardVerificationValue,
  decodePinBlock,
  decryptHex,
  encodePinBlock,
  encryptHex,
  ibm3624Offset,
  ibm3624PinFromOffset,
  panBlock,
  visaPvv,
  type PinBlockFormat,
} from "@/utils/crypto/pin-blocks";

const FORMAT_OPTIONS = [
  { value: "0", label: "ISO 9564 Format 0 (PAN bound)" },
  { value: "1", label: "ISO 9564 Format 1 (no PAN)" },
  { value: "2", label: "ISO 9564 Format 2 (no PAN)" },
  { value: "3", label: "ISO 9564 Format 3 (PAN bound)" },
];

const needsPan = (v: Record<string, string>) =>
  v.format === "0" || v.format === "3";

export const pinBlockEncoder: CalculatorSpec = {
  kind: "calculator",
  id: "pin-block-encode",
  name: "PIN block builder",
  group: "PIN blocks",
  description:
    "Build a clear ISO 9564 PIN block, and optionally encrypt it under a PIN encryption key.",
  keywords: ["pin block", "iso 9564", "format 0", "format 1", "format 3", "pin"],
  note: "Formats 0 and 3 XOR the PIN with a block derived from the PAN, so the same PIN produces a different block on a different card.",
  fields: [
    {
      name: "format",
      label: "Format",
      type: "select",
      defaultValue: "0",
      options: FORMAT_OPTIONS,
    },
    { name: "pin", label: "PIN", type: "text", mono: true, placeholder: "1234" },
    {
      name: "pan",
      label: "PAN",
      type: "text",
      mono: true,
      placeholder: "4111111111111111",
      showIf: needsPan,
    },
    {
      name: "pad",
      label: "Pad nibbles (optional)",
      type: "text",
      mono: true,
      help: "Formats 1 and 3 use random padding. Fix it here for reproducible output.",
      showIf: (v) => v.format === "1" || v.format === "3",
    },
    {
      name: "key",
      label: "PIN encryption key (optional, hex)",
      type: "text",
      mono: true,
      help: "Supply a 16- or 24-byte key to also see the encrypted block.",
    },
  ],
  example: { format: "0", pin: "1234", pan: "4111111111111111" },
  compute: (v) => {
    const clear = encodePinBlock(
      v.format as PinBlockFormat,
      v.pin,
      v.pan || undefined,
      v.pad || undefined
    );
    const results = [{ label: "Clear PIN block", value: clear }];

    if (needsPan(v) && v.pan) {
      results.push({ label: "PAN block", value: panBlock(v.pan) });
    }
    if (v.key.trim()) {
      results.push({
        label: "Encrypted PIN block",
        value: encryptHex({
          algorithm: "3DES",
          keyHex: v.key,
          dataHex: clear,
        }),
      });
    }
    return results;
  },
};

export const pinBlockDecoder: CalculatorSpec = {
  kind: "calculator",
  id: "pin-block-decode",
  name: "PIN block decoder",
  group: "PIN blocks",
  description:
    "Recover the PIN from a clear or encrypted PIN block. Formats 0 and 3 need the PAN to unmask.",
  keywords: ["pin block", "decode", "extract pin", "iso 9564"],
  fields: [
    {
      name: "block",
      label: "PIN block (8 bytes, hex)",
      type: "text",
      mono: true,
      placeholder: "041226FFEEDDCCBB",
    },
    {
      name: "key",
      label: "PIN encryption key (optional, hex)",
      type: "text",
      mono: true,
      help: "Supply a key if the block is encrypted; it is decrypted first.",
    },
    {
      name: "pan",
      label: "PAN (needed for formats 0 and 3)",
      type: "text",
      mono: true,
      placeholder: "4111111111111111",
    },
  ],
  example: {
    block: encodePinBlock("0", "1234", "4111111111111111"),
    pan: "4111111111111111",
  },
  compute: (v) => {
    const block = v.key.trim()
      ? decryptHex({ algorithm: "3DES", keyHex: v.key, dataHex: v.block })
      : v.block;

    const decoded = decodePinBlock(block, v.pan || undefined);
    const results = [
      { label: "PIN", value: decoded.pin },
      { label: "Format", value: `ISO 9564 Format ${decoded.format}`, mono: false },
      { label: "Clear block", value: decoded.clearBlock },
    ];
    if (v.key.trim()) {
      results.splice(2, 0, { label: "Decrypted block", value: block });
    }
    for (const warning of decoded.warnings) {
      results.push({ label: "Warning", value: warning, mono: false });
    }
    return results;
  },
};

export const visaPvvCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "visa-pvv",
  name: "Visa PVV",
  group: "PIN verification",
  description:
    "PIN Verification Value: the rightmost eleven PAN digits, the key index and the PIN, 3DES encrypted and decimalised to four digits.",
  keywords: ["pvv", "visa", "pin verification value"],
  fields: [
    { name: "pan", label: "PAN", type: "text", mono: true },
    {
      name: "index",
      label: "PIN key index",
      type: "text",
      mono: true,
      defaultValue: "1",
      placeholder: "1",
    },
    { name: "pin", label: "PIN (4 digits)", type: "text", mono: true },
    {
      name: "key",
      label: "PVV key (hex)",
      type: "text",
      mono: true,
      placeholder: "0123456789ABCDEFFEDCBA9876543210",
    },
  ],
  example: {
    pan: "4111111111111111",
    index: "1",
    pin: "1234",
    key: "0123456789ABCDEFFEDCBA9876543210",
  },
  compute: (v) => [
    { label: "PVV", value: visaPvv(v.pan, v.index, v.pin, v.key) },
  ],
};

export const ibm3624Calculator: CalculatorSpec = {
  kind: "calculator",
  id: "ibm-3624-offset",
  name: "IBM 3624 offset",
  group: "PIN verification",
  description:
    "Derive the natural PIN from the validation data, then the offset that maps it to the customer's chosen PIN.",
  keywords: ["ibm 3624", "offset", "natural pin", "decimalisation"],
  note: "The offset is the digit-wise difference, modulo 10, between the chosen PIN and the natural PIN. It is not secret.",
  fields: [
    {
      name: "validation",
      label: "Validation data (16 hex digits)",
      type: "text",
      mono: true,
      placeholder: "4111111111111111",
      help: "Usually derived from the PAN, padded to 8 bytes.",
    },
    { name: "key", label: "PIN generation key (hex)", type: "text", mono: true },
    { name: "pin", label: "Customer PIN", type: "text", mono: true },
    {
      name: "table",
      label: "Decimalisation table",
      type: "text",
      mono: true,
      defaultValue: "0123456789012345",
      help: "Maps hex digits A–F onto decimal digits.",
    },
  ],
  example: {
    validation: "4111111111111111",
    key: "0123456789ABCDEFFEDCBA9876543210",
    pin: "1234",
    table: "0123456789012345",
  },
  compute: (v) => {
    const { naturalPin, offset } = ibm3624Offset(
      v.validation,
      v.key,
      v.pin,
      v.table || undefined
    );
    // Prove the offset round-trips back to the entered PIN.
    const recovered = ibm3624PinFromOffset(
      v.validation,
      v.key,
      offset,
      v.table || undefined
    );
    return [
      { label: "Natural PIN", value: naturalPin },
      { label: "Offset", value: offset },
      {
        label: "PIN recovered from offset",
        value: recovered,
        note:
          recovered === v.pin.replace(/[^0-9]/g, "")
            ? "Matches the PIN you entered."
            : "Does not match the entered PIN — check the inputs.",
      },
    ];
  },
};

export const ibm3624PinExtract: CalculatorSpec = {
  kind: "calculator",
  id: "ibm-3624-pin",
  name: "PIN from IBM 3624 offset",
  group: "PIN verification",
  description:
    "Recover the customer PIN from the validation data, generation key and offset.",
  keywords: ["ibm 3624", "pin extract", "recover pin", "offset"],
  fields: [
    {
      name: "validation",
      label: "Validation data (16 hex digits)",
      type: "text",
      mono: true,
    },
    { name: "key", label: "PIN generation key (hex)", type: "text", mono: true },
    { name: "offset", label: "Offset", type: "text", mono: true },
    {
      name: "table",
      label: "Decimalisation table",
      type: "text",
      mono: true,
      defaultValue: "0123456789012345",
    },
  ],
  compute: (v) => [
    {
      label: "PIN",
      value: ibm3624PinFromOffset(
        v.validation,
        v.key,
        v.offset,
        v.table || undefined
      ),
    },
  ],
};

export const cvvCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "cvv-calculator",
  name: "CVV / CVC calculator",
  group: "Card security values",
  description:
    "Card verification value from the PAN, expiry and service code under a CVK pair. The same algorithm produces CVV, CVC and CVV2 — only the service code differs.",
  keywords: ["cvv", "cvc", "cvv2", "cvc2", "card verification value"],
  note: "Service code 000 with the expiry gives CVV2/CVC2; the encoded track service code gives the magnetic-stripe CVV.",
  fields: [
    { name: "pan", label: "PAN", type: "text", mono: true },
    {
      name: "expiry",
      label: "Expiry (YYMM)",
      type: "text",
      mono: true,
      placeholder: "2512",
    },
    {
      name: "service",
      label: "Service code",
      type: "text",
      mono: true,
      placeholder: "201",
    },
    { name: "cvkA", label: "CVK A (8 bytes, hex)", type: "text", mono: true },
    { name: "cvkB", label: "CVK B (8 bytes, hex)", type: "text", mono: true },
  ],
  example: {
    pan: "4111111111111111",
    expiry: "2512",
    service: "201",
    cvkA: "0123456789ABCDEF",
    cvkB: "FEDCBA9876543210",
  },
  compute: (v) => [
    {
      label: "CVV / CVC",
      value: cardVerificationValue(
        v.pan,
        v.expiry,
        v.service,
        v.cvkA,
        v.cvkB
      ),
    },
  ],
};

export const pinSpecs: CalculatorSpec[] = [
  pinBlockEncoder,
  pinBlockDecoder,
  visaPvvCalculator,
  ibm3624Calculator,
  ibm3624PinExtract,
  cvvCalculator,
];
