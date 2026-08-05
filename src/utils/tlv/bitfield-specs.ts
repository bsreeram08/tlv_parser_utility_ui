/**
 * Bitfield tag specifications
 *
 * Data-only definitions for EMV tags whose value is a fixed-length bitmap
 * (and/or small enum fields). One generic renderer (`BitfieldTag`) consumes
 * these, so adding a tag means adding a spec here — not a new component.
 *
 * Bit masks are per-byte (0x80 = b8 … 0x01 = b1) to match EMV bit numbering.
 * Enum keys are the *masked byte value* (already in position), so no shifting.
 */

/** A single toggleable bit within a byte. */
export type BitDef = {
  readonly mask: number;
  readonly label: string;
  readonly note?: string;
};

/** A multi-bit enum field within a byte. Keys of `values` are masked values. */
export type EnumDef = {
  readonly mask: number;
  readonly label: string;
  readonly values: Readonly<Record<number, string>>;
};

/** One byte of a bitfield tag. */
export type ByteDef = {
  readonly name: string;
  readonly bits?: readonly BitDef[];
  readonly enums?: readonly EnumDef[];
};

/** A preset value offered in the editor. */
export type PresetDef = {
  readonly name: string;
  readonly value: string;
  readonly desc: string;
};

export type BitfieldSpec = {
  readonly tag: string;
  readonly name: string;
  readonly description: string;
  /** Spec reference shown in the info tooltip. */
  readonly ref: string;
  /** Extra caveat shown inline (e.g. kernel-dependent meaning). */
  readonly note?: string;
  readonly bytes: readonly ByteDef[];
  readonly presets?: readonly PresetDef[];
};

const RFU = "RFU";

/**
 * Visa Terminal Transaction Qualifiers (VCPS 2.x).
 * Byte-2 b8/b7 are *transient* — the reader sets them at run time from the
 * floor / CVM-required limits. A static 1 forces the behaviour on every txn.
 */
const TTQ_9F66: BitfieldSpec = {
  tag: "9F66",
  name: "Terminal Transaction Qualifiers (TTQ)",
  description:
    "Visa contactless reader capabilities and transaction requirements.",
  ref: "Visa VCPS 2.x, Terminal Transaction Qualifiers",
  note: "Visa kernel (kernel 3). Byte 2 bits 8 and 7 are transient — normally 0 in a static config; the reader sets them per transaction from the floor and CVM-required limits.",
  bytes: [
    {
      name: "Byte 1 — Reader capabilities",
      bits: [
        { mask: 0x80, label: "Mag-stripe mode supported" },
        { mask: 0x40, label: RFU },
        { mask: 0x20, label: "EMV mode (qVSDC) supported" },
        { mask: 0x10, label: "EMV contact chip supported" },
        { mask: 0x08, label: "Offline-only reader" },
        { mask: 0x04, label: "Online PIN supported" },
        {
          mask: 0x02,
          label: "Signature supported",
          note: "On unattended/SoftPOS this can resolve to No-CVM and suppress the PIN prompt",
        },
        {
          mask: 0x01,
          label: "Offline Data Authentication for Online Authorizations (fDDA)",
        },
      ],
    },
    {
      name: "Byte 2 — Transaction requirements",
      bits: [
        {
          mask: 0x80,
          label: "Online cryptogram required",
          note: "Transient — set by the reader when the amount exceeds the floor limit",
        },
        {
          mask: 0x40,
          label: "CVM required",
          note: "Transient — set by the reader when the amount reaches the CVM-required limit. A static 1 demands CVM on every transaction",
        },
        { mask: 0x20, label: "(Contact chip) Offline PIN supported" },
      ],
    },
    {
      name: "Byte 3 — Additional capabilities",
      bits: [
        { mask: 0x80, label: "Issuer Update Processing supported" },
        { mask: 0x40, label: "Consumer Device CVM (CDCVM) supported" },
      ],
    },
    { name: "Byte 4 — RFU" },
  ],
  presets: [
    {
      name: "SoftPOS online PIN",
      value: "24804000",
      desc: "qVSDC + Online PIN + CDCVM, online cryptogram required",
    },
    {
      name: "+ Signature",
      value: "26804000",
      desc: "As above plus Signature CVM advertised",
    },
    {
      name: "+ fDDA",
      value: "25804000",
      desc: "As SoftPOS online PIN plus offline data authentication for online auths",
    },
    {
      name: "Mag-stripe + EMV",
      value: "A4804000",
      desc: "Mag-stripe and EMV mode both supported",
    },
  ],
};

