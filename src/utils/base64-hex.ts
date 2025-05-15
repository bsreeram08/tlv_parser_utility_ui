/**
 * Utility functions for converting between Base64 and Hexadecimal (Base16) formats
 */

/**
 * Convert Base64 string to hexadecimal (Base16) string
 * @param base64 - Base64 encoded string
 * @returns Hexadecimal string in uppercase
 */
export function base64ToBase16(base64: string): string {
  try {
    return window
      .atob(base64)
      .split("")
      .map(function (aChar) {
        return ("0" + aChar.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
      .toUpperCase(); 
  } catch (error) {
    console.error("Error converting Base64 to Hex:", error);
    throw new Error("Invalid Base64 format");
  }
}

/**
 * Convert hexadecimal (Base16) string to Base64 string
 * @param hex - Hexadecimal string
 * @returns Base64 encoded string
 */
export function base16ToBase64(hex: string): string {
  try {
    // Normalize input - remove spaces and ensure even length
    hex = hex.replace(/\s+/g, "");
    if (hex.length % 2 !== 0) {
      throw new Error("Hex string must have an even number of characters");
    }
    
    // Check if input is a valid hex string
    if (!/^[0-9A-Fa-f]+$/.test(hex)) {
      throw new Error("Input is not a valid hexadecimal string");
    }
    
    // Convert hex to binary string
    let binaryString = "";
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16);
      binaryString += String.fromCharCode(byte);
    }
    
    // Convert binary string to Base64
    return window.btoa(binaryString);
  } catch (error) {
    console.error("Error converting Hex to Base64:", error);
    throw new Error("Invalid hexadecimal format");
  }
}

/**
 * Check if a string might be Base64 encoded
 * @param value - String to check
 * @returns Boolean indicating if the string might be Base64 encoded
 */
export function isLikelyBase64(value: string): boolean {
  // Base64 strings are typically a multiple of 4 characters in length
  // May end with one or two = for padding
  // Only contains alphanumeric characters, +, /, and =
  return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;
}

/**
 * Check if a string is a valid hexadecimal string
 * @param value - String to check
 * @returns Boolean indicating if the string is a valid hex string
 */
export function isValidHex(value: string): boolean {
  // Remove spaces and check if it's a valid hex string with even length
  const normalized = value.replace(/\s+/g, "");
  return /^[0-9A-Fa-f]+$/.test(normalized) && normalized.length % 2 === 0;
}
