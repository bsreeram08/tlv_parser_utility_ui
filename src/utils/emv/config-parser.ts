/**
 * EMV terminal config parser and linter.
 *
 * Reads the config format used for terminal EMV configurations — either plain
 * JSON, or the MyPinPad-signed artifact whose first line is a hash and whose
 * remainder is the JSON payload.
 *
 * The lint rules encode defects that have reached real terminal fleets:
 *   - a CA public key whose modulus was corrupted while its checksum stayed
 *     stale, which the kernel rejects at init and can leave a terminal looping
 *     rather than failing one transaction;
 *   - tag 9F6E placed in the Mastercard kernel's reader config, where it is
 *     card-sourced Third Party Data and not a terminal value at all;
 *   - a test AID left in a production config;
 *   - a country code copied into the currency field;
 *   - CVM-required limits that disagree between kernels in one config.
 */

import { validateCapk } from "./capk-validator";
import { getCountryByNumeric } from "./country-codes";

export type ConfigTag = { tag: string; value: string };

export type ConfigTransaction = {
  transactionType?: string;
  readerCVMRequiredLimit?: number;
  terminalFloorLimit?: number;
  readerContactlessTransactionLimit?: number;
  config?: ConfigTag[];
};

export type ConfigApplication = {
  aid?: string[];
  transaction?: ConfigTransaction[];
};

export type ConfigKernel = {
  kernelId?: number;
  kernelConfig?: Record<string, unknown>;
  config?: ConfigTag[];
  application?: ConfigApplication[];
};

export type ConfigPublicKey = {
  rId?: string;
  index?: string;
  modulus?: string;
  exponent?: string;
  expiryDate?: string;
  checksum?: string;
};

export type EmvConfig = {
  metadata?: {
    label?: string;
    version?: string;
    client?: string;
    last_modified?: string;
    properties?: Record<string, string>;
  };
  terminal?: ConfigTag[];
  kernel?: ConfigKernel[];
  publicKey?: ConfigPublicKey[];
  onlineRequestTags?: {
    genericTags?: string[];
    kernelTags?: { kernelId?: number; tags?: string[] }[];
  };
};

export type ParsedConfig = {
  config: EmvConfig;
  /** First-line hash of a signed artifact, if present. */
  signatureLine?: string;
  /** SHA-256 of the whole file is not computed here — see the viewer. */
  raw: string;
};

/** Human-readable kernel names by kernelId. */
export const KERNEL_NAMES: Record<number, string> = {
  1: "JCB",
  2: "Mastercard (PayPass)",
  3: "Visa (payWave)",
  4: "American Express (Expresspay)",
  5: "JCB / other",
  6: "Discover / Diners",
  7: "UnionPay",
};

/** EMV transaction type codes seen in these configs. */
export const TRANSACTION_TYPES: Record<string, string> = {
  "00": "Purchase",
  "01": "Cash advance",
  "09": "Purchase with cashback",
  "17": "Cash disbursement",
  "20": "Refund",
  "30": "Balance inquiry",
};

/**
 * Parse a config file. Accepts plain JSON or the signed two-part form
 * (hash line, then JSON).
 */
export function parseEmvConfig(text: string): ParsedConfig {
  const trimmed = text.trim();

  // Plain JSON.
  if (trimmed.startsWith("{")) {
    return { config: JSON.parse(trimmed) as EmvConfig, raw: trimmed };
  }

  // Signed form: the first line is a hash, the rest is the payload.
  const newlineIndex = trimmed.indexOf("\n");
  if (newlineIndex === -1) {
    throw new Error(
      "Could not parse: the input is neither JSON nor a signed config (hash line followed by JSON)."
    );
  }

  const signatureLine = trimmed.substring(0, newlineIndex).trim();
  const payload = trimmed.substring(newlineIndex + 1).trim();

  if (!payload.startsWith("{")) {
    throw new Error(
      "Could not parse: the content after the first line is not JSON."
    );
  }

  return {
    config: JSON.parse(payload) as EmvConfig,
    signatureLine,
    raw: trimmed,
  };
}

export type ConfigFinding = {
  id: string;
  severity: "error" | "warning" | "info";
  /** Where in the config the finding sits, e.g. "kernel 2 · config". */
  location: string;
  title: string;
  detail: string;
};

const TEST_AID_PREFIXES = ["B012345678", "A0000000999090", "F0000000030001"];

/** Test CA key indices per RID — these must never appear in a prod config. */
const TEST_KEY_INDICES: Record<string, string[]> = {
  A000000025: ["04", "62", "C1", "C2", "C3", "C8", "C9", "CA"],
};

const findTag = (tags: ConfigTag[] | undefined, tag: string) =>
  tags?.find((t) => t.tag?.toUpperCase() === tag)?.value?.toUpperCase();

