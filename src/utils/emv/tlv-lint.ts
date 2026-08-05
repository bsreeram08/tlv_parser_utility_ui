/**
 * EMV sanity checks over a parsed TLV payload.
 *
 * Every rule here corresponds to a defect that has actually shipped to a
 * terminal fleet: a country code copied into the currency field, a test AID
 * left in a production config, placeholder terminal identifiers, a tag whose
 * length contradicts its EMV definition. The parser tells you what the bytes
 * are; this tells you whether they are plausible.
 */

import type { TlvElement, TlvParsingResult } from "@/types/tlv";
import { getCountryByNumeric } from "./country-codes";

export type LintSeverity = "error" | "warning" | "info";

export type LintFinding = {
  readonly id: string;
  readonly severity: LintSeverity;
  /** Tags the finding relates to. */
  readonly tags: string[];
  readonly title: string;
  readonly detail: string;
};

/** Flatten a parsed tree into a tag -> element lookup (first occurrence wins). */
function indexByTag(elements: TlvElement[]): Map<string, TlvElement> {
  const index = new Map<string, TlvElement>();
  const walk = (list: TlvElement[]) => {
    for (const element of list) {
      if (!index.has(element.tag)) index.set(element.tag, element);
      if (element.children) walk(element.children);
    }
  };
  walk(elements);
  return index;
}

/** Known EMV test AIDs that must never appear in a production config. */
const TEST_AIDS = [
  "B012345678",
  "A0000000999090",
  "A00000002501C1",
  "F0000000030001",
];

/** Placeholder values commonly left in terminal identity fields. */
const PLACEHOLDER_IDS = ["12345678", "00000000", "FFFFFFFF"];

/** Fixed lengths worth enforcing, in bytes. */
const EXPECTED_LENGTHS: Record<string, number> = {
  "82": 2,
  "95": 5,
  "9A": 3,
  "9B": 2,
  "9C": 1,
  "5F2A": 2,
  "9F02": 6,
  "9F03": 6,
  "9F07": 2,
  "9F1A": 2,
  "9F26": 8,
  "9F27": 1,
  "9F33": 3,
  "9F34": 3,
  "9F35": 1,
  "9F36": 2,
  "9F37": 4,
  "9F40": 5,
  "9F66": 4,
  "9F6C": 2,
};

