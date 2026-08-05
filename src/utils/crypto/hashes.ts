/**
 * Hash and MAC helpers. Input can be treated as hex bytes or as UTF-8 text —
 * getting that wrong is the usual reason a hash "does not match", so it is an
 * explicit choice rather than a guess.
 */

import CryptoJS from "crypto-js";

export type InputEncoding = "hex" | "utf8";
export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-512" | "MD5";

function toWordArray(value: string, encoding: InputEncoding) {
  if (encoding === "hex") {
    const clean = value.replace(/[^0-9a-fA-F]/g, "");
    if (clean.length % 2 !== 0) {
      throw new Error("Hex input must have an even number of digits.");
    }
    return CryptoJS.enc.Hex.parse(clean);
  }
  return CryptoJS.enc.Utf8.parse(value);
}

const HASHERS = {
  "SHA-1": CryptoJS.SHA1,
  "SHA-256": CryptoJS.SHA256,
  "SHA-512": CryptoJS.SHA512,
  MD5: CryptoJS.MD5,
} as const;

export function hash(
  algorithm: HashAlgorithm,
  value: string,
  encoding: InputEncoding = "utf8"
): string {
  return HASHERS[algorithm](toWordArray(value, encoding))
    .toString(CryptoJS.enc.Hex)
    .toUpperCase();
}

const HMAC_HASHERS = {
  "SHA-1": CryptoJS.HmacSHA1,
  "SHA-256": CryptoJS.HmacSHA256,
  "SHA-512": CryptoJS.HmacSHA512,
  MD5: CryptoJS.HmacMD5,
} as const;

export function hmac(
  algorithm: HashAlgorithm,
  value: string,
  key: string,
  encoding: InputEncoding = "utf8",
  keyEncoding: InputEncoding = "utf8"
): string {
  return HMAC_HASHERS[algorithm](
    toWordArray(value, encoding),
    toWordArray(key, keyEncoding)
  )
    .toString(CryptoJS.enc.Hex)
    .toUpperCase();
}
