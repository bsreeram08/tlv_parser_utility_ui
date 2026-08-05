/**
 * Converters, card-number utilities and EMV tag decoder shortcuts.
 */

import type { CalculatorSpec } from "../types";
import {
  asciiToHex,
  base64ToHex,
  bitwise,
  completePan,
  decodeIso8583Bitmap,
  encodeIso8583Bitmap,
  fromJulianCyyddd,
  generateTestPans,
  hexToAscii,
  hexToBase64,
  luhnCheckDigit,
  toJulianCyyddd,
  type BitwiseOperation,
} from "@/utils/converters";
import { luhnCheck } from "@/utils/tlv/payment-decoders";
import {
  bitfieldSpecs,
  describeBitfield,
  type BitfieldSpec,
} from "@/utils/tlv/bitfield-specs";
import {
  decodeCvmList,
  decodeDol,
  decodeTrack2,
  maskPan,
} from "@/utils/tlv/payment-decoders";

export const hexAsciiConverter: CalculatorSpec = {
  kind: "calculator",
  id: "hex-ascii",
  name: "Hex ↔ ASCII",
  group: "Converters",
  description: "Convert between hex bytes and single-byte text both ways.",
  keywords: ["hex", "ascii", "text", "convert"],
  fields: [
    {
      name: "direction",
      label: "Direction",
      type: "select",
      defaultValue: "hexToAscii",
      options: [
        { value: "hexToAscii", label: "Hex → ASCII" },
        { value: "asciiToHex", label: "ASCII → Hex" },
      ],
    },
    { name: "input", label: "Input", type: "textarea", mono: true },
  ],
  example: { direction: "hexToAscii", input: "5445524D494E414C" },
  compute: (v) => [
    {
      label: v.direction === "asciiToHex" ? "Hex" : "ASCII",
      value:
        v.direction === "asciiToHex"
          ? asciiToHex(v.input)
          : hexToAscii(v.input),
      note:
        v.direction === "hexToAscii"
          ? "Non-printable bytes are shown as a dot."
          : undefined,
    },
  ],
};

export const base64Converter: CalculatorSpec = {
  kind: "calculator",
  id: "base64-converter",
  name: "Base64 ↔ Hex",
  group: "Converters",
  description:
    "Convert between base64 and hex — terminal configs and certificates travel as base64.",
  keywords: ["base64", "hex", "b64", "convert", "encode", "decode"],
  fields: [
    {
      name: "direction",
      label: "Direction",
      type: "select",
      defaultValue: "base64ToHex",
      options: [
        { value: "base64ToHex", label: "Base64 → Hex" },
        { value: "hexToBase64", label: "Hex → Base64" },
      ],
    },
    { name: "input", label: "Input", type: "textarea", mono: true },
  ],
  example: { direction: "base64ToHex", input: "n2YEJIBAAA==" },
  compute: (v) => [
    {
      label: v.direction === "hexToBase64" ? "Base64" : "Hex",
      value:
        v.direction === "hexToBase64"
          ? hexToBase64(v.input)
          : base64ToHex(v.input),
    },
  ],
};

export const bitwiseCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "bitwise-calculator",
  name: "Bitwise calculator",
  group: "Converters",
  description: "AND, OR, XOR and NOT over hex values, with a binary view.",
  keywords: ["bitwise", "and", "or", "xor", "not", "mask", "binary"],
  fields: [
    {
      name: "operation",
      label: "Operation",
      type: "select",
      defaultValue: "AND",
      options: [
        { value: "AND", label: "AND" },
        { value: "OR", label: "OR" },
        { value: "XOR", label: "XOR" },
        { value: "NOT", label: "NOT (one input)" },
      ],
    },
    { name: "a", label: "Value A (hex)", type: "text", mono: true },
    {
      name: "b",
      label: "Value B (hex)",
      type: "text",
      mono: true,
      showIf: (v) => v.operation !== "NOT",
    },
  ],
  example: { operation: "AND", a: "24804000", b: "00800000" },
  compute: (v) => {
    const result = bitwise(v.operation as BitwiseOperation, v.a, v.b);
    const binary = (result.match(/.{2}/g) ?? [])
      .map((byte: string) => parseInt(byte, 16).toString(2).padStart(8, "0"))
      .join(" ");
    return [
      { label: "Result (hex)", value: result },
      { label: "Result (binary)", value: binary },
    ];
  },
};

export const julianDateConverter: CalculatorSpec = {
  kind: "calculator",
  id: "julian-date",
  name: "Julian date (CYYDDD)",
  group: "Converters",
  description:
    "Convert between calendar dates and the CYYDDD form used in card and clearing data.",
  keywords: ["julian", "cyyddd", "date", "day of year"],
  fields: [
    {
      name: "direction",
      label: "Direction",
      type: "select",
      defaultValue: "toJulian",
      options: [
        { value: "toJulian", label: "Date → CYYDDD" },
        { value: "fromJulian", label: "CYYDDD → Date" },
      ],
    },
    {
      name: "input",
      label: "Input",
      type: "text",
      mono: true,
      placeholder: "2026-08-04",
    },
  ],
  example: { direction: "toJulian", input: "2026-08-04" },
  compute: (v) => [
    {
      label: v.direction === "toJulian" ? "CYYDDD" : "Date",
      value:
        v.direction === "toJulian"
          ? toJulianCyyddd(v.input)
          : fromJulianCyyddd(v.input),
    },
  ],
};