/** Visa Card Transaction Qualifiers — card-sourced, read-only in practice. */
const CTQ_9F6C: BitfieldSpec = {
  tag: "9F6C",
  name: "Card Transaction Qualifiers (CTQ)",
  description:
    "Card-supplied CVM and interface instructions for a Visa contactless transaction.",
  ref: "Visa VCPS 2.x, Card Transaction Qualifiers",
  note: "Card-sourced. Belongs in the online request tags, never in a terminal reader config.",
  bytes: [
    {
      name: "Byte 1 — CVM and interface instructions",
      bits: [
        { mask: 0x80, label: "Online PIN required" },
        { mask: 0x40, label: "Signature required" },
        {
          mask: 0x20,
          label:
            "Go online if offline data authentication fails and reader is online capable",
        },
        {
          mask: 0x10,
          label:
            "Switch interface if offline data authentication fails and reader supports contact chip",
        },
        { mask: 0x08, label: "Go online if application expired" },
        { mask: 0x04, label: "Switch interface for cash transactions" },
        { mask: 0x02, label: "Switch interface for cashback transactions" },
        { mask: 0x01, label: RFU },
      ],
    },
    {
      name: "Byte 2 — CDCVM and issuer update",
      bits: [
        { mask: 0x80, label: "Consumer Device CVM performed" },
        { mask: 0x40, label: "Card supports Issuer Update Processing at POS" },
      ],
    },
  ],
};

/** EMV Book 4 §A.2 — Additional Terminal Capabilities. */
const ADDITIONAL_TERMINAL_CAPABILITIES_9F40: BitfieldSpec = {
  tag: "9F40",
  name: "Additional Terminal Capabilities",
  description:
    "Data input, output and transaction-type capabilities of the terminal.",
  ref: "EMV 4.4 Book 4, Annex A.2",
  bytes: [
    {
      name: "Byte 1 — Transaction type capability",
      bits: [
        { mask: 0x80, label: "Cash" },
        { mask: 0x40, label: "Goods" },
        { mask: 0x20, label: "Services" },
        { mask: 0x10, label: "Cashback" },
        { mask: 0x08, label: "Inquiry" },
        { mask: 0x04, label: "Transfer" },
        { mask: 0x02, label: "Payment" },
        { mask: 0x01, label: "Administrative" },
      ],
    },
    {
      name: "Byte 2 — Transaction type capability",
      bits: [{ mask: 0x80, label: "Cash deposit" }],
    },
    {
      name: "Byte 3 — Terminal data input capability",
      bits: [
        { mask: 0x80, label: "Numeric keys" },
        { mask: 0x40, label: "Alphabetic and special character keys" },
        { mask: 0x20, label: "Command keys" },
        { mask: 0x10, label: "Function keys" },
      ],
    },
    {
      name: "Byte 4 — Terminal data output capability",
      bits: [
        { mask: 0x80, label: "Print, attendant" },
        { mask: 0x40, label: "Print, cardholder" },
        { mask: 0x20, label: "Display, attendant" },
        { mask: 0x10, label: "Display, cardholder" },
        { mask: 0x02, label: "Code table 10" },
        { mask: 0x01, label: "Code table 9" },
      ],
    },
    {
      name: "Byte 5 — Terminal data output capability",
      bits: [
        { mask: 0x80, label: "Code table 8" },
        { mask: 0x40, label: "Code table 7" },
        { mask: 0x20, label: "Code table 6" },
        { mask: 0x10, label: "Code table 5" },
        { mask: 0x08, label: "Code table 4" },
        { mask: 0x04, label: "Code table 3" },
        { mask: 0x02, label: "Code table 2" },
        { mask: 0x01, label: "Code table 1" },
      ],
    },
  ],
  presets: [
    {
      name: "Attended POS",
      value: "6000F0A001",
      desc: "Goods + services, full keypad, print and display",
    },
    {
      name: "SoftPOS",
      value: "6000004000",
      desc: "Goods + services, cardholder display only",
    },
  ],
};

