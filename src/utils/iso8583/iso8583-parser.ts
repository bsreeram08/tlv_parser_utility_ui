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
import { bytesToHex, isValidHex, normalizeHex } from "@/utils/byte-utils";
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

type TextEncoding = "ascii" | "ebcdic";

type NormalizedIsoMessage =
  | {
      kind: "text";
      data: string;
    }
  | {
      kind: "binary";
      data: Uint8Array;
      textEncoding: TextEncoding;
    };

type FieldParseState = {
  fields: Record<number, IsoField>;
  position: number;
  score: number;
};

type BinaryFieldCandidate = {
  field: IsoField;
  nextPos: number;
  score: number;
};

const EBCDIC_SPECIAL_CHAR_MAP: Record<number, string> = {
  0x40: " ",
  0x4a: "¢",
  0x4b: ".",
  0x4c: "<",
  0x4d: "(",
  0x4e: "+",
  0x4f: "|",
  0x50: "&",
  0x5a: "!",
  0x5b: "$",
  0x5c: "*",
  0x5d: ")",
  0x5e: ";",
  0x60: "-",
  0x61: "/",
  0x6b: ",",
  0x6c: "%",
  0x6d: "_",
  0x6e: ">",
  0x6f: "?",
  0x79: "`",
  0x7a: ":",
  0x7b: "#",
  0x7c: "@",
  0x7d: "'",
  0x7e: "=",
  0x7f: '"',
  0xa0: "µ",
  0xa1: "~",
  0xba: "[",
  0xbb: "]",
  0xc0: "{",
  0xd0: "}",
  0xe0: "\\",
};

function sanitizeMessage(message: string): string {
  return message.replace(/\s+/g, "").trim();
}

function isAsciiDigitByte(byte: number): boolean {
  return byte >= 0x30 && byte <= 0x39;
}

function isEbcdicDigitByte(byte: number): boolean {
  return byte >= 0xf0 && byte <= 0xf9;
}

function decodeByteDigit(byte: number, encoding: TextEncoding): string | null {
  if (encoding === "ascii" && isAsciiDigitByte(byte)) {
    return String.fromCharCode(byte);
  }

  if (encoding === "ebcdic" && isEbcdicDigitByte(byte)) {
    return String.fromCharCode(byte - 0xf0 + 0x30);
  }

  return null;
}

function decodeTextByte(byte: number, encoding: TextEncoding): string {
  if (encoding === "ascii") {
    return byte >= 0x20 && byte <= 0x7e
      ? String.fromCharCode(byte)
      : `\\x${byte.toString(16).padStart(2, "0").toUpperCase()}`;
  }

  const digit = decodeByteDigit(byte, "ebcdic");
  if (digit) {
    return digit;
  }

  if (byte >= 0xc1 && byte <= 0xc9) {
    return String.fromCharCode(byte - 0xc1 + 65);
  }
  if (byte >= 0xd1 && byte <= 0xd9) {
    return String.fromCharCode(byte - 0xd1 + 74);
  }
  if (byte >= 0xe2 && byte <= 0xe9) {
    return String.fromCharCode(byte - 0xe2 + 83);
  }
  if (byte >= 0x81 && byte <= 0x89) {
    return String.fromCharCode(byte - 0x81 + 97);
  }
  if (byte >= 0x91 && byte <= 0x99) {
    return String.fromCharCode(byte - 0x91 + 106);
  }
  if (byte >= 0xa2 && byte <= 0xa9) {
    return String.fromCharCode(byte - 0xa2 + 115);
  }

  return EBCDIC_SPECIAL_CHAR_MAP[byte] ?? `\\x${byte.toString(16).padStart(2, "0").toUpperCase()}`;
}

function decodeTextBytes(bytes: Uint8Array, encoding: TextEncoding): string {
  return Array.from(bytes, (byte) => decodeTextByte(byte, encoding)).join("");
}

function decodeDigitBytes(bytes: Uint8Array, encoding: TextEncoding): string {
  return Array.from(bytes, (byte) => decodeByteDigit(byte, encoding) ?? "").join("");
}

function parseHexMessage(message: string): Uint8Array {
  const normalized = normalizeHex(message);
  const bytes = new Uint8Array(normalized.length / 2);

  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.substring(i, i + 2), 16);
  }

  return bytes;
}

