/**
 * Core type definitions for Tag-Length-Value (TLV) data structures
 * Based on EMV specifications for payment applications
 */

/**
 * EMV Tag Format enum to distinguish between primitive and constructed tags
 */
export enum TagFormat {
  PRIMITIVE = "primitive",
  CONSTRUCTED = "constructed",
}

/**
 * EMV Tag Class enum to identify tag classification
 */
export enum TagClass {
  UNIVERSAL = "universal",
  APPLICATION = "application",
  CONTEXT_SPECIFIC = "context-specific",
  PRIVATE = "private",
}

/**
 * EMV Tag Type representing a single tag in a TLV structure
 */
export type EmvTag = {
  readonly id: string; // Tag ID in hexadecimal format
  readonly name: string; // Descriptive name of the tag
  readonly description: string; // Detailed description of tag purpose
  readonly format: TagFormat; // Primitive or Constructed format
  readonly class: TagClass; // Tag classification
  readonly minLength?: number; // Minimum length if specified
  readonly maxLength?: number; // Maximum length if specified
  readonly fixedLength?: number; // Fixed length if applicable
  readonly isPropriety?: boolean; // Whether this is a proprietary tag
  readonly valueType?: "binary" | "numeric" | "text" | "mixed";
};

/**
 * TLV Data Element representing a parsed TLV structure
 */
export type TlvElement = {
  readonly tag: string; // Tag ID in hexadecimal format
  readonly length: number; // Length of the value in bytes
  readonly value: string; // Value in hexadecimal format
  readonly tagInfo?: EmvTag; // Optional reference to the tag definition
  children?: TlvElement[]; // Nested TLV elements (for constructed tags)
  readonly rawHex?: string; // Original hex representation
  readonly offset?: number; // Offset in the original data
  readonly isUnknown?: boolean; // Flag indicating if this is an unknown tag
};

/**
 * Parsing result containing the parsed TLV structure and any errors
 */
export type TlvParsingResult = {
  readonly elements: TlvElement[];
  readonly errors: TlvParsingError[];
  readonly rawHex: string;
};

/**
 * Error encountered during TLV parsing
 */
export type TlvParsingError = {
  readonly message: string;
  offset?: number;
  readonly tagId?: string;
};

/**
 * Options for TLV parsing
 */
export type TlvParsingOptions = {
  readonly ignoreUnknownTags?: boolean;
  readonly validateLength?: boolean;
  readonly stopOnError?: boolean;
  readonly parseConstructed?: boolean;
};
