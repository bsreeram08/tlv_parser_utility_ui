/**
 * ISO 8583 Parser Implementation
 *
 * This utility provides functions to parse ISO 8583 message formats
 * used in financial transaction processing.
 *
 * The parser supports ISO 8583:1987/1993/2003 message formats with
 * configurable options for bitmap interpretation and field validation.
 */

import {
  type Bitmap,
  FieldFormat,
  type Iso8583ParseError,
  type Iso8583ParseOptions,
  type Iso8583ParseResult,
  Iso8583Version,
  type IsoField,
  LengthType,
  type MessageTypeIndicator,
  MtiClass,
  MtiFunction,
  MtiOrigin,
} from "@/types/iso8583";
import { getFieldDefinition } from "./field-registry";

/**
 * Default parsing options
 */
const DEFAULT_PARSE_OPTIONS: Iso8583ParseOptions = {
  version: Iso8583Version.V1987,
  binaryBitmap: false,
  includeSecondaryBitmap: true,
  includeTertiaryBitmap: false,
  validateFields: true,
};

/**
 * Parse an ISO 8583 message
 *
 * @param message - ISO 8583 message in string format
 * @param options - Parsing options
 * @returns Parsing result with MTI, bitmap, fields, and any errors
 */
export function parseIso8583(
  message: string,
  options: Partial<Iso8583ParseOptions> = {}
): Iso8583ParseResult {
  // Merge default options with provided options
  const parseOptions: Iso8583ParseOptions = {
    ...DEFAULT_PARSE_OPTIONS,
    ...options,
  };

  // Initialize result
  const result: Iso8583ParseResult = {
    mti: {
      version: parseOptions.version,
      class: MtiClass.AUTHORIZATION,
      function: MtiFunction.REQUEST,
      origin: MtiOrigin.ACQUIRER,
      raw: "",
    },
    bitmap: {
      primary: "",
      presentFields: [],
    },
    fields: {},
    rawMessage: message,
    errors: [],
  };

  // Check if message is valid
  if (!message || message.length < 20) {
    // Minimum length: MTI(4) + Primary Bitmap(16)
    result.errors.push({
      message: "Message too short or invalid",
    });
    return result;
  }

  try {
    let position = 0;

    // Parse Message Type Indicator (MTI)
    const { mti, nextPosition } = parseMti(
      message,
      position,
      parseOptions.version
    );
    result.mti = mti;
    position = nextPosition;

    // Parse bitmap
    const { bitmap, nextPos, error } = parseBitmap(
      message,
      position,
      parseOptions.binaryBitmap,
      parseOptions.includeSecondaryBitmap,
      parseOptions.includeTertiaryBitmap
    );

    if (error) {
      result.errors.push(error);
      return result;
    }

    result.bitmap = bitmap;
    position = nextPos;

    // Parse data elements based on bitmap
    for (const fieldId of bitmap.presentFields) {
      try {
        const fieldDefinition = getFieldDefinition(
          fieldId,
          parseOptions.version
        );

        if (!fieldDefinition && parseOptions.validateFields) {
          result.errors.push({
            message: `Unknown field definition for field ${fieldId}`,
            fieldId,
          });
          continue;
        }

        const { field, nextPos, error } = parseField(
          message,
          position,
          fieldId,
          fieldDefinition,
          parseOptions.version
        );

        if (error) {
          result.errors.push(error);
          break;
        }

        result.fields[fieldId] = field;
        position = nextPos;
      } catch (e) {
        result.errors.push({
          message: `Error parsing field ${fieldId}: ${
            e instanceof Error ? e.message : String(e)
          }`,
          fieldId,
          position,
        });
        break;
      }
    }
  } catch (e) {
    result.errors.push({
      message: `General parsing error: ${
        e instanceof Error ? e.message : String(e)
      }`,
    });
  }

  return result;
}

/**
 * Parse the Message Type Indicator (MTI)
 *
 * @param message - ISO 8583 message
 * @param position - Current position in the message
 * @param version - ISO 8583 version
 * @returns Parsed MTI and next position
 */