function detectBinaryMessageEncoding(
  bytes: Uint8Array
): TextEncoding | undefined {
  if (bytes.length < 4) {
    return undefined;
  }

  if (Array.from(bytes.subarray(0, 4)).every(isAsciiDigitByte)) {
    return "ascii";
  }

  if (Array.from(bytes.subarray(0, 4)).every(isEbcdicDigitByte)) {
    return "ebcdic";
  }

  return undefined;
}

function normalizeMessageInput(message: string): NormalizedIsoMessage {
  const sanitized = sanitizeMessage(message);

  if (isValidHex(sanitized)) {
    const bytes = parseHexMessage(sanitized);
    const textEncoding = detectBinaryMessageEncoding(bytes);

    if (textEncoding) {
      return {
        kind: "binary",
        data: bytes,
        textEncoding,
      };
    }
  }

  return {
    kind: "text",
    data: sanitized,
  };
}

export function isSupportedIso8583Message(message: string): boolean {
  const normalized = normalizeMessageInput(message);

  if (normalized.kind === "text") {
    return normalized.data.length >= 20 && /^\d{4}/.test(normalized.data);
  }

  return (
    normalized.data.length >= 12 &&
    /^\d{4}$/.test(
      decodeTextBytes(normalized.data.subarray(0, 4), normalized.textEncoding)
    )
  );
}

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
  const normalizedMessage = normalizeMessageInput(message);

  // Merge default options with provided options
  const parseOptions: Iso8583ParseOptions = {
    ...DEFAULT_PARSE_OPTIONS,
    ...options,
    binaryBitmap:
      normalizedMessage.kind === "binary"
        ? true
        : options.binaryBitmap ?? DEFAULT_PARSE_OPTIONS.binaryBitmap,
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
  if (!isSupportedIso8583Message(message)) {
    result.errors.push({
      message: "Message too short or invalid",
    });
    return result;
  }

  try {
    let position = 0;

    // Parse Message Type Indicator (MTI)
    const { mti, nextPosition } = parseMti(
      normalizedMessage,
      position,
      parseOptions.version
    );
    result.mti = mti;
    position = nextPosition;

    // Parse bitmap
    const { bitmap, nextPos, error } = parseBitmap(
      normalizedMessage,
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
    if (normalizedMessage.kind === "binary") {
      const parseState = parseBinaryFields(
        normalizedMessage,
        position,
        bitmap.presentFields,
        parseOptions.version,
        parseOptions.validateFields ?? true
      );

      if (!parseState) {
        result.errors.push({
          message: "Unable to parse the binary ISO 8583 payload",
          position,
        });
        return result;
      }

      result.fields = parseState.fields;
      position = parseState.position;

      if (position < normalizedMessage.data.length) {
        result.errors.push({
          message: `Message contains ${normalizedMessage.data.length - position} trailing byte(s) after the parsed fields`,
          position,
        });
      }
    } else {
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
            normalizedMessage.data,
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
  message: NormalizedIsoMessage,
  position: number,
  version: Iso8583Version
): { mti: MessageTypeIndicator; nextPosition: number } {
  const mtiRaw =
    message.kind === "binary"
      ? decodeTextBytes(message.data.subarray(position, position + 4), message.textEncoding)
      : message.data.substring(position, position + 4);

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
  message: NormalizedIsoMessage,
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
    const bitmapLength =
      message.kind === "binary" || binaryBitmap ? 8 : 16; // 8 bytes or 16 hex chars

    const messageLength =
      message.kind === "binary" ? message.data.length : message.data.length;

    if (position + bitmapLength > messageLength) {
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
    bitmap.primary =
      message.kind === "binary"
        ? bytesToHex(Array.from(message.data.subarray(position, position + bitmapLength)))
        : message.data.substring(position, position + bitmapLength);
    position += bitmapLength;

    // Convert binary bitmap to hex if needed
    let primaryBitmapHex = bitmap.primary;
    if (message.kind !== "binary" && binaryBitmap) {
      primaryBitmapHex = Buffer.from(bitmap.primary, "binary").toString("hex").toUpperCase();
    }

    // Parse primary bitmap to get present fields
    const primaryFields = parseBitmapFields(primaryBitmapHex, 0);
    bitmap.presentFields = primaryFields;

    // Check if secondary bitmap is needed (field 1 is present)
    if (primaryFields.includes(1) && includeSecondary) {
      if (position + bitmapLength > messageLength) {
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
      bitmap.secondary =
        message.kind === "binary"
          ? bytesToHex(Array.from(message.data.subarray(position, position + bitmapLength)))
          : message.data.substring(position, position + bitmapLength);
      position += bitmapLength;

      // Convert binary bitmap to hex if needed
      let secondaryBitmapHex = bitmap.secondary;
      if (message.kind !== "binary" && binaryBitmap) {
        secondaryBitmapHex = Buffer.from(bitmap.secondary, "binary")
          .toString("hex")
          .toUpperCase();
      }

      // Parse secondary bitmap to get present fields (fields 65-128)
      const secondaryFields = parseBitmapFields(secondaryBitmapHex, 64);
      bitmap.presentFields = [...primaryFields, ...secondaryFields];

      // Check if tertiary bitmap is needed (field 65 is present)
      if (secondaryFields.includes(65) && includeTertiary) {
        if (position + bitmapLength > messageLength) {
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
        bitmap.tertiary =
          message.kind === "binary"
            ? bytesToHex(Array.from(message.data.subarray(position, position + bitmapLength)))
            : message.data.substring(position, position + bitmapLength);
        position += bitmapLength;

        // Convert binary bitmap to hex if needed
        let tertiaryBitmapHex = bitmap.tertiary;
        if (message.kind !== "binary" && binaryBitmap) {
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

function getLengthIndicatorDigits(fieldDefinition?: {
  length: number;
  lengthType: LengthType;
}): number {
  if (!fieldDefinition || fieldDefinition.lengthType !== LengthType.VARIABLE) {
    return 0;
  }

  return fieldDefinition.length.toString().length;
}

function getMinimumFieldLength(fieldId: number, version: Iso8583Version): number {
  const fieldDefinition = getFieldDefinition(fieldId, version);

  if (!fieldDefinition) {
    return 1;
  }

  if (fieldDefinition.lengthType === LengthType.VARIABLE) {
    return getLengthIndicatorDigits(fieldDefinition) + (fieldDefinition.minLength ?? 1);
  }

  return fieldDefinition.length;
}

function getRemainingMinimumLength(
  fieldIds: number[],
  version: Iso8583Version
): number {
  return fieldIds.reduce(
    (total, fieldId) => total + getMinimumFieldLength(fieldId, version),
    0
  );
}

function decodeBinaryFieldValue(
  valueBytes: Uint8Array,
  fieldDefinition: ReturnType<typeof getFieldDefinition>,
  textEncoding: TextEncoding
): string {
  if (fieldDefinition?.format === FieldFormat.BINARY) {
    return bytesToHex(Array.from(valueBytes));
  }

  return decodeTextBytes(valueBytes, textEncoding);
}

function isFieldValueValid(field: IsoField, validateFields: boolean): boolean {
  if (!validateFields || !field.definition) {
    return true;
  }

  if (field.definition.format === FieldFormat.BINARY) {
    return /^[0-9A-F]*$/.test(field.value) && field.value.length % 2 === 0;
  }

  if (field.definition.format === FieldFormat.NUMERIC) {
    return /^\d+$/.test(field.value);
  }

  if (field.definition.lengthType === LengthType.FIXED) {
    const valueLength = field.value.length;
    const minLength = field.definition.length;
    const maxLength = field.definition.maxLength ?? field.definition.length;

    return valueLength >= minLength && valueLength <= maxLength;
  }

  return true;
}

function buildBinaryFieldCandidates(
  message: Extract<NormalizedIsoMessage, { kind: "binary" }>,
  position: number,
  fieldId: number,
  version: Iso8583Version,
  remainingFieldIds: number[],
  validateFields: boolean
): BinaryFieldCandidate[] {
  const fieldDefinition = getFieldDefinition(fieldId, version);
  const availableBytes = message.data.length - position;
  const remainingMinimumBytes = getRemainingMinimumLength(remainingFieldIds, version);
  const maxValueBytes = Math.max(availableBytes - remainingMinimumBytes, 0);
  const candidates: BinaryFieldCandidate[] = [];

  if (!fieldDefinition) {
    if (availableBytes > remainingMinimumBytes) {
      const valueBytes = message.data.subarray(position, position + 1);
      candidates.push({
        field: {
          id: fieldId,
          value: decodeTextBytes(valueBytes, message.textEncoding),
          raw: bytesToHex(Array.from(valueBytes)),
        },
        nextPos: position + 1,
        score: -1,
      });
    }

    return candidates;
  }

  const buildCandidate = (
    valueStart: number,
    valueLength: number,
    lengthIndicatorBytes?: Uint8Array
  ): BinaryFieldCandidate | undefined => {
    if (valueLength <= 0 || valueStart + valueLength > message.data.length) {
      return undefined;
    }

    const valueBytes = message.data.subarray(valueStart, valueStart + valueLength);
    const field: IsoField = {
      id: fieldId,
      value: decodeBinaryFieldValue(valueBytes, fieldDefinition, message.textEncoding),
      raw: bytesToHex([
        ...(lengthIndicatorBytes ? Array.from(lengthIndicatorBytes) : []),
        ...Array.from(valueBytes),
      ]),
      definition: fieldDefinition,
    };

    if (lengthIndicatorBytes) {
      field.lengthIndicator = decodeDigitBytes(
        lengthIndicatorBytes,
        message.textEncoding
      );
    }

    if (!isFieldValueValid(field, validateFields)) {
      return undefined;
    }

    return {
      field,
      nextPos: valueStart + valueLength,
      score: lengthIndicatorBytes ? 2 : 0,
    };
  };

  if (fieldDefinition.lengthType === LengthType.VARIABLE) {
    const lengthIndicatorDigits = getLengthIndicatorDigits(fieldDefinition);
    const lengthIndicatorBytes = message.data.subarray(
      position,
      position + lengthIndicatorDigits
    );
    const parsedLengthIndicator = decodeDigitBytes(
      lengthIndicatorBytes,
      message.textEncoding
    );
    const hasValidLengthIndicator =
      parsedLengthIndicator.length === lengthIndicatorDigits &&
      /^\d+$/.test(parsedLengthIndicator);

    if (hasValidLengthIndicator) {
      const fieldLength = parseInt(parsedLengthIndicator, 10);
      const maxLength = fieldDefinition.maxLength ?? fieldDefinition.length;

      if (fieldLength <= maxLength && fieldLength <= maxValueBytes) {
        const candidate = buildCandidate(
          position + lengthIndicatorDigits,
          fieldLength,
          lengthIndicatorBytes
        );

        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length === 0) {
      const minLength = fieldDefinition.minLength ?? 1;
      const maxLength = Math.min(
        fieldDefinition.maxLength ?? fieldDefinition.length,
        maxValueBytes
      );

      for (let fieldLength = maxLength; fieldLength >= minLength; fieldLength--) {
        const candidate = buildCandidate(position, fieldLength);
        if (candidate) {
          candidate.score = -2;
          candidates.push(candidate);
        }
      }
    }

    return candidates;
  }

  const minLength = fieldDefinition.length;
  const maxLength = Math.min(
    fieldDefinition.maxLength ?? fieldDefinition.length,
    maxValueBytes
  );

  for (let fieldLength = minLength; fieldLength <= maxLength; fieldLength++) {
    const candidate = buildCandidate(position, fieldLength);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function parseBinaryFields(
  message: Extract<NormalizedIsoMessage, { kind: "binary" }>,
  position: number,
  fieldIds: number[],
  version: Iso8583Version,
  validateFields: boolean
): FieldParseState | null {
  const cache = new Map<string, FieldParseState | null>();

  const walk = (fieldIndex: number, currentPosition: number): FieldParseState | null => {
    const cacheKey = `${fieldIndex}:${currentPosition}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey) ?? null;
    }

    if (fieldIndex >= fieldIds.length) {
      const state = {
        fields: {},
        position: currentPosition,
        score: 0,
      };
      cache.set(cacheKey, state);
      return state;
    }

    const fieldId = fieldIds[fieldIndex];
    const remainingFieldIds = fieldIds.slice(fieldIndex + 1);
    const candidates = buildBinaryFieldCandidates(
      message,
      currentPosition,
      fieldId,
      version,
      remainingFieldIds,
      validateFields
    );

    let bestState: FieldParseState | null = null;

    for (const candidate of candidates) {
      const nextState = walk(fieldIndex + 1, candidate.nextPos);

      if (!nextState) {
        continue;
      }

      const mergedState: FieldParseState = {
        fields: {
          [fieldId]: candidate.field,
          ...nextState.fields,
        },
        position: nextState.position,
        score: candidate.score + nextState.score,
      };

      if (
        !bestState ||
        mergedState.position > bestState.position ||
        (mergedState.position === bestState.position &&
          mergedState.score > bestState.score)
      ) {
        bestState = mergedState;
      }
    }

    cache.set(cacheKey, bestState);
    return bestState;
  };

  return walk(0, position);
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
  _version: Iso8583Version
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
    // let startPos = position;

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
