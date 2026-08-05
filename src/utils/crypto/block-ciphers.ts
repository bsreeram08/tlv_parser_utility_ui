/**
 * Block cipher helpers for payment work: DES, 3DES and AES over hex data,
 * plus key check values.
 *
 * Everything is hex in, hex out, no padding added — payment cryptograms are
 * built from exact block-sized data, so silent PKCS#7 padding would corrupt
 * the result. Callers must supply whole blocks.
 */

import CryptoJS from "crypto-js";

export type CipherAlgorithm = "DES" | "3DES" | "AES";
export type CipherMode = "ECB" | "CBC";

const clean = (value: string) =>
  value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();

/** Block size in bytes. */
export function blockSize(algorithm: CipherAlgorithm): number {
  return algorithm === "AES" ? 16 : 8;
}

/** Valid key lengths in bytes, per algorithm. */
export function validKeyBytes(algorithm: CipherAlgorithm): number[] {
  switch (algorithm) {
    case "DES":
      return [8];
    case "3DES":
      return [16, 24];
    case "AES":
      return [16, 24, 32];
  }
}

function assertInputs(
  algorithm: CipherAlgorithm,
  keyHex: string,
  dataHex: string,
  ivHex: string,
  mode: CipherMode
): void {
  const keyBytes = keyHex.length / 2;
  const allowed = validKeyBytes(algorithm);
  if (keyHex.length % 2 !== 0 || !allowed.includes(keyBytes)) {
    throw new Error(
      `${algorithm} needs a key of ${allowed.join(" or ")} bytes; got ${
        keyHex.length / 2
      }.`
    );
  }

  const size = blockSize(algorithm);
  if (dataHex.length === 0) throw new Error("Data is empty.");
  if (dataHex.length % (size * 2) !== 0) {
    throw new Error(
      `Data must be a whole number of ${size}-byte blocks; got ${
        dataHex.length / 2
      } bytes. No padding is added automatically.`
    );
  }

  if (mode === "CBC" && ivHex.length / 2 !== size) {
    throw new Error(`CBC needs a ${size}-byte IV; got ${ivHex.length / 2}.`);
  }
}

/**
 * 3DES with a 16-byte key is K1|K2|K1 (two-key 3DES). CryptoJS expects the
 * full 24 bytes, so expand it rather than letting it silently mis-key.
 */
function normalise3desKey(keyHex: string): string {
  return keyHex.length === 32 ? keyHex + keyHex.substring(0, 16) : keyHex;
}

function cipherFor(algorithm: CipherAlgorithm) {
  switch (algorithm) {
    case "DES":
      return CryptoJS.DES;
    case "3DES":
      return CryptoJS.TripleDES;
    case "AES":
      return CryptoJS.AES;
  }
}

export type CipherOptions = {
  algorithm: CipherAlgorithm;
  mode?: CipherMode;
  keyHex: string;
  dataHex: string;
  ivHex?: string;
};

/** Encrypt hex data. Returns uppercase hex. */
export function encryptHex({
  algorithm,
  mode = "ECB",
  keyHex,
  dataHex,
  ivHex = "",
}: CipherOptions): string {
  const key = clean(keyHex);
  const data = clean(dataHex);
  const iv = clean(ivHex);
  assertInputs(algorithm, key, data, iv, mode);

  const effectiveKey = algorithm === "3DES" ? normalise3desKey(key) : key;

  const result = cipherFor(algorithm).encrypt(
    CryptoJS.enc.Hex.parse(data),
    CryptoJS.enc.Hex.parse(effectiveKey),
    {
      mode: mode === "CBC" ? CryptoJS.mode.CBC : CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding,
      ...(mode === "CBC" ? { iv: CryptoJS.enc.Hex.parse(iv) } : {}),
    }
  );

  return result.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
}

/** Decrypt hex data. Returns uppercase hex. */
export function decryptHex({
  algorithm,
  mode = "ECB",
  keyHex,
  dataHex,
  ivHex = "",
}: CipherOptions): string {
  const key = clean(keyHex);
  const data = clean(dataHex);
  const iv = clean(ivHex);
  assertInputs(algorithm, key, data, iv, mode);

  const effectiveKey = algorithm === "3DES" ? normalise3desKey(key) : key;

  const result = cipherFor(algorithm).decrypt(
    // CryptoJS.decrypt wants a CipherParams, not a raw string.
    CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(data),
    }),
    CryptoJS.enc.Hex.parse(effectiveKey),
    {
      mode: mode === "CBC" ? CryptoJS.mode.CBC : CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding,
      ...(mode === "CBC" ? { iv: CryptoJS.enc.Hex.parse(iv) } : {}),
    }
  );

  return result.toString(CryptoJS.enc.Hex).toUpperCase();
}

/**
 * Key Check Value: encrypt a block of zeroes with the key and take the first
 * three bytes. Used to confirm two parties hold the same key without
 * revealing it.
 */
export function keyCheckValue(
  algorithm: CipherAlgorithm,
  keyHex: string
): string {
  const zeroes = "00".repeat(blockSize(algorithm));
  return encryptHex({ algorithm, keyHex, dataHex: zeroes }).substring(0, 6);
}

/** XOR two equal-length hex strings. */
export function xorHex(a: string, b: string): string {
  const left = clean(a);
  const right = clean(b);
  if (left.length !== right.length) {
    throw new Error(
      `XOR needs equal lengths; got ${left.length / 2} and ${
        right.length / 2
      } bytes.`
    );
  }
  let out = "";
  for (let i = 0; i < left.length; i++) {
    out += (parseInt(left[i], 16) ^ parseInt(right[i], 16))
      .toString(16)
      .toUpperCase();
  }
  return out;
}

/**
 * Retail MAC (ISO 9797-1 Algorithm 3): single-DES CBC chain over the message
 * with the left key half, then a 3DES "transform" of the final block.
 * Data must already be padded to a multiple of 8 bytes.
 */
export function retailMac(keyHex: string, dataHex: string): string {
  const key = clean(keyHex);
  const data = clean(dataHex);
  if (key.length !== 32) {
    throw new Error("Retail MAC needs a 16-byte (double-length) key.");
  }
  if (data.length === 0 || data.length % 16 !== 0) {
    throw new Error(
      "Data must be a whole number of 8-byte blocks — apply padding first."
    );
  }

  const leftKey = key.substring(0, 16);
  let block = "0000000000000000";
  for (let i = 0; i < data.length; i += 16) {
    const chunk = data.substring(i, i + 16);
    block = encryptHex({
      algorithm: "DES",
      keyHex: leftKey,
      dataHex: xorHex(block, chunk),
    });
  }

  // Final transform: decrypt with the right half, re-encrypt with the left.
  const rightKey = key.substring(16, 32);
  const decrypted = decryptHex({
    algorithm: "DES",
    keyHex: rightKey,
    dataHex: block,
  });
  return encryptHex({
    algorithm: "DES",
    keyHex: leftKey,
    dataHex: decrypted,
  });
}