export function lintTlv(result: TlvParsingResult | null): LintFinding[] {
  if (!result || result.elements.length === 0) return [];

  const findings: LintFinding[] = [];
  const byTag = indexByTag(result.elements);
  const get = (tag: string) => byTag.get(tag)?.value?.toUpperCase();

  /* --- Country vs currency ------------------------------------------------ */
  const countryValue = get("9F1A");
  const currencyValue = get("5F2A");
  if (countryValue && currencyValue) {
    const country = getCountryByNumeric(countryValue);
    const currencyDigits = currencyValue.replace(/[^0-9]/g, "").slice(-3);
    if (country && currencyDigits !== country.currencyNumeric) {
      findings.push({
        id: "country-currency-mismatch",
        severity: "warning",
        tags: ["9F1A", "5F2A"],
        title: "Terminal country and transaction currency disagree",
        detail: `9F1A is ${countryValue} (${country.name}), which normally uses ${country.currencyAlpha} (${country.currencyNumeric}), but 5F2A is ${currencyValue}. 9F1A is ISO 3166-1 and 5F2A is ISO 4217 — check one was not copied into the other.`,
      });
    }
    if (!country) {
      findings.push({
        id: "unknown-country-code",
        severity: "info",
        tags: ["9F1A"],
        title: "Terminal country code not recognised",
        detail: `9F1A is ${countryValue}, which is not in this tool's ISO 3166-1 table. Verify it is a real numeric country code and not a currency code.`,
      });
    }
  }

  /* --- Test AIDs ---------------------------------------------------------- */
  for (const tag of ["4F", "84", "9F06"]) {
    const value = get(tag);
    if (!value) continue;
    const hit = TEST_AIDS.find((aid) => value.startsWith(aid));
    if (hit) {
      findings.push({
        id: `test-aid-${tag}`,
        severity: "error",
        tags: [tag],
        title: "Test AID present",
        detail: `${tag} is ${value}, which starts with the known test AID ${hit}. A test AID in a production configuration will be selected by test cards and must be removed before release.`,
      });
    }
  }

  /* --- Placeholder identity fields ---------------------------------------- */
  const terminalId = get("9F1C");
  const ifdSerial = get("9F1E");
  for (const [tag, value, label] of [
    ["9F1C", terminalId, "Terminal Identification"],
    ["9F1E", ifdSerial, "IFD Serial Number"],
  ] as const) {
    if (!value) continue;
    // These carry ASCII, so compare the decoded text as well as the raw hex.
    const ascii = (value.match(/.{2}/g) || [])
      .map((byte: string) => String.fromCharCode(parseInt(byte, 16)))
      .join("");
    if (PLACEHOLDER_IDS.includes(value) || PLACEHOLDER_IDS.includes(ascii)) {
      findings.push({
        id: `placeholder-${tag}`,
        severity: "warning",
        tags: [tag],
        title: `${label} looks like a placeholder`,
        detail: `${tag} is "${ascii}" (${value}). If this is not overridden per device at run time, terminals ship with non-unique identifiers.`,
      });
    }
  }
  if (terminalId && ifdSerial && terminalId === ifdSerial) {
    findings.push({
      id: "identical-terminal-ids",
      severity: "info",
      tags: ["9F1C", "9F1E"],
      title: "Terminal ID and IFD serial are identical",
      detail:
        "9F1C and 9F1E carry the same value. They identify different things (the terminal to the acquirer, and the interface device) and are usually distinct.",
    });
  }

  /* --- Merchant category code -------------------------------------------- */
  const mcc = get("9F15");
  if (mcc && /^0+$/.test(mcc)) {
    findings.push({
      id: "placeholder-mcc",
      severity: "warning",
      tags: ["9F15"],
      title: "Merchant Category Code is all zeroes",
      detail:
        "9F15 is format-valid but 0000 is not a real ISO 18245 MCC. Some acquirers reject or mis-route transactions carrying a null MCC.",
    });
  }

  /* --- Visa TTQ ----------------------------------------------------------- */
  const ttq = get("9F66");
  if (ttq && ttq.length >= 4) {
    const byte1 = parseInt(ttq.substring(0, 2), 16);
    const byte2 = parseInt(ttq.substring(2, 4), 16);

    if ((byte1 & 0x02) !== 0 && (byte1 & 0x04) !== 0) {
      findings.push({
        id: "ttq-signature-and-pin",
        severity: "warning",
        tags: ["9F66"],
        title: "TTQ advertises both Signature and Online PIN",
        detail:
          "On an unattended or SoftPOS reader, Signature can resolve to No-CVM and suppress the PIN prompt entirely. If online PIN is the intended CVM, clear the signature bit (byte 1 bit 2).",
      });
    }
    if ((byte2 & 0x40) !== 0) {
      findings.push({
        id: "ttq-cvm-required-static",
        severity: "warning",
        tags: ["9F66"],
        title: "TTQ has CVM Required set statically",
        detail:
          "Byte 2 bit 7 is transient — the reader sets it per transaction once the amount reaches the CVM-required limit. Hardcoding it demands cardholder verification on every transaction, including low-value taps.",
      });
    }
    if ((byte2 & 0x20) !== 0 && (byte1 & 0x10) === 0) {
      findings.push({
        id: "ttq-offline-pin-without-contact",
        severity: "error",
        tags: ["9F66"],
        title: "TTQ claims contact-chip Offline PIN without contact chip support",
        detail:
          "Byte 2 bit 6 advertises contact-chip offline PIN, but byte 1 bit 5 (EMV contact chip supported) is clear. The capability contradicts itself and a card may select a CVM the terminal cannot perform.",
      });
    }
  }

  /* --- Kernel-specific tags in the wrong place ---------------------------- */
  if (byTag.has("9F6C") && byTag.has("9F66")) {
    findings.push({
      id: "ctq-with-ttq",
      severity: "info",
      tags: ["9F6C"],
      title: "Card Transaction Qualifiers present alongside TTQ",
      detail:
        "9F6C is card-sourced and 9F66 is terminal-sourced. Both appearing together is normal in a transaction trace, but 9F6C must never be present in a terminal reader configuration.",
    });
  }

  /* --- AIP vs terminal capabilities coherence ----------------------------- */
  const aip = get("82");
  const terminalCaps = get("9F33");
  if (aip && terminalCaps && aip.length >= 2 && terminalCaps.length >= 6) {
    const aipByte1 = parseInt(aip.substring(0, 2), 16);
    const cvmCapability = parseInt(terminalCaps.substring(2, 4), 16);
    // AIP byte 1 bit 5 = cardholder verification supported.
    if ((aipByte1 & 0x10) !== 0 && cvmCapability === 0) {
      findings.push({
        id: "cvm-supported-no-capability",
        severity: "warning",
        tags: ["82", "9F33"],
        title: "Card supports CVM but the terminal declares no CVM capability",
        detail:
          "AIP (82) says cardholder verification is supported, but 9F33 byte 2 is 00 — the terminal advertises no CVM at all, so verification cannot be performed.",
      });
    }
  }

  /* --- Length conformance ------------------------------------------------- */
  for (const [tag, expected] of Object.entries(EXPECTED_LENGTHS)) {
    const element = byTag.get(tag);
    if (!element) continue;
    if (element.length !== expected) {
      findings.push({
        id: `length-${tag}`,
        severity: "error",
        tags: [tag],
        title: `${tag} has an unexpected length`,
        detail: `${tag} is ${element.length} byte${
          element.length === 1 ? "" : "s"
        } but EMV defines it as exactly ${expected}. Downstream kernels may reject or misread the value.`,
      });
    }
  }

  /* --- Parser-level problems --------------------------------------------- */
  const unknownCount = (() => {
    let count = 0;
    const walk = (list: TlvElement[]) => {
      for (const element of list) {
        if (element.isUnknown) count++;
        if (element.children) walk(element.children);
      }
    };
    walk(result.elements);
    return count;
  })();

  if (unknownCount > 0) {
    findings.push({
      id: "unknown-tags",
      severity: "info",
      tags: [],
      title: `${unknownCount} unknown tag${unknownCount === 1 ? "" : "s"}`,
      detail:
        "These are not in the tag registry. Define them as custom tags if they are proprietary, or check for a framing error if you did not expect them.",
    });
  }

  return findings;
}
