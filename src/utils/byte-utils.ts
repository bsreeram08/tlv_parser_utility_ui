/**
 * Utility functions for byte array operations
 * Extracted to eliminate duplication across multiple components
 */

/**
 * Parse a hexadecimal string into a byte array
 * @param hexStr - Hexadecimal string to parse
 * @param expectedBytes - Expected number of bytes (will pad or truncate as needed)
 * @returns Array of byte values (0-255)
 */
export function parseHexToBytes(hexStr: string, expectedBytes: number): number[] {
  // Remove non-hex characters, pad to expected length, and truncate if too long
  const validHex = hexStr
    .replace(/[^0-9A-Fa-f]/g, "")
    .padEnd(expectedBytes * 2, "0")
    .substring(0, expectedBytes * 2);
  
  const bytes: number[] = [];
  for (let i = 0; i < expectedBytes; i++) {
    const byteHex = validHex.substring(i * 2, i * 2 + 2);
    bytes.push(parseInt(byteHex, 16));
  }
  
  return bytes;
}

/**
 * Convert a byte array to a hexadecimal string
 * @param bytes - Array of byte values
 * @returns Uppercase hexadecimal string
 */
export function bytesToHex(bytes: number[]): string {
  return bytes
    .map(byte => byte.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

/**
 * Toggle a specific bit in a byte using XOR
 * @param byte - The byte value to modify
 * @param bitMask - The bit mask to apply (e.g., 0x80 for bit 7)
 * @returns The modified byte value
 */
export function toggleBit(byte: number, bitMask: number): number {
  return byte ^ bitMask;
}

/**
 * Check if a specific bit is set in a byte
 * @param byte - The byte value to check
 * @param bitMask - The bit mask to check (e.g., 0x80 for bit 7)
 * @returns True if the bit is set, false otherwise
 */
export function isBitSet(byte: number, bitMask: number): boolean {
  return (byte & bitMask) !== 0;
}

/**
 * Normalize a hexadecimal string (remove spaces, convert to uppercase)
 * @param hex - Hexadecimal string to normalize
 * @returns Normalized hexadecimal string
 */
export function normalizeHex(hex: string): string {
  return hex.replace(/\s+/g, "").toUpperCase();
}

/**
 * Validate if a string is a valid hexadecimal string
 * @param hex - String to validate
 * @returns True if valid hexadecimal, false otherwise
 */
export function isValidHex(hex: string): boolean {
  const normalized = normalizeHex(hex);
  return /^[0-9A-F]*$/.test(normalized) && normalized.length % 2 === 0;
}