/** EMV Book 3 — Application Usage Control (card-sourced). */
const AUC_9F07: BitfieldSpec = {
  tag: "9F07",
  name: "Application Usage Control",
  description:
    "Issuer restrictions on the geographic and service usage of the application.",
  ref: "EMV 4.4 Book 3, Annex A",
  note: "Card-sourced.",
  bytes: [
    {
      name: "Byte 1 — Usage",
      bits: [
        { mask: 0x80, label: "Valid for domestic cash transactions" },
        { mask: 0x40, label: "Valid for international cash transactions" },
        { mask: 0x20, label: "Valid for domestic goods" },
        { mask: 0x10, label: "Valid for international goods" },
        { mask: 0x08, label: "Valid for domestic services" },
        { mask: 0x04, label: "Valid for international services" },
        { mask: 0x02, label: "Valid at ATMs" },
        { mask: 0x01, label: "Valid at terminals other than ATMs" },
      ],
    },
    {
      name: "Byte 2 — Cashback",
      bits: [
        { mask: 0x80, label: "Domestic cashback allowed" },
        { mask: 0x40, label: "International cashback allowed" },
      ],
    },
  ],
};

/** EMV Book 3 — Transaction Status Information. */
const TSI_9B: BitfieldSpec = {
  tag: "9B",
  name: "Transaction Status Information",
  description:
    "Which functions were performed during the transaction, as seen by the terminal.",
  ref: "EMV 4.4 Book 3, Annex C6",
  bytes: [
    {
      name: "Byte 1 — Functions performed",
      bits: [
        { mask: 0x80, label: "Offline data authentication was performed" },
        { mask: 0x40, label: "Cardholder verification was performed" },
        { mask: 0x20, label: "Card risk management was performed" },
        { mask: 0x10, label: "Issuer authentication was performed" },
        { mask: 0x08, label: "Terminal risk management was performed" },
        { mask: 0x04, label: "Script processing was performed" },
      ],
    },
    { name: "Byte 2 — RFU" },
  ],
};

/** EMV Book 3 — Cryptogram Information Data. */
const CID_9F27: BitfieldSpec = {
  tag: "9F27",
  name: "Cryptogram Information Data",
  description:
    "Type of application cryptogram returned by the card, plus advice information.",
  ref: "EMV 4.4 Book 3, Annex C7",
  bytes: [
    {
      name: "Byte 1 — Cryptogram type and advice",
      enums: [
        {
          mask: 0xc0,
          label: "Cryptogram type",
          values: {
            0x00: "AAC — decline (offline)",
            0x40: "TC — approve (offline)",
            0x80: "ARQC — go online",
            0xc0: "AAR — referral",
          },
        },
        {
          mask: 0x07,
          label: "Reason / advice code",
          values: {
            0x00: "No information given",
            0x01: "Service not allowed",
            0x02: "PIN Try Limit exceeded",
            0x03: "Issuer authentication failed",
          },
        },
      ],
      bits: [{ mask: 0x08, label: "Advice required" }],
    },
  ],
  presets: [
    { name: "ARQC", value: "80", desc: "Go online, no advice" },
    { name: "TC", value: "40", desc: "Approved offline" },
    { name: "AAC", value: "00", desc: "Declined offline" },
  ],
};

/** EMV Book 4 Table A1 — Terminal Type (a numeric enum, not a bitmap). */
const TERMINAL_TYPE_9F35: BitfieldSpec = {
  tag: "9F35",
  name: "Terminal Type",
  description:
    "Environment, control and online capability of the terminal (BCD-style value).",
  ref: "EMV 4.4 Book 4, Annex A.1",
  bytes: [
    {
      name: "Terminal type",
      enums: [
        {
          mask: 0xff,
          label: "Type",
          values: {
            0x11: "11 — Attended, financial institution, online only",
            0x12: "12 — Attended, financial institution, offline with online capability",
            0x13: "13 — Attended, financial institution, offline only",
            0x14: "14 — Unattended, financial institution, online only",
            0x15: "15 — Unattended, financial institution, offline with online capability",
            0x16: "16 — Unattended, financial institution, offline only",
            0x21: "21 — Attended, merchant, online only",
            0x22: "22 — Attended, merchant, offline with online capability",
            0x23: "23 — Attended, merchant, offline only",
            0x24: "24 — Unattended, merchant, online only",
            0x25: "25 — Unattended, merchant, offline with online capability",
            0x26: "26 — Unattended, merchant, offline only",
            0x34: "34 — Unattended, cardholder, online only",
            0x35: "35 — Unattended, cardholder, offline with online capability",
            0x36: "36 — Unattended, cardholder, offline only",
          },
        },
      ],
    },
  ],
};

