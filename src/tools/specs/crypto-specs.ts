/**
 * Cipher, hash and MAC calculators.
 */

import type { CalculatorSpec } from "../types";
import {
  decryptHex,
  encryptHex,
  keyCheckValue,
  retailMac,
  validKeyBytes,
  xorHex,
  type CipherAlgorithm,
  type CipherMode,
} from "@/utils/crypto/block-ciphers";
import {
  hash,
  hmac,
  type HashAlgorithm,
  type InputEncoding,
} from "@/utils/crypto/hashes";

const ENCODING_OPTIONS = [
  { value: "hex", label: "Hex bytes" },
  { value: "utf8", label: "UTF-8 text" },
] as const;

function cipherSpec(algorithm: CipherAlgorithm): CalculatorSpec {
  const keyLengths = validKeyBytes(algorithm).join(" or ");
  const size = algorithm === "AES" ? 16 : 8;

  return {
    kind: "calculator",
    id: `${algorithm.toLowerCase()}-calculator`,
    name: `${algorithm} calculator`,
    group: "Ciphers",
    description: `Encrypt or decrypt hex data with ${algorithm} in ECB or CBC mode. No padding is added — supply whole ${size}-byte blocks.`,
    keywords: [algorithm, "encrypt", "decrypt", "cipher", "ecb", "cbc"],
    note:
      algorithm === "3DES"
        ? "A 16-byte key is treated as two-key 3DES (K1|K2|K1), which is what payment systems mean by a double-length key."
        : undefined,
    fields: [
      {
        name: "operation",
        label: "Operation",
        type: "select",
        defaultValue: "encrypt",
        options: [
          { value: "encrypt", label: "Encrypt" },
          { value: "decrypt", label: "Decrypt" },
        ],
      },
      {
        name: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "ECB",
        options: [
          { value: "ECB", label: "ECB" },
          { value: "CBC", label: "CBC" },
        ],
      },
      {
        name: "key",
        label: `Key (${keyLengths} bytes, hex)`,
        type: "text",
        mono: true,
        placeholder: "0123456789ABCDEF",
      },
      {
        name: "iv",
        label: `IV (${size} bytes, hex)`,
        type: "text",
        mono: true,
        placeholder: "00".repeat(size),
        showIf: (v) => v.mode === "CBC",
      },
      {
        name: "data",
        label: "Data (hex)",
        type: "textarea",
        mono: true,
        placeholder: "00".repeat(size),
      },
    ],
    example:
      algorithm === "AES"
        ? {
            key: "000102030405060708090A0B0C0D0E0F",
            data: "00112233445566778899AABBCCDDEEFF",
          }
        : {
            key:
              algorithm === "DES"
                ? "0123456789ABCDEF"
                : "0123456789ABCDEFFEDCBA9876543210",
            data: "0000000000000000",
          },
    compute: (v) => {
      const options = {
        algorithm,
        mode: (v.mode as CipherMode) || "ECB",
        keyHex: v.key,
        dataHex: v.data,
        ivHex: v.iv,
      };
      const out =
        v.operation === "decrypt" ? decryptHex(options) : encryptHex(options);
      return [
        {
          label: v.operation === "decrypt" ? "Plaintext" : "Ciphertext",
          value: out,
        },
        {
          label: "Key Check Value",
          value: keyCheckValue(algorithm, v.key),
          note: "First 3 bytes of an all-zero block encrypted under this key.",
        },
      ];
    },
  };
}

export const desCalculator = cipherSpec("DES");
export const tripleDesCalculator = cipherSpec("3DES");
export const aesCalculator = cipherSpec("AES");

export const kcvCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "kcv-calculator",
  name: "Key Check Value",
  group: "Ciphers",
  description:
    "Derive a KCV so two parties can confirm they hold the same key without exchanging it.",
  keywords: ["kcv", "key check value", "key verification"],
  fields: [
    {
      name: "algorithm",
      label: "Algorithm",
      type: "select",
      defaultValue: "3DES",
      options: [
        { value: "DES", label: "DES" },
        { value: "3DES", label: "3DES" },
        { value: "AES", label: "AES" },
      ],
    },
    { name: "key", label: "Key (hex)", type: "text", mono: true },
  ],
  example: { algorithm: "3DES", key: "0123456789ABCDEFFEDCBA9876543210" },
  compute: (v) => [
    {
      label: "KCV (3 bytes)",
      value: keyCheckValue(v.algorithm as CipherAlgorithm, v.key),
    },
    {
      label: "KCV (6 bytes)",
      value: encryptHex({
        algorithm: v.algorithm as CipherAlgorithm,
        keyHex: v.key,
        dataHex: "00".repeat(v.algorithm === "AES" ? 16 : 8),
      }).substring(0, 12),
    },
  ],
};

