/**
 * TLV (Tag-Length-Value) Parser Implementation
 *
 * This utility provides functions to parse hexadecimal strings containing
 * TLV (Tag-Length-Value) data structures commonly used in EMV card processing.
 */

import {
  type TlvElement,
  type TlvParsingError,
  type TlvParsingOptions,
  type TlvParsingResult,
  TagFormat,
} from "@/types/tlv";
import { getTagInfo } from "./tag-registry";

/**
 * Default parsing options
 */
const DEFAULT_OPTIONS: TlvParsingOptions = {
  ignoreUnknownTags: false,
  validateLength: true,
  stopOnError: false,
  parseConstructed: true,
};

/**
 * Parse a hexadecimal string containing TLV data
 *
 * @param hexString - Hexadecimal string to parse
 * @param options - Parsing options
 * @returns Parsing result with TLV elements and any errors
 */
export function parseTlv(
  hexString: string,
  options: TlvParsingOptions = DEFAULT_OPTIONS
): TlvParsingResult {
  // Normalize input - remove spaces and convert to uppercase
  const normalizedHex = normalizeHexString(hexString);

  // Validate hex string
  if (!isValidHexString(normalizedHex)) {
    return {
      elements: [],
      errors: [{ message: "Invalid hexadecimal string" }],
      rawHex: normalizedHex,
    };
  }

  const result: TlvParsingResult = {
    elements: [],
    errors: [],
    rawHex: normalizedHex,
  };

  // Parse the TLV structure
  let position = 0;

  while (position < normalizedHex.length) {
    try {
      const { element, nextPosition } = parseElement(
        normalizedHex,
        position,
        options
      );

      result.elements.push(element);
      position = nextPosition;
    } catch (error) {
      const parsingError: TlvParsingError = {
        message:
          error instanceof Error ? error.message : "Unknown parsing error",
        offset: position,
      };

      result.errors.push(parsingError);

      if (options.stopOnError) {
        break;
      }

      // Try to recover by finding the next potential tag
      position = findNextPotentialTag(normalizedHex, position + 2);
    }
  }

  return result;
}

/**
 * Parse a single TLV element from the hex string
 *
 * @param hexString - Full hex string
 * @param startPos - Starting position in the hex string
 * @param options - Parsing options
 * @returns Parsed element and the next position
 */
function parseElement(
  hexString: string,
  startPos: number,
  options: TlvParsingOptions
): { element: TlvElement; nextPosition: number } {
  // Ensure we have at least 2 bytes for the tag
  if (startPos + 2 > hexString.length) {
    throw new Error("Unexpected end of data during tag parsing");
  }

  // Parse the tag
  const { tagId, nextPos } = parseTag(hexString, startPos);

  // Get additional information about the tag
  const tagInfo = getTagInfo(tagId);

  // Check if we should ignore unknown tags
  if (!tagInfo && !options.ignoreUnknownTags) {
    throw new Error(`Unknown tag: ${tagId} at position ${startPos}`);
  }

  // Parse the length field
  const { dataLength, lengthBytes, lengthStartPos } = parseLength(
    hexString,
    nextPos
  );

  // Validate if we have enough data
  const valueStartPos = lengthStartPos + lengthBytes * 2;
  const valueEndPos = valueStartPos + dataLength * 2;

  if (valueEndPos > hexString.length) {
    throw new Error(
      `Unexpected end of data during value parsing for tag ${tagId}`
    );
  }

  // Extract the value
  const value = hexString.substring(valueStartPos, valueEndPos);

  // Create the TLV element
  const element: TlvElement = {
    tag: tagId,
    length: dataLength,
    value,
    tagInfo,
    rawHex: hexString.substring(startPos, valueEndPos),
    offset: startPos,
  };

  // Parse constructed tags recursively if enabled
  if (
    options.parseConstructed &&
    tagInfo &&
    tagInfo.format === TagFormat.CONSTRUCTED
  ) {
    try {
      const constructedResult = parseTlv(value, options);
      element.children = constructedResult.elements;

      // Add nested errors with updated offsets
      constructedResult.errors.forEach((error) => {
        if (error.offset !== undefined) {
          error.offset += valueStartPos;
        }
        throw new Error(
          `Error parsing constructed tag ${tagId}: ${error.message}`
        );
      });
    } catch (error) {
      // Just skip parsing constructed content on error if not stopping
      if (options.stopOnError) {
        throw error;
      }
    }
  }

  return { element, nextPosition: valueEndPos };
}