function parseMti(
  message: string,
  position: number,
  version: Iso8583Version
): { mti: MessageTypeIndicator; nextPosition: number } {
  const mtiRaw = message.substring(position, position + 4);

  if (!/^\d{4}$/.test(mtiRaw)) {
    throw new Error("Invalid MTI format");
  }

  const versionDigit = mtiRaw.charAt(0);
  const classDigit = mtiRaw.charAt(1);
  const functionDigit = mtiRaw.charAt(2);
  const originDigit = mtiRaw.charAt(3);

  // Map to enums
  let mtiVersion = version;
  if (versionDigit === "0") {
    mtiVersion = Iso8583Version.V1987;
  } else if (versionDigit === "1") {
    mtiVersion = Iso8583Version.V1993;
  } else if (versionDigit === "2") {
    mtiVersion = Iso8583Version.V2003;
  }

  const mti: MessageTypeIndicator = {
    version: mtiVersion,
    class: classDigit as MtiClass,
    function: functionDigit as MtiFunction,
    origin: originDigit as MtiOrigin,
    raw: mtiRaw,
  };

  return { mti, nextPosition: position + 4 };
}

/**
 * Parse the bitmap fields
 *
 * @param message - ISO 8583 message
 * @param position - Current position in the message
 * @param binaryBitmap - Whether bitmap is in binary format
 * @param includeSecondary - Whether to include secondary bitmap
 * @param includeTertiary - Whether to include tertiary bitmap
 * @returns Parsed bitmap, next position, and any error
 */
function parseBitmap(
  message: string,
  position: number,
  binaryBitmap: boolean,
  includeSecondary: boolean,
  includeTertiary: boolean
): { bitmap: Bitmap; nextPos: number; error?: Iso8583ParseError } {
  const bitmap: Bitmap = {
    primary: "",
    presentFields: [],
  };

  try {
    // Handle binary bitmap
    const bitmapLength = binaryBitmap ? 8 : 16; // 8 bytes or 16 hex chars

    if (position + bitmapLength > message.length) {
      return {
        bitmap,
        nextPos: position,
        error: {
          message: "Message too short for primary bitmap",
          position,
        },
      };
    }

    // Extract primary bitmap
    bitmap.primary = message.substring(position, position + bitmapLength);
    position += bitmapLength;

    // Convert binary bitmap to hex if needed
    let primaryBitmapHex = bitmap.primary;
    if (binaryBitmap) {
      primaryBitmapHex = Buffer.from(bitmap.primary, "binary")
        .toString("hex")
        .toUpperCase();
    }

    // Parse primary bitmap to get present fields
    const primaryFields = parseBitmapFields(primaryBitmapHex, 0);
    bitmap.presentFields = primaryFields;

    // Check if secondary bitmap is needed (field 1 is present)
    if (primaryFields.includes(1) && includeSecondary) {
      if (position + bitmapLength > message.length) {
        return {
          bitmap,
          nextPos: position,
          error: {
            message: "Message too short for secondary bitmap",
            position,
          },
        };
      }

      // Extract secondary bitmap
      bitmap.secondary = message.substring(position, position + bitmapLength);
      position += bitmapLength;

      // Convert binary bitmap to hex if needed
      let secondaryBitmapHex = bitmap.secondary;
      if (binaryBitmap) {
        secondaryBitmapHex = Buffer.from(bitmap.secondary, "binary")
          .toString("hex")
          .toUpperCase();
      }

      // Parse secondary bitmap to get present fields (fields 65-128)
      const secondaryFields = parseBitmapFields(secondaryBitmapHex, 64);
      bitmap.presentFields = [...primaryFields, ...secondaryFields];

      // Check if tertiary bitmap is needed (field 65 is present)
      if (secondaryFields.includes(65) && includeTertiary) {
        if (position + bitmapLength > message.length) {
          return {
            bitmap,
            nextPos: position,
            error: {
              message: "Message too short for tertiary bitmap",
              position,
            },
          };
        }

        // Extract tertiary bitmap
        bitmap.tertiary = message.substring(position, position + bitmapLength);
        position += bitmapLength;

        // Convert binary bitmap to hex if needed
        let tertiaryBitmapHex = bitmap.tertiary;
        if (binaryBitmap) {
          tertiaryBitmapHex = Buffer.from(bitmap.tertiary, "binary")
            .toString("hex")
            .toUpperCase();
        }

        // Parse tertiary bitmap to get present fields (fields 129-192)
        const tertiaryFields = parseBitmapFields(tertiaryBitmapHex, 128);
        bitmap.presentFields = [...bitmap.presentFields, ...tertiaryFields];
      }
    }

    // Remove bitmap indicator fields (1, 65, 129) from the present fields list
    bitmap.presentFields = bitmap.presentFields.filter(
      (f) => f !== 1 && f !== 65 && f !== 129
    );

    // Sort fields by ID for predictable processing
    bitmap.presentFields.sort((a, b) => a - b);

    return { bitmap, nextPos: position };
  } catch (e) {
    return {
      bitmap,
      nextPos: position,
      error: {
        message: `Error parsing bitmap: ${
          e instanceof Error ? e.message : String(e)
        }`,
        position,
      },
    };
  }
}