/* --------------------------------- Mastercard Kernel 2 (Book C-2 Annex A) */

const K2_REF = "EMV Contactless Book C-2 (Kernel 2) v2.11, Annex A";

const CARD_DATA_INPUT_CAPABILITY_DF8117: BitfieldSpec = {
  tag: "DF8117",
  name: "Card Data Input Capability",
  description: "Card data input capability of the terminal and reader.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard). A contactless-only reader legitimately has all of these clear.",
  bytes: [
    {
      name: "Byte 1 — Card data input",
      bits: [
        { mask: 0x80, label: "Manual key entry" },
        { mask: 0x40, label: "Magnetic stripe" },
        { mask: 0x20, label: "IC with contacts" },
      ],
    },
  ],
};

/** DF8118 and DF8119 share one bit layout, differing only in when they apply. */
const CVM_CAPABILITY_BITS: ByteDef = {
  name: "Byte 1 — CVM capability",
  bits: [
    { mask: 0x80, label: "Plaintext PIN for ICC verification" },
    { mask: 0x40, label: "Enciphered PIN for online verification" },
    { mask: 0x20, label: "Signature (paper)" },
    { mask: 0x10, label: "Enciphered PIN for offline verification" },
    { mask: 0x08, label: "No CVM required" },
  ],
};

const CVM_CAPABILITY_REQUIRED_DF8118: BitfieldSpec = {
  tag: "DF8118",
  name: "CVM Capability – CVM Required",
  description:
    "CVM capability used when the transaction amount is greater than the Reader CVM Required Limit.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard). This is the above-limit case; DF8119 covers at-or-below the limit.",
  bytes: [CVM_CAPABILITY_BITS],
  presets: [
    { name: "Online PIN", value: "40", desc: "Enciphered PIN online only" },
    { name: "Online PIN + signature", value: "60", desc: "PIN or signature" },
    { name: "No CVM", value: "08", desc: "No CVM required" },
  ],
};

const CVM_CAPABILITY_NO_CVM_DF8119: BitfieldSpec = {
  tag: "DF8119",
  name: "CVM Capability – No CVM Required",
  description:
    "CVM capability used when the transaction amount is less than or equal to the Reader CVM Required Limit.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard). This is the at-or-below-limit case; DF8118 covers above the limit.",
  bytes: [CVM_CAPABILITY_BITS],
  presets: [
    { name: "No CVM", value: "08", desc: "No CVM required below the limit" },
  ],
};

const KERNEL_CONFIGURATION_DF811B: BitfieldSpec = {
  tag: "DF811B",
  name: "Kernel Configuration",
  description: "Kernel configuration options.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard). Bits 8 and 7 are NEGATIVE — set means the mode is NOT supported.",
  bytes: [
    {
      name: "Byte 1 — Kernel options",
      bits: [
        {
          mask: 0x80,
          label: "Mag-stripe mode contactless transactions NOT supported",
          note: "Inverted sense: set means unsupported. Not applicable if MAG is not implemented.",
        },
        {
          mask: 0x40,
          label: "EMV mode contactless transactions NOT supported",
          note: "Inverted sense: set means unsupported.",
        },
        { mask: 0x20, label: "On-device cardholder verification supported" },
        { mask: 0x10, label: "Relay resistance protocol supported" },
        { mask: 0x08, label: "Reserved for payment system" },
        { mask: 0x04, label: "Read all records even when no CDA" },
      ],
    },
  ],
  presets: [
    {
      name: "EMV only + CDCVM",
      value: "A0",
      desc: "Mag-stripe disabled, on-device CVM supported",
    },
  ],
};