/** Run every config-level check. */
export function lintEmvConfig(parsed: ParsedConfig): ConfigFinding[] {
  const findings: ConfigFinding[] = [];
  const { config } = parsed;

  /* --- Terminal-level country vs currency --------------------------------- */
  const country = findTag(config.terminal, "9F1A");
  const currency = findTag(config.terminal, "5F2A");
  if (country && currency) {
    const info = getCountryByNumeric(country);
    const currencyDigits = currency.replace(/[^0-9]/g, "").slice(-3);
    if (info && currencyDigits !== info.currencyNumeric) {
      findings.push({
        id: "config-country-currency",
        severity: "warning",
        location: "terminal",
        title: "Terminal country and transaction currency disagree",
        detail: `9F1A is ${country} (${info.name}), which normally uses ${info.currencyAlpha} (${info.currencyNumeric}), but 5F2A is ${currency}. These are different standards (ISO 3166-1 vs ISO 4217) and coincide for GBP, SEK, DKK, NOK and USD — which is exactly how a config copied between markets goes wrong unnoticed.`,
      });
    }
  }

  /* --- Kernel checks ------------------------------------------------------ */
  const cvmLimits = new Map<string, number[]>();

  for (const kernel of config.kernel ?? []) {
    const kernelId = kernel.kernelId;
    const kernelLabel =
      kernelId !== undefined
        ? `kernel ${kernelId} (${KERNEL_NAMES[kernelId] ?? "unknown"})`
        : "kernel (no id)";

    // 9F6E in the Mastercard kernel's reader config is the bug that bricked
    // terminals: for kernel 2 it is card-sourced Third Party Data, not a
    // terminal-supplied reader value. It is legitimate for AMEX kernel 4.
    if (kernelId === 2 && findTag(kernel.config, "9F6E")) {
      findings.push({
        id: "mc-kernel-9f6e",
        severity: "error",
        location: `${kernelLabel} · config`,
        title: "Tag 9F6E present in the Mastercard kernel reader config",
        detail:
          "For kernel 2, 9F6E is Third Party Data — supplied by the card, never a static terminal value. Injecting it here is semantically wrong and has caused kernels to fail setup after terminal creation. It belongs in onlineRequestTags.kernelTags[2] if the card's value should be forwarded online. It is a valid reader value only for AMEX kernel 4.",
      });
    }

    // Visa TTQ checks.
    const collectTtq = (tags: ConfigTag[] | undefined, where: string) => {
      const ttq = findTag(tags, "9F66");
      if (!ttq || ttq.length < 4) return;
      const byte1 = parseInt(ttq.substring(0, 2), 16);
      const byte2 = parseInt(ttq.substring(2, 4), 16);

      if ((byte1 & 0x02) !== 0 && (byte1 & 0x04) !== 0) {
        findings.push({
          id: `ttq-signature-${where}`,
          severity: "warning",
          location: where,
          title: "TTQ advertises Signature alongside Online PIN",
          detail: `9F66 is ${ttq}. On an unattended or SoftPOS reader, Signature can resolve to No-CVM and the kernel skips the PIN prompt entirely — the transaction goes through with no cardholder verification. If online PIN is intended, clear byte 1 bit 2.`,
        });
      }
      if ((byte2 & 0x40) !== 0) {
        findings.push({
          id: `ttq-cvm-static-${where}`,
          severity: "warning",
          location: where,
          title: "TTQ has CVM Required set statically",
          detail: `9F66 is ${ttq}. Byte 2 bit 7 is transient — the reader sets it per transaction once the amount reaches the CVM-required limit. Hardcoding it demands verification on every transaction, including the smallest tap.`,
        });
      }
      if ((byte2 & 0x20) !== 0 && (byte1 & 0x10) === 0) {
        findings.push({
          id: `ttq-offline-pin-${where}`,
          severity: "error",
          location: where,
          title: "TTQ claims contact-chip Offline PIN without contact support",
          detail: `9F66 is ${ttq}. Byte 2 bit 6 advertises contact-chip offline PIN while byte 1 bit 5 (EMV contact chip) is clear — a self-contradictory capability on a contactless-only reader.`,
        });
      }
    };

    collectTtq(kernel.config, `${kernelLabel} · config`);

    for (const application of kernel.application ?? []) {
      for (const aid of application.aid ?? []) {
        const upper = aid.toUpperCase();
        const testHit = TEST_AID_PREFIXES.find((prefix) =>
          upper.startsWith(prefix)
        );
        if (testHit) {
          findings.push({
            id: `test-aid-${upper}`,
            severity: "error",
            location: `${kernelLabel} · AID ${upper}`,
            title: "Test AID in the configuration",
            detail: `AID ${upper} matches the known test AID ${testHit}. Test cards will select it. Remove it before this config is signed for production.`,
          });
        }
      }

      for (const transaction of application.transaction ?? []) {
        const txLabel =
          transaction.transactionType !== undefined
            ? `tx ${transaction.transactionType} (${
                TRANSACTION_TYPES[transaction.transactionType] ?? "unknown"
              })`
            : "tx (no type)";
        const where = `${kernelLabel} · ${txLabel}`;

        collectTtq(transaction.config, where);

        // Collect CVM-required limits so they can be compared across kernels.
        // Refunds legitimately omit the limit to suppress CVM, so only
        // non-refund transactions are compared.
        if (
          transaction.readerCVMRequiredLimit !== undefined &&
          transaction.transactionType !== "20"
        ) {
          const key = String(transaction.readerCVMRequiredLimit);
          const existing = cvmLimits.get(key) ?? [];
          if (kernelId !== undefined && !existing.includes(kernelId)) {
            existing.push(kernelId);
          }
          cvmLimits.set(key, existing);
        }
      }
    }
  }

  if (cvmLimits.size > 1) {
    const summary = [...cvmLimits.entries()]
      .map(([limit, kernels]) => `${limit} (kernel ${kernels.join(", ")})`)
      .join("; ");
    findings.push({
      id: "cvm-limit-inconsistent",
      severity: "warning",
      location: "kernels",
      title: "CVM-required limit differs between kernels",
      detail: `Non-refund transactions carry more than one CVM-required limit: ${summary}. The limit is a per-country policy value and is normally identical across every kernel and transaction type in one config. Note also that Mastercard compares amount > limit while Visa, AMEX and Discover compare amount >= limit, so an identical number behaves differently at the exact boundary.`,
    });
  }

  /* --- CA public keys ----------------------------------------------------- */
  const claimsLiveCerts =
    config.metadata?.properties?.includes_livecards_certs === "true";

  for (const key of config.publicKey ?? []) {
    const rid = (key.rId ?? "").toUpperCase();
    const index = (key.index ?? "").toUpperCase();
    const location = `publicKey ${rid} index ${index}`;

    const validation = validateCapk({
      rid,
      index,
      modulus: key.modulus ?? "",
      exponent: key.exponent ?? "",
      checksum: key.checksum,
      expiry: key.expiryDate,
    });

    for (const issue of validation.issues) {
      findings.push({
        id: `capk-${rid}-${index}-${issue.field}`,
        severity: issue.severity,
        location,
        title: `CA key ${issue.field} problem`,
        detail: issue.message,
      });
    }

    // Test keys in a config that claims to carry live certificates.
    const testIndices = TEST_KEY_INDICES[rid];
    if (claimsLiveCerts && testIndices?.includes(index)) {
      findings.push({
        id: `capk-test-key-${rid}-${index}`,
        severity: "error",
        location,
        title: "Test CA key in a config marked as carrying live certificates",
        detail: `Index ${index} for RID ${rid} is a test key, but metadata.properties.includes_livecards_certs is "true". Mixing test and production keys across environments is a recurring source of failures — verify which set this config is meant to carry.`,
      });
    }
  }

  if ((config.publicKey ?? []).length === 0) {
    findings.push({
      id: "no-capks",
      severity: "info",
      location: "publicKey",
      title: "No CA public keys in this config",
      detail:
        "Offline data authentication needs scheme CA keys. If this config is expected to support ODA, the key list should not be empty.",
    });
  }

  /* --- Placeholder identity fields ---------------------------------------- */
  const terminalId = findTag(config.terminal, "9F1C");
  const mcc = findTag(config.terminal, "9F15");
  if (mcc && /^0+$/.test(mcc)) {
    findings.push({
      id: "config-placeholder-mcc",
      severity: "warning",
      location: "terminal · 9F15",
      title: "Merchant Category Code is all zeroes",
      detail:
        "9F15 is format-valid but 0000 is not a real ISO 18245 MCC. Some acquirers mis-route or reject transactions carrying a null MCC.",
    });
  }
  if (terminalId) {
    const ascii = (terminalId.match(/.{2}/g) || [])
      .map((byte: string) => String.fromCharCode(parseInt(byte, 16)))
      .join("");
    if (ascii === "12345678" || /^0+$/.test(terminalId)) {
      findings.push({
        id: "config-placeholder-terminal-id",
        severity: "warning",
        location: "terminal · 9F1C",
        title: "Terminal Identification looks like a placeholder",
        detail: `9F1C decodes to "${ascii}". Unless it is overridden per device at run time, terminals ship with a non-unique identifier.`,
      });
    }
  }

  return findings;
}

/** Flatten every tag in the config, for the tag-level view. */
export function collectConfigTags(
  config: EmvConfig
): { location: string; tag: string; value: string }[] {
  const out: { location: string; tag: string; value: string }[] = [];

  for (const tag of config.terminal ?? []) {
    if (tag.tag) out.push({ location: "terminal", tag: tag.tag, value: tag.value });
  }

  for (const kernel of config.kernel ?? []) {
    const kernelLabel =
      kernel.kernelId !== undefined
        ? `kernel ${kernel.kernelId}`
        : "kernel";
    for (const tag of kernel.config ?? []) {
      if (tag.tag)
        out.push({ location: `${kernelLabel} · config`, tag: tag.tag, value: tag.value });
    }
    for (const application of kernel.application ?? []) {
      const aidLabel = application.aid?.[0]
        ? `${kernelLabel} · ${application.aid[0]}`
        : kernelLabel;
      for (const transaction of application.transaction ?? []) {
        for (const tag of transaction.config ?? []) {
          if (tag.tag)
            out.push({
              location: `${aidLabel} · tx ${transaction.transactionType ?? "?"}`,
              tag: tag.tag,
              value: tag.value,
            });
        }
      }
    }
  }

  return out;
}