/**
 * Parse bitmap fields from a hexadecimal bitmap string
 *
 * @param bitmapHex - Hexadecimal bitmap string
 * @param offset - Field ID offset (0 for primary, 64 for secondary, 128 for tertiary)
 * @returns Array of present field IDs
 */
function parseBitmapFields(bitmapHex: string, offset: number): number[] {
  const presentFields: number[] = [];

  // Convert hex to binary
  let binaryStr = "";
  for (let i = 0; i < bitmapHex.length; i++) {
    const hexChar = bitmapHex.charAt(i);
    const decimal = parseInt(hexChar, 16);
    const binary = decimal.toString(2).padStart(4, "0");
    binaryStr += binary;
  }

  // Parse binary string to get present fields
  for (let i = 0; i < binaryStr.length; i++) {
    if (binaryStr.charAt(i) === "1") {
      presentFields.push(i + 1 + offset);
    }
  }

  return presentFields;
}

/**
 * Parse a single ISO 8583 field
 *
 * @param message - ISO 8583 message
 * @param position - Current position in the message
 * @param fieldId - Field ID to parse
 * @param fieldDefinition - Field definition
 * @param version - ISO 8583 version
 * @returns Parsed field, next position, and any error
 */
function parseField(
  message: string,
  position: number,
  fieldId: number,
  fieldDefinition: any,
  version: Iso8583Version
): { field: IsoField; nextPos: number; error?: Iso8583ParseError } {
  // Initialize field
  const field: IsoField = {
    id: fieldId,
    value: "",
    raw: "",
  };

  try {
    let fieldLength = 0;
    let lengthIndicator = "";
    let startPos = position;

    // For variable length fields, parse the length indicator
    if (fieldDefinition?.lengthType === LengthType.VARIABLE) {
      const lengthDigits = fieldDefinition.length.toString().length;

      if (position + lengthDigits > message.length) {
        return {
          field,
          nextPos: position,
          error: {
            message: `Message too short for field ${fieldId} length indicator`,
            fieldId,
            position,
          },
        };
      }

      lengthIndicator = message.substring(position, position + lengthDigits);
      fieldLength = parseInt(lengthIndicator, 10);
      position += lengthDigits;
      field.lengthIndicator = lengthIndicator;
    } else if (fieldDefinition) {
      // For fixed length fields, use the field definition
      fieldLength = fieldDefinition.length;
    } else {
      // For unknown fields, use a reasonable default based on field ID
      fieldLength = 1;

      // Some heuristics for common fields without definitions
      if (fieldId >= 102 && fieldId <= 125) {
        fieldLength = 999; // Likely LLLVAR

        const lengthDigits = 3;
        if (position + lengthDigits > message.length) {
          return {
            field,
            nextPos: position,
            error: {
              message: `Message too short for field ${fieldId} length indicator`,
              fieldId,
              position,
            },
          };
        }

        lengthIndicator = message.substring(position, position + lengthDigits);
        fieldLength = parseInt(lengthIndicator, 10);
        position += lengthDigits;
        field.lengthIndicator = lengthIndicator;
      }
    }

    // Check if we have enough data for the field value
    if (position + fieldLength > message.length) {
      return {
        field,
        nextPos: position,
        error: {
          message: `Message too short for field ${fieldId} value`,
          fieldId,
          position,
        },
      };
    }

    // Extract the field value
    field.value = message.substring(position, position + fieldLength);

    // Set raw field value including length indicator if present
    field.raw = lengthIndicator + field.value;

    // Set field definition
    field.definition = fieldDefinition;

    // Move position past the field value
    position += fieldLength;

    return { field, nextPos: position };
  } catch (e) {
    return {
      field,
      nextPos: position,
      error: {
        message: `Error parsing field ${fieldId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
        fieldId,
        position,
      },
    };
  }
}
