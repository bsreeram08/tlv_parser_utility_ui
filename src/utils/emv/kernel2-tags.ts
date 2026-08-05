/**
 * Mastercard Kernel 2 (PayPass) data dictionary.
 *
 * Names are taken verbatim from EMV Contactless Book C-2, Kernel 2 Spec v2.11
 * (June 2023), Annex A "Data Dictionary" — A.1 by name and A.2 by tag. The
 * `DF81xx` range is Kernel 2 proprietary, which is why a generic EMV tag list
 * shows all of it as unknown.
 *
 * IMPORTANT — some tags mean different things in different kernels. 9F66 is the
 * Visa TTQ in Kernel 3 but PUNATC(Track2) in Kernel 2; 9F6D is a Mag-stripe
 * Application Version Number in Kernel 2 but Contactless Reader Capabilities in
 * Kernel 4; 9F6E is Third Party Data in Kernel 2 but Enhanced Contactless
 * Reader Capabilities in Kernel 4. Those live in KERNEL_TAG_OVERRIDES below and
 * must be resolved with the kernel in hand, never from the tag alone.
 */

import { type EmvTag, TagClass, TagFormat } from "@/types/tlv";

const REF = "EMV Contactless Book C-2 (Kernel 2) v2.11, Annex A";

const primitive = (
  id: string,
  name: string,
  description: string,
  length?: number
): EmvTag => ({
  id,
  name,
  description,
  format: TagFormat.PRIMITIVE,
  class: TagClass.PRIVATE,
  ...(length !== undefined ? { fixedLength: length } : {}),
  isPropriety: true,
});