export const luhnTool: CalculatorSpec = {
  kind: "calculator",
  id: "luhn",
  name: "Luhn check / check digit",
  group: "Card numbers",
  description:
    "Validate a PAN, or compute the check digit for a number supplied without one.",
  keywords: ["luhn", "mod 10", "check digit", "pan", "validate"],
  fields: [
    { name: "pan", label: "Card number", type: "text", mono: true },
  ],
  example: { pan: "411111111111111" },
  compute: (v) => {
    const digits = v.pan.replace(/[^0-9]/g, "");
    return [
      {
        label: "Luhn valid as entered",
        value: luhnCheck(digits) ? "Yes" : "No",
        mono: false,
      },
      {
        label: "Check digit if this is the number without one",
        value: luhnCheckDigit(digits),
      },
      { label: "Completed number", value: completePan(digits) },
      {
        label: "Masked",
        value: maskPan(digits),
        note: "First six and last four retained.",
      },
    ];
  },
};

export const testCardGenerator: CalculatorSpec = {
  kind: "calculator",
  id: "test-card-generator",
  name: "Test card generator",
  group: "Card numbers",
  description:
    "Generate structurally valid test PANs from a BIN. Deterministic from the seed. These pass Luhn but are not real accounts.",
  keywords: ["test card", "pan generator", "bin", "generate"],
  fields: [
    {
      name: "bin",
      label: "BIN / prefix",
      type: "text",
      mono: true,
      defaultValue: "411111",
    },
    { name: "length", label: "PAN length", type: "number", defaultValue: "16" },
    { name: "count", label: "How many", type: "number", defaultValue: "5" },
    { name: "seed", label: "Seed", type: "number", defaultValue: "1" },
  ],
  compute: (v) => {
    const cards = generateTestPans(
      v.bin,
      Number(v.length),
      Number(v.count),
      Number(v.seed) || 1
    );
    return [
      {
        label: `${cards.length} PANs`,
        value: cards.map((c) => c.pan).join("\n"),
      },
      {
        label: "All pass Luhn",
        value: cards.every((c) => c.valid) ? "Yes" : "No",
        mono: false,
      },
    ];
  },
};

export const iso8583BitmapTool: CalculatorSpec = {
  kind: "calculator",
  id: "iso8583-bitmap",
  name: "ISO 8583 bitmap",
  group: "ISO 8583",
  description:
    "Decode a bitmap into the field numbers it marks present, or build one from a field list.",
  keywords: ["iso 8583", "bitmap", "fields", "de"],
  fields: [
    {
      name: "direction",
      label: "Direction",
      type: "select",
      defaultValue: "decode",
      options: [
        { value: "decode", label: "Bitmap → fields" },
        { value: "encode", label: "Fields → bitmap" },
      ],
    },
    {
      name: "input",
      label: "Input",
      type: "textarea",
      mono: true,
      placeholder: "7238000108C00000  — or  2,3,4,7,11,12",
    },
  ],
  example: { direction: "decode", input: "7238000108C00000" },
  compute: (v) => {
    if (v.direction === "encode") {
      const fields = v.input
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map(Number);
      return [
        { label: "Bitmap", value: encodeIso8583Bitmap(fields) },
        {
          label: "Fields encoded",
          value: fields.sort((a, b) => a - b).join(", "),
          mono: false,
        },
      ];
    }
    const decoded = decodeIso8583Bitmap(v.input);
    return [
      {
        label: `${decoded.fields.length} fields present`,
        value: decoded.fields.join(", "),
        mono: false,
      },
      {
        label: "Secondary bitmap present",
        value: decoded.hasSecondary ? "Yes (bit 1 set)" : "No",
        mono: false,
      },
      { label: "Bits", value: decoded.bits },
    ];
  },
};

/* -------------------------------------------- EMV tag decoder shortcuts */

/**
 * Turn each bitfield spec into a standalone decoder tool, so a tag can be
 * decoded directly without building a TLV payload around it.
 */