/**
 * Parse the tag field from the hex string
 *
 * @param hexString - Full hex string
 * @param startPos - Starting position
 * @returns Tag ID, tag length in bytes, and next position
 */
function parseTag(
  hexString: string,
  startPos: number
): { tagId: string; tagLength: number; nextPos: number } {
  let currentPos = startPos;

  // Read the first byte
  const firstByte = hexString.substring(currentPos, currentPos + 2);
  currentPos += 2;

  // Check if this is a multi-byte tag (if bits 5-1 of the first byte are all 1s)
  const isMultiByte = (parseInt(firstByte, 16) & 0x1f) === 0x1f;

  if (!isMultiByte) {
    return { tagId: firstByte, tagLength: 1, nextPos: currentPos };
  }

  // Multi-byte tag
  let tagId = firstByte;
  let tagBytes = 1;

  // Continue reading bytes until we find one without the high bit set
  while (currentPos < hexString.length) {
    const nextByte = hexString.substring(currentPos, currentPos + 2);
    currentPos += 2;
    tagId += nextByte;
    tagBytes++;

    // Check if this is the last byte (high bit not set)
    if ((parseInt(nextByte, 16) & 0x80) === 0) {
      break;
    }

    // Prevent infinite loop for malformed data
    if (tagBytes > 10) {
      throw new Error("Tag too long, possible malformed data");
    }
  }

  return { tagId, tagLength: tagBytes, nextPos: currentPos };
}

/**
 * Parse the length field from the hex string
 *
 * @param hexString - Full hex string
 * @param startPos - Starting position
 * @returns Data length in bytes, length field size in bytes, and length start position
 */
function parseLength(
  hexString: string,
  startPos: number
): { dataLength: number; lengthBytes: number; lengthStartPos: number } {
  const lengthStartPos = startPos;

  // Ensure we have at least one byte for the length
  if (lengthStartPos >= hexString.length) {
    throw new Error("Unexpected end of data during length parsing");
  }

  // Read the first length byte
  const firstByte = parseInt(
    hexString.substring(lengthStartPos, lengthStartPos + 2),
    16
  );

  // Check if this is a short form length (bit 7 not set)
  if ((firstByte & 0x80) === 0) {
    return {
      dataLength: firstByte,
      lengthBytes: 1,
      lengthStartPos,
    };
  }

  // This is a long form length
  const numLengthBytes = firstByte & 0x7f;

  if (numLengthBytes === 0) {
    // Indefinite length encoding - not commonly used in EMV
    throw new Error("Indefinite length encoding not supported");
  }

  if (lengthStartPos + 2 + numLengthBytes * 2 > hexString.length) {
    throw new Error("Unexpected end of data during length parsing");
  }

  // Read the specified number of length bytes
  let dataLength = 0;
  for (let i = 0; i < numLengthBytes; i++) {
    const pos = lengthStartPos + 2 + i * 2;
    const byte = parseInt(hexString.substring(pos, pos + 2), 16);
    dataLength = (dataLength << 8) | byte;
  }

  return {
    dataLength,
    lengthBytes: numLengthBytes + 1, // +1 for the first byte
    lengthStartPos,
  };
}

/**
 * Find the next potential tag in the hex string
 *
 * @param hexString - Full hex string
 * @param startPos - Starting position
 * @returns Position of the next potential tag
 */
function findNextPotentialTag(hexString: string, startPos: number): number {
  // Simple implementation: just move to the next byte
  // In a real implementation, this would try to be smarter about finding valid tag patterns
  return Math.min(startPos + 2, hexString.length);
}

/**
 * Normalize a hex string by removing spaces and converting to uppercase
 *
 * @param hexString - Hex string to normalize
 * @returns Normalized hex string
 */
function normalizeHexString(hexString: string): string {
  return hexString.replace(/\s/g, "").toUpperCase();
}

/**
 * Check if a string is a valid hexadecimal string
 *
 * @param hexString - String to check
 * @returns True if the string is a valid hex string
 */
function isValidHexString(hexString: string): boolean {
  return /^[0-9A-F]*$/.test(hexString) && hexString.length % 2 === 0;
}