/** Kernel 2 proprietary data objects (the DF81xx / DF6x range). */
export const KERNEL2_TAGS: EmvTag[] = [
  // --- Reader capability and configuration -------------------------------
  primitive("DF8117", "Card Data Input Capability", `Card data input capability of the terminal and reader. ${REF}`, 1),
  primitive("DF8118", "CVM Capability – CVM Required", `CVM capability when the transaction amount is greater than the Reader CVM Required Limit. ${REF}`, 1),
  primitive("DF8119", "CVM Capability – No CVM Required", `CVM capability when the transaction amount is less than or equal to the Reader CVM Required Limit. ${REF}`, 1),
  primitive("DF811A", "Default UDOL", `The UDOL to use if the card does not supply one. ${REF}`),
  primitive("DF811B", "Kernel Configuration", `Kernel configuration options — mag-stripe and EMV mode support, on-device CVM, relay resistance. ${REF}`, 1),
  primitive("DF811E", "Mag-stripe CVM Capability – CVM Required", `CVM capability for a mag-stripe mode transaction above the Reader CVM Required Limit. ${REF}`, 1),
  primitive("DF812C", "Mag-stripe CVM Capability – No CVM Required", `CVM capability for a mag-stripe mode transaction at or below the Reader CVM Required Limit. ${REF}`, 1),
  primitive("DF811F", "Security Capability", `Security capability of the kernel — SDA, DDA, card capture, CDA. ${REF}`, 1),
  primitive("DF810C", "Kernel ID", `Identifies the kernel. ${REF}`, 1),
  primitive("DF810D", "DSVN Term", `Data Storage Version Number supported by the terminal. ${REF}`),

  // --- Terminal Action Codes ---------------------------------------------
  primitive("DF8120", "Terminal Action Code – Default", `TAC applied when the transaction is completed offline. ${REF}`, 5),
  primitive("DF8121", "Terminal Action Code – Denial", `TAC applied to decline the transaction offline. ${REF}`, 5),
  primitive("DF8122", "Terminal Action Code – Online", `TAC applied when the transaction goes online. ${REF}`, 5),

  // --- Limits -------------------------------------------------------------
  primitive("DF8123", "Reader Contactless Floor Limit", `Above this amount the transaction must go online. ${REF}`, 6),
  primitive("DF8124", "Reader Contactless Transaction Limit (No On-device CVM)", `Ceiling for a contactless transaction when the device performs no CVM. ${REF}`, 6),
  primitive("DF8125", "Reader Contactless Transaction Limit (On-device CVM)", `Ceiling for a contactless transaction when the device performs CVM. ${REF}`, 6),
  primitive("DF8126", "Reader CVM Required Limit", `At or above this amount cardholder verification is required. Note Kernel 2 compares amount > limit, whereas Visa, AMEX and Discover compare amount >= limit. ${REF}`, 6),
  primitive("DF8127", "Time Out Value", `Card response time-out, in units of 100 ms. ${REF}`, 2),

  // --- Messaging and timing ----------------------------------------------
  primitive("DF812D", "Message Hold Time", `Default hold time for a message to remain displayed, in units of 100 ms. ${REF}`, 3),
  primitive("DF8130", "Hold Time Value", `Time the field is turned off after the transaction, in units of 100 ms. ${REF}`, 1),
  primitive("DF8131", "Phone Message Table", `Table mapping POS Cardholder Interaction Information to a message and outcome. ${REF}`),

  // --- Relay resistance protocol -----------------------------------------
  primitive("DF8132", "Minimum Relay Resistance Grace Period", `Lower bound of the acceptable relay resistance measurement window. ${REF}`, 2),
  primitive("DF8133", "Maximum Relay Resistance Grace Period", `Upper bound of the acceptable relay resistance measurement window. ${REF}`, 2),
  primitive("DF8134", "Terminal Expected Transmission Time For Relay Resistance C-APDU", `Expected time to transmit the relay resistance command, in units of 100 µs. ${REF}`, 2),
  primitive("DF8135", "Terminal Expected Transmission Time For Relay Resistance R-APDU", `Expected time to receive the relay resistance response, in units of 100 µs. ${REF}`, 2),
  primitive("DF8136", "Relay Resistance Accuracy Threshold", `Accuracy threshold for the relay resistance time check. ${REF}`, 2),
  primitive("DF8137", "Relay Resistance Transmission Time Mismatch Threshold", `Permitted mismatch, as a percentage, between expected and measured transmission time. ${REF}`, 1),

  // --- Data storage / integrated data storage ----------------------------
  primitive("DF8108", "DS AC Type", `Data Storage application cryptogram type. ${REF}`, 1),
  primitive("DF8109", "DS Input (Term)", `Data Storage input supplied by the terminal. ${REF}`, 8),
  primitive("DF810A", "DS ODS Info For Reader", `Data Storage operator data set information for the reader. ${REF}`, 1),
  primitive("DF810B", "DS Summary Status", `Status of the Data Storage summary. ${REF}`, 1),
  primitive("DF8101", "DS Summary 2", `Second Data Storage summary. ${REF}`),
  primitive("DF8102", "DS Summary 3", `Third Data Storage summary. ${REF}`),
  primitive("DF8110", "Proceed To First Write Flag", `Controls whether the kernel proceeds to the first write. ${REF}`, 1),
  primitive("DF8128", "IDS Status", `Integrated Data Storage status. ${REF}`, 1),
  primitive("DF60", "DS Input (Card)", `Data Storage input supplied by the card. ${REF}`),
  primitive("DF62", "DS ODS Info", `Data Storage operator data set information. ${REF}`, 1),
  primitive("DF63", "DS ODS Term", `Data Storage operator data set terminal data. ${REF}`),

  // --- Kernel working data ------------------------------------------------
  primitive("DF8106", "Data Needed", `List of data the kernel still requires. ${REF}`),
  primitive("DF8107", "CDOL1 Related Data", `Data assembled for the CDOL1 of the GENERATE AC command. ${REF}`),
  primitive("DF8111", "PDOL Related Data", `Data assembled for the PDOL of the GET PROCESSING OPTIONS command. ${REF}`),
  primitive("DF8112", "Tags To Read", `Tags the kernel has been asked to read. ${REF}`),
  primitive("DF8114", "Reference Control Parameter", `Reference control parameter for the GENERATE AC command. ${REF}`, 1),
  primitive("DF8115", "Error Indication", `Why the kernel terminated, when it did so on an error. ${REF}`, 6),
  primitive("DF8116", "User Interface Request Data", `Message, status and hold time the kernel asks the reader to display. ${REF}`, 22),
  primitive("DF8129", "Outcome Parameter Set", `The kernel's outcome — approve, decline, go online, try another interface. ${REF}`, 8),
  primitive("DF812A", "DD Card (Track1)", `Discretionary data for Track 1 in mag-stripe mode. ${REF}`),
  primitive("DF812B", "DD Card (Track2)", `Discretionary data for Track 2 in mag-stripe mode. ${REF}`),
  primitive("DF810E", "Post-Gen AC Put Data Status", `Status of PUT DATA after GENERATE AC. ${REF}`, 1),
  primitive("DF810F", "Pre-Gen AC Put Data Status", `Status of PUT DATA before GENERATE AC. ${REF}`, 1),
  primitive("DF4B", "POS Cardholder Interaction Information", `Cardholder device interaction information returned by the card. ${REF}`, 3),

  // 9F6D's meaning is kernel-dependent. The Kernel 2 name is the default here;
  // KERNEL_TAG_OVERRIDES supplies the Kernel 4 meaning.
  primitive(
    "9F6D",
    "Mag-stripe Application Version Number (Reader)",
    `Reader mag-stripe application version number in Kernel 2. In Kernel 4 (AMEX) the same tag is Contactless Reader Capabilities — resolve it with the kernel in hand. ${REF}`,
    2
  ),
];

