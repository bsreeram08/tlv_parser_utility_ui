/**
 * TLV Formatter Utility
 *
 * Provides functions to format TLV data in various representations
 * for display and conversion purposes.
 */

import { type TlvElement, type TlvParsingResult } from "@/types/tlv";

/**
 * Format options for TLV data representation
 */
export type TlvFormattingOptions = {
  readonly indentSize: number;
  readonly showTagInfo: boolean;
  readonly showOffset: boolean;
  readonly showRawHex: boolean;
  readonly maxValueDisplayLength: number;
};

/**
 * Default formatting options
 */
const DEFAULT_FORMAT_OPTIONS: TlvFormattingOptions = {
  indentSize: 2,
  showTagInfo: true,
  showOffset: true,
  showRawHex: false,
  maxValueDisplayLength: 64,
};

/**
 * Format a TLV parsing result as a readable text string
 *
 * @param result - TLV parsing result to format
 * @param options - Formatting options
 * @returns Formatted string representation
 */
export function formatTlvAsText(
  result: TlvParsingResult,
  options: Partial<TlvFormattingOptions> = {}
): string {
  const mergedOptions: TlvFormattingOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    ...options,
  };

  let output = "";

  // Add raw hex if requested
  if (mergedOptions.showRawHex) {
    output += `Raw Hex: ${result.rawHex}\n\n`;
  }

  // Add any parsing errors
  if (result.errors.length > 0) {
    output += "Parsing Errors:\n";
    result.errors.forEach((error, index) => {
      output += `  ${index + 1}. ${error.message}`;
      if (error.offset !== undefined) {
        output += ` (at offset 0x${error.offset.toString(16).toUpperCase()})`;
      }
      output += "\n";
    });
    output += "\n";
  }

  // Format each TLV element
  result.elements.forEach((element) => {
    output += formatTlvElement(element, 0, mergedOptions);
  });

  return output;
}

/**
 * Format a single TLV element as a text string
 *
 * @param element - TLV element to format
 * @param depth - Current nesting depth
 * @param options - Formatting options
 * @returns Formatted string for this element
 */
function formatTlvElement(
  element: TlvElement,
  depth: number,
  options: TlvFormattingOptions
): string {
  const indent = " ".repeat(depth * options.indentSize);
  let output = indent;

  // Add offset if requested
  if (options.showOffset && element.offset !== undefined) {
    output += `[0x${element.offset.toString(16).toUpperCase()}] `;
  }

  // Add tag ID
  output += `Tag: ${element.tag}`;

  // Add tag info if requested and available
  if (options.showTagInfo && element.tagInfo) {
    output += ` (${element.tagInfo.name})`;
  }

  // Add length
  output += `, Length: ${element.length}`;

  // Add value, truncated if necessary
  if (element.length > 0) {
    let displayValue = element.value;
    if (displayValue.length > options.maxValueDisplayLength) {
      displayValue =
        displayValue.substring(0, options.maxValueDisplayLength) +
        `... (${displayValue.length / 2} bytes total)`;
    }
    output += `, Value: ${displayValue}`;
  }

  output += "\n";

  // Recursively format any children
  if (element.children && element.children.length > 0) {
    element.children.forEach((child) => {
      output += formatTlvElement(child, depth + 1, options);
    });
  }

  return output;
}

/**
 * Convert a TLV element value to ASCII representation where possible
 *
 * @param value - Hexadecimal value string
 * @returns ASCII representation or original hex if not convertible
 */
export function tlvValueToAscii(value: string): string {
  let ascii = "";
  let isValidAscii = true;

  // Process hex pairs
  for (let i = 0; i < value.length; i += 2) {
    const hexPair = value.substring(i, i + 2);
    const charCode = parseInt(hexPair, 16);

    // Check if character is a printable ASCII character
    if (charCode >= 32 && charCode <= 126) {
      ascii += String.fromCharCode(charCode);
    } else {
      isValidAscii = false;
      break;
    }
  }

  return isValidAscii ? ascii : value;
}

/**
 * Format a TLV parsing result as a structured object suitable for JSON
 *
 * @param result - TLV parsing result to format
 * @returns JSON-friendly representation
 */
export function formatTlvAsJson(
  result: TlvParsingResult
): Record<string, unknown> {
  return {
    rawHex: result.rawHex,
    errors: result.errors,
    elements: result.elements.map(elementToJsonObject),
  };
}

/**
 * Convert a TLV element to a JSON-friendly object
 *
 * @param element - TLV element to convert
 * @returns JSON-friendly object
 */
function elementToJsonObject(element: TlvElement): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    tag: element.tag,
    length: element.length,
    value: element.value,
  };

  if (element.tagInfo) {
    obj.tagInfo = {
      name: element.tagInfo.name,
      description: element.tagInfo.description,
      format: element.tagInfo.format,
      class: element.tagInfo.class,
    };
  }

  if (element.offset !== undefined) {
    obj.offset = element.offset;
  }

  if (element.children && element.children.length > 0) {
    obj.children = element.children.map(elementToJsonObject);
  }

  return obj;
}