function tagDecoderSpec(spec: BitfieldSpec): CalculatorSpec {
  const bytes = spec.bytes.length;
  return {
    kind: "calculator",
    id: `decode-${spec.tag.toLowerCase()}`,
    name: `${spec.name} (${spec.tag})`,
    group: "EMV tag decoders",
    description: spec.description,
    keywords: [spec.tag, spec.name, "decode", "tag"],
    note: spec.note,
    fields: [
      {
        name: "value",
        label: `Value (${bytes} byte${bytes === 1 ? "" : "s"}, hex)`,
        type: "text",
        mono: true,
        placeholder: "0".repeat(bytes * 2),
      },
    ],
    example: spec.presets?.[0] ? { value: spec.presets[0].value } : undefined,
    compute: (v) => {
      const clean = v.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
      const set = describeBitfield(spec, clean);
      const perByte = spec.bytes.map((byteDef, i) => {
        const byteHex = clean.substring(i * 2, i * 2 + 2) || "--";
        const byteVal = parseInt(byteHex, 16);
        return `${byteDef.name}: ${byteHex}${
          Number.isNaN(byteVal)
            ? ""
            : ` (${byteVal.toString(2).padStart(8, "0")})`
        }`;
      });

      return [
        {
          label: "Set flags",
          value: set.length > 0 ? set.map((s) => `• ${s}`).join("\n") : "None",
          mono: false,
        },
        { label: "Bytes", value: perByte.join("\n"), mono: false },
        {
          label: "Length check",
          value:
            clean.length === bytes * 2
              ? `OK — ${bytes} bytes`
              : `Expected ${bytes} bytes, got ${clean.length / 2}`,
          mono: false,
        },
      ];
    },
  };
}

export const cvmListDecoder: CalculatorSpec = {
  kind: "calculator",
  id: "decode-8e",
  name: "CVM List (8E)",
  group: "EMV tag decoders",
  description:
    "Decode the cardholder verification method list into its amounts and CV Rules in priority order.",
  keywords: ["8E", "cvm list", "cardholder verification"],
  fields: [
    { name: "value", label: "Value (hex)", type: "textarea", mono: true },
  ],
  example: { value: "000000000000000042001E031F02" },
  compute: (v) => {
    const cvm = decodeCvmList(v.value);
    return [
      { label: "Amount X", value: String(cvm.amountX) },
      { label: "Amount Y", value: String(cvm.amountY) },
      {
        label: `${cvm.rules.length} CV Rules`,
        value:
          cvm.rules
            .map(
              (r, i) =>
                `${i + 1}. [${r.raw}] ${r.method} — ${r.condition} (${
                  r.continueOnFailure ? "try next on failure" : "stop on failure"
                })`
            )
            .join("\n") || "None",
        mono: false,
      },
      ...(cvm.errors.length
        ? [{ label: "Problems", value: cvm.errors.join("\n"), mono: false }]
        : []),
    ];
  },
};

export const dolDecoder: CalculatorSpec = {
  kind: "calculator",
  id: "decode-dol",
  name: "DOL decoder (PDOL, CDOL, TDOL)",
  group: "EMV tag decoders",
  description:
    "Decode a tag-and-length list into the data objects the terminal must supply, with running offsets.",
  keywords: ["dol", "pdol", "cdol", "tdol", "9F38", "8C", "8D", "data object list"],
  fields: [
    { name: "value", label: "Value (hex)", type: "textarea", mono: true },
  ],
  example: { value: "9F66049F02069F03069F1A0295055F2A029A039C0195" },
  compute: (v) => {
    const dol = decodeDol(v.value);
    return [
      {
        label: `${dol.entries.length} entries, ${dol.totalBytes} bytes total`,
        value:
          dol.entries
            .map(
              (e, i) =>
                `${i + 1}. ${e.tag} (${e.length} byte${
                  e.length === 1 ? "" : "s"
                }, offset ${e.dataOffset}) — ${e.name}`
            )
            .join("\n") || "None",
        mono: false,
      },
      ...(dol.errors.length
        ? [{ label: "Problems", value: dol.errors.join("\n"), mono: false }]
        : []),
    ];
  },
};

export const track2Decoder: CalculatorSpec = {
  kind: "calculator",
  id: "decode-track2",
  name: "Track 2 decoder (57 / 9F6B)",
  group: "EMV tag decoders",
  description:
    "Split Track 2 data into PAN, expiry, service code and discretionary data, and Luhn-check the PAN.",
  keywords: ["track 2", "57", "9F6B", "pan", "service code"],
  fields: [
    { name: "value", label: "Track 2 data (hex)", type: "text", mono: true },
  ],
  example: { value: "4111111111111111D25122011234567890F" },
  compute: (v) => {
    const track = decodeTrack2(v.value);
    return [
      {
        label: "PAN (masked)",
        value: maskPan(track.pan),
        note: "Use the TLV parser's Track 2 view to reveal it.",
      },
      {
        label: "Expiry",
        value:
          track.expiry.length === 4
            ? `20${track.expiry.substring(0, 2)}-${track.expiry.substring(2)}`
            : track.expiry || "—",
      },
      { label: "Service code", value: track.serviceCode || "—" },
      {
        label: "Luhn",
        value: track.panValid ? "Passes" : "Fails",
        mono: false,
      },
      ...(track.errors.length
        ? [{ label: "Problems", value: track.errors.join("\n"), mono: false }]
        : []),
    ];
  },
};

export const tagDecoderSpecs: CalculatorSpec[] = Object.values(bitfieldSpecs)
  .map(tagDecoderSpec)
  .concat([cvmListDecoder, dolDecoder, track2Decoder]);

export const utilSpecs: CalculatorSpec[] = [
  hexAsciiConverter,
  base64Converter,
  bitwiseCalculator,
  julianDateConverter,
  luhnTool,
  testCardGenerator,
  iso8583BitmapTool,
];