/**
 * Tags that appear in real configurations but are NOT defined in any EMV book.
 *
 * C-2's data dictionary runs DF8101–DF8137 with gaps, and DF811C, DF811D,
 * DF8103–DF8105, DF8113 and DF812E–DF812F fall in those gaps. They are
 * therefore Mastercard- or vendor-proprietary. They are listed here so the
 * parser stops calling them simply "Unknown", while stating plainly that no
 * published specification defines them — guessing a name would be worse than
 * admitting the gap.
 */
export const UNDOCUMENTED_TAGS: EmvTag[] = [
  {
    id: "DF811C",
    name: "Undocumented Kernel 2 proprietary tag",
    description:
      "Not defined in EMV Contactless Book C-2 v2.11 — the dictionary skips from DF811B to DF811E. Mastercard- or vendor-proprietary; confirm its meaning with the kernel supplier before changing it.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.PRIVATE,
    isPropriety: true,
  },
  {
    id: "DF811D",
    name: "Undocumented Kernel 2 proprietary tag",
    description:
      "Not defined in EMV Contactless Book C-2 v2.11 — the dictionary skips from DF811B to DF811E. Mastercard- or vendor-proprietary; confirm its meaning with the kernel supplier before changing it.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.PRIVATE,
    isPropriety: true,
  },
  {
    id: "EF",
    name: "Undocumented proprietary tag",
    description:
      "Not an EMV tag: 'EF' appears in no EMV 4.4 book or contactless kernel specification. Almost certainly a vendor container added by the config supplier. Confirm before relying on it.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.PRIVATE,
    isPropriety: true,
  },
];

/**
 * Standard EMV tags that a generic list often misses, with the names EMVCo
 * actually uses. Sources noted per entry.
 */
export const ADDITIONAL_STANDARD_TAGS: EmvTag[] = [
  {
    id: "9F1E",
    name: "Interface Device (IFD) Serial Number",
    description:
      "Unique and permanent serial number of the interface device. EMV 4.4 Book 4 / Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 8,
    valueType: "text",
  },
  {
    id: "9F39",
    name: "Point-of-Service (POS) Entry Mode",
    description:
      "Indicates the method by which the PAN was entered. EMV 4.4 Book 3, Annex A / Book 4.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
    valueType: "numeric",
  },
  {
    id: "9F01",
    name: "Acquirer Identifier",
    description:
      "Uniquely identifies the acquirer within each payment system. EMV 4.4 Book 3, Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 6,
    valueType: "numeric",
  },
  {
    id: "9F16",
    name: "Merchant Identifier",
    description:
      "Identifies the merchant to the acquirer. EMV 4.4 Book 3, Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 15,
    valueType: "text",
  },
  {
    id: "9F1C",
    name: "Terminal Identification",
    description:
      "Designates the unique location of a terminal at a merchant. EMV 4.4 Book 3, Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 8,
    valueType: "text",
  },
  {
    id: "9F4E",
    name: "Merchant Name and Location",
    description:
      "Indicates the name and location of the merchant. EMV 4.4 Book 3, Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    valueType: "text",
  },
  {
    id: "9F7E",
    name: "Mobile Support Indicator",
    description:
      "Indicates the reader's support for a mobile device, and whether on-device CVM is required. Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
  },
  {
    id: "9F08",
    name: "Application Version Number (Card)",
    description:
      "Version number assigned by the payment system for the application in the card. Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
  },
  {
    id: "9F1D",
    name: "Terminal Risk Management Data",
    description:
      "Application-specific value used by the card for risk management purposes. Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 8,
  },
  {
    id: "9F5D",
    name: "Application Capabilities Information",
    description:
      "Lists the card's capabilities, including support for Data Storage. Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 3,
  },
  {
    id: "9F5B",
    name: "DSDOL",
    description:
      "Data Storage Data Object List. Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
  },
  {
    id: "9F6A",
    name: "Unpredictable Number (Numeric)",
    description:
      "Terminal-generated unpredictable number in numeric form, used in mag-stripe mode. Book C-2 Annex A.",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 4,
    valueType: "numeric",
  },
];

