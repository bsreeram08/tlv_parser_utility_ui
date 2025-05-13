/**
 * Types for custom tag definition system
 * 
 * Provides interfaces for defining custom EMV tags that aren't part of the standard
 * dictionary, allowing users to extend the system with their own tag definitions.
 */

import type { TagFormat } from "./tlv";

/**
 * Supported data formats for custom EMV tags
 */
export enum CustomTagDataFormat {
  Binary = "binary",
  Numeric = "numeric",
  Alphanumeric = "alphanumeric",
  Date = "date",
  Time = "time",
  Amount = "amount",
  Custom = "custom"
}

/**
 * Length rule type for custom tags
 */
export enum LengthRuleType {
  Fixed = "fixed", // Fixed length (e.g., exactly 4 bytes)
  Variable = "variable", // Variable length with constraints (e.g., 1-10 bytes)
  Any = "any" // Any length
}

/**
 * Length rule for custom tags
 */
export interface LengthRule {
  type: LengthRuleType;
  min?: number; // Minimum length for variable length tags
  max?: number; // Maximum length for variable length tags
  fixed?: number; // Fixed length value
}

/**
 * Display format options for parsed tag data
 */
export enum DisplayFormat {
  Hex = "hex", // Display as hexadecimal
  Ascii = "ascii", // Display as ASCII text
  Decimal = "decimal", // Display as decimal number
  Binary = "binary", // Display as binary
  Formatted = "formatted" // Custom format (e.g., date as YYYY-MM-DD)
}

/**
 * Custom tag definition interface
 */
export interface CustomTagDefinition {
  id: string; // Tag ID in hexadecimal (e.g., "9F1A")
  name: string; // Tag name (e.g., "Terminal Country Code")
  description?: string; // Optional description
  format: TagFormat; // Format identifier as per EMV spec
  dataFormat: CustomTagDataFormat; // Format of the tag's data
  lengthRule: LengthRule; // Length constraints
  displayFormat: DisplayFormat; // How to display the tag value
  created: Date; // When the tag was created
  modified?: Date; // When the tag was last modified
  userId?: string; // Identifier for user who created the tag (for future multi-user support)
}

/**
 * Custom tag creation parameters (used when creating a new tag)
 */
export type CustomTagCreationParams = Omit<CustomTagDefinition, 'created' | 'modified' | 'userId'>;

/**
 * Custom tag update parameters (used when editing an existing tag)
 */
export type CustomTagUpdateParams = Partial<Omit<CustomTagDefinition, 'id' | 'created' | 'userId'>> & {
  id: string; // Tag ID is required for updates
};