/** DF811E and DF812C share one 4-bit CVM enum. */
const MAGSTRIPE_CVM_ENUM: EnumDef = {
  mask: 0xf0,
  label: "CVM",
  values: {
    0x00: "No CVM",
    0x10: "Obtain signature",
    0x20: "Online PIN",
    0xf0: "Not applicable",
  },
};

const MAGSTRIPE_CVM_REQUIRED_DF811E: BitfieldSpec = {
  tag: "DF811E",
  name: "Mag-stripe CVM Capability – CVM Required",
  description:
    "CVM capability for a mag-stripe mode transaction when the authorised amount is greater than the Reader CVM Required Limit.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard). Only meaningful when mag-stripe mode is enabled — check DF811B bit 8.",
  bytes: [{ name: "Byte 1 — Mag-stripe CVM", enums: [MAGSTRIPE_CVM_ENUM] }],
};

const MAGSTRIPE_CVM_NO_CVM_DF812C: BitfieldSpec = {
  tag: "DF812C",
  name: "Mag-stripe CVM Capability – No CVM Required",
  description:
    "CVM capability for a mag-stripe mode transaction when the authorised amount is at or below the Reader CVM Required Limit.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard). Only meaningful when mag-stripe mode is enabled — check DF811B bit 8.",
  bytes: [{ name: "Byte 1 — Mag-stripe CVM", enums: [MAGSTRIPE_CVM_ENUM] }],
};

const SECURITY_CAPABILITY_DF811F: BitfieldSpec = {
  tag: "DF811F",
  name: "Security Capability",
  description: "Security capability of the kernel.",
  ref: K2_REF,
  note: "Kernel 2 (Mastercard).",
  bytes: [
    {
      name: "Byte 1 — Security capability",
      bits: [
        { mask: 0x80, label: "SDA" },
        { mask: 0x40, label: "DDA" },
        { mask: 0x20, label: "Card capture" },
        { mask: 0x08, label: "CDA" },
      ],
    },
  ],
  presets: [{ name: "CDA only", value: "08", desc: "Combined DDA/AC generation" }],
};

/** All bitfield specs, keyed by tag. */
export const bitfieldSpecs: Readonly<Record<string, BitfieldSpec>> = {
  DF8117: CARD_DATA_INPUT_CAPABILITY_DF8117,
  DF8118: CVM_CAPABILITY_REQUIRED_DF8118,
  DF8119: CVM_CAPABILITY_NO_CVM_DF8119,
  DF811B: KERNEL_CONFIGURATION_DF811B,
  DF811E: MAGSTRIPE_CVM_REQUIRED_DF811E,
  DF812C: MAGSTRIPE_CVM_NO_CVM_DF812C,
  DF811F: SECURITY_CAPABILITY_DF811F,
  "9F66": TTQ_9F66,
  "9F6C": CTQ_9F6C,
  "9F40": ADDITIONAL_TERMINAL_CAPABILITIES_9F40,
  "9F07": AUC_9F07,
  "9B": TSI_9B,
  "9F27": CID_9F27,
  "9F35": TERMINAL_TYPE_9F35,
};

/** Expected value length in bytes for a spec. */
export function specByteLength(spec: BitfieldSpec): number {
  return spec.bytes.length;
}

/**
 * Decode a hex value into a flat list of set-bit / enum descriptions.
 * Used by the renderer summary and by the byte map tooltips.
 */
export function describeBitfield(
  spec: BitfieldSpec,
  hexValue: string
): string[] {
  const out: string[] = [];
  spec.bytes.forEach((byteDef, i) => {
    const byteHex = hexValue.substring(i * 2, i * 2 + 2);
    if (byteHex.length < 2) return;
    const byteVal = parseInt(byteHex, 16);
    if (Number.isNaN(byteVal)) return;

    byteDef.enums?.forEach((e) => {
      const masked = byteVal & e.mask;
      const label = e.values[masked];
      if (label) out.push(`${e.label}: ${label}`);
    });
    byteDef.bits?.forEach((b) => {
      if (b.label === RFU) return;
      if ((byteVal & b.mask) !== 0) out.push(b.label);
    });
  });
  return out;
}