/**
 * Tags whose meaning depends on the kernel. Resolve with the kernel in hand.
 *
 * The `default` name registered in the global registry is the most common usage
 * in these configs; the override is what the kernel's own book says.
 */
export const KERNEL_TAG_OVERRIDES: Record<
  number,
  Record<string, { name: string; description: string }>
> = {
  2: {
    "9F09": {
      name: "Application Version Number (Reader)",
      description:
        "Version number assigned by the payment system for the application in the reader. Kernel 2 distinguishes this from 9F08, the card's version. Book C-2 Annex A.",
    },
    "9F6D": {
      name: "Mag-stripe Application Version Number (Reader)",
      description:
        "Reader's mag-stripe application version number. Book C-2 Annex A. Not to be confused with 9F6D in Kernel 4, which is Contactless Reader Capabilities.",
    },
    "9F6E": {
      name: "Third Party Data",
      description:
        "Card-sourced data for a third party. In Kernel 2 this is NOT a terminal reader-config value — injecting a static value here is semantically wrong and has broken kernel setup. Book C-2 Annex A.",
    },
    "9F66": {
      name: "PUNATC(Track2)",
      description:
        "Positions of the Unpredictable Number and ATC digits in Track 2 discretionary data. In Kernel 2 this is card-sourced and is NOT the Visa TTQ. Book C-2 Annex A.",
    },
    "9F53": {
      name: "Transaction Category Code",
      description:
        "Single character indicating the transaction category. Book C-2 Annex A.",
    },
  },
  3: {
    "9F66": {
      name: "Terminal Transaction Qualifiers (TTQ)",
      description:
        "Visa contactless reader capabilities and transaction requirements. Book C-3 (Kernel 3) v2.11.",
    },
    "9F6C": {
      name: "Card Transaction Qualifiers (CTQ)",
      description:
        "Card-supplied CVM and interface instructions. Book C-3 (Kernel 3) v2.11.",
    },
  },
  4: {
    "9F6D": {
      name: "Contactless Reader Capabilities",
      description:
        "AMEX proprietary reader capabilities, see C-4 Table 4-2. Not the Kernel 2 mag-stripe version number.",
    },
    "9F6E": {
      name: "Enhanced Contactless Reader Capabilities",
      description:
        "AMEX proprietary terminal-supplied reader capabilities, see C-4 Table 4-4. Legitimately a reader-config value here, unlike in Kernel 2.",
    },
  },
};

/**
 * Resolve a tag name for a given kernel. Falls back to the caller's default
 * when the kernel has no specific meaning for that tag.
 */
export function resolveKernelTagName(
  tag: string,
  kernelId: number | undefined,
  fallback: string | undefined
): { name: string; description?: string; kernelSpecific: boolean } {
  if (kernelId === undefined) {
    return { name: fallback ?? "Unknown tag", kernelSpecific: false };
  }
  const override = KERNEL_TAG_OVERRIDES[kernelId]?.[tag.toUpperCase()];
  if (override) {
    return {
      name: override.name,
      description: override.description,
      kernelSpecific: true,
    };
  }
  return { name: fallback ?? "Unknown tag", kernelSpecific: false };
}

/** True when this tag means different things in different kernels. */
export function isKernelDependentTag(tag: string): boolean {
  const upper = tag.toUpperCase();
  const kernels = Object.values(KERNEL_TAG_OVERRIDES).filter(
    (map) => upper in map
  );
  return kernels.length > 1;
}