export const retailMacCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "retail-mac",
  name: "Retail MAC (ISO 9797-1 Alg 3)",
  group: "Ciphers",
  description:
    "Single-DES CBC chain under the left key half, then a 3DES transform of the final block. Data must already be padded to 8-byte blocks.",
  keywords: ["mac", "iso 9797", "retail mac", "algorithm 3"],
  fields: [
    {
      name: "key",
      label: "Key (16 bytes, hex)",
      type: "text",
      mono: true,
      placeholder: "0123456789ABCDEFFEDCBA9876543210",
    },
    {
      name: "data",
      label: "Padded data (hex)",
      type: "textarea",
      mono: true,
      help: "Apply your scheme's padding before entering the data.",
    },
  ],
  example: {
    key: "0123456789ABCDEFFEDCBA9876543210",
    data: "00112233445566778000000000000000",
  },
  compute: (v) => [
    { label: "MAC (8 bytes)", value: retailMac(v.key, v.data) },
    {
      label: "MAC (leftmost 4 bytes)",
      value: retailMac(v.key, v.data).substring(0, 8),
      note: "Many hosts truncate the MAC to 4 bytes.",
    },
  ],
};

export const hashCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "hash-calculator",
  name: "Hash calculator",
  group: "Hashes",
  description:
    "SHA-1, SHA-256, SHA-512 and MD5. Choose whether the input is hex bytes or text — that choice changes the digest.",
  keywords: ["sha", "sha1", "sha-1", "sha256", "sha-256", "md5", "digest", "hash"],
  fields: [
    {
      name: "algorithm",
      label: "Algorithm",
      type: "select",
      defaultValue: "SHA-256",
      options: [
        { value: "SHA-1", label: "SHA-1" },
        { value: "SHA-256", label: "SHA-256" },
        { value: "SHA-512", label: "SHA-512" },
        { value: "MD5", label: "MD5" },
      ],
    },
    {
      name: "encoding",
      label: "Input is",
      type: "select",
      defaultValue: "hex",
      options: [...ENCODING_OPTIONS],
    },
    { name: "data", label: "Input", type: "textarea", mono: true },
  ],
  example: { algorithm: "SHA-1", encoding: "hex", data: "A0000000031010" },
  compute: (v) => [
    {
      label: `${v.algorithm} digest`,
      value: hash(
        v.algorithm as HashAlgorithm,
        v.data,
        v.encoding as InputEncoding
      ),
    },
  ],
};

export const hmacCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "hmac-calculator",
  name: "HMAC calculator",
  group: "Hashes",
  description: "Keyed-hash message authentication code.",
  keywords: ["hmac", "mac", "keyed hash"],
  fields: [
    {
      name: "algorithm",
      label: "Algorithm",
      type: "select",
      defaultValue: "SHA-256",
      options: [
        { value: "SHA-1", label: "HMAC-SHA-1" },
        { value: "SHA-256", label: "HMAC-SHA-256" },
        { value: "SHA-512", label: "HMAC-SHA-512" },
        { value: "MD5", label: "HMAC-MD5" },
      ],
    },
    {
      name: "keyEncoding",
      label: "Key is",
      type: "select",
      defaultValue: "hex",
      options: [...ENCODING_OPTIONS],
    },
    { name: "key", label: "Key", type: "text", mono: true },
    {
      name: "encoding",
      label: "Message is",
      type: "select",
      defaultValue: "utf8",
      options: [...ENCODING_OPTIONS],
    },
    { name: "data", label: "Message", type: "textarea", mono: true },
  ],
  example: {
    algorithm: "SHA-256",
    keyEncoding: "hex",
    key: "0123456789ABCDEF",
    encoding: "utf8",
    data: "hello",
  },
  compute: (v) => [
    {
      label: `HMAC-${v.algorithm}`,
      value: hmac(
        v.algorithm as HashAlgorithm,
        v.data,
        v.key,
        v.encoding as InputEncoding,
        v.keyEncoding as InputEncoding
      ),
    },
  ],
};

export const xorCalculator: CalculatorSpec = {
  kind: "calculator",
  id: "xor-calculator",
  name: "XOR calculator",
  group: "Ciphers",
  description:
    "XOR two equal-length hex values — used for key components, PIN block masking and key variants.",
  keywords: ["xor", "key component", "combine"],
  fields: [
    { name: "a", label: "Value A (hex)", type: "text", mono: true },
    { name: "b", label: "Value B (hex)", type: "text", mono: true },
  ],
  example: { a: "0123456789ABCDEF", b: "FEDCBA9876543210" },
  compute: (v) => [{ label: "A XOR B", value: xorHex(v.a, v.b) }],
};

export const cryptoSpecs: CalculatorSpec[] = [
  desCalculator,
  tripleDesCalculator,
  aesCalculator,
  xorCalculator,
  kcvCalculator,
  retailMacCalculator,
  hashCalculator,
  hmacCalculator,
];
