/**
 * Core type definitions for ISO 8583 message formats
 * Based on ISO 8583:1987/1993/2003 specifications for financial transaction messaging
 */

/**
 * ISO 8583 Version enum
 */
export enum Iso8583Version {
  V1987 = "1987",
  V1993 = "1993",
  V2003 = "2003",
}

/**
 * ISO 8583 Message Type Indicator (MTI) Categories
 */
export enum MtiClass {
  AUTHORIZATION = "0",
  FINANCIAL = "1",
  FILE_ACTIONS = "2",
  REVERSAL = "4",
  RECONCILIATION = "5",
  ADMINISTRATIVE = "6",
  FEE_COLLECTION = "7",
  NETWORK_MANAGEMENT = "8",
}

/**
 * ISO 8583 Message Function
 */
export enum MtiFunction {
  REQUEST = "0",
  REQUEST_RESPONSE = "1",
  ADVICE = "2",
  ADVICE_RESPONSE = "3",
  NOTIFICATION = "4",
  NOTIFICATION_ACK = "5",
  INSTRUCTION = "6",
  INSTRUCTION_ACK = "7",
}

/**
 * ISO 8583 Message Origin
 */
export enum MtiOrigin {
  ACQUIRER = "0",
  ACQUIRER_REPEAT = "1",
  ISSUER = "2",
  ISSUER_REPEAT = "3",
  OTHER = "4",
  OTHER_REPEAT = "5",
}

/**
 * ISO 8583 Field Format
 */
export enum FieldFormat {
  ALPHA = "a",
  NUMERIC = "n",
  BINARY = "b",
  SPECIAL = "s",
  ALPHA_NUMERIC = "an",
  ALPHA_NUMERIC_SPECIAL = "ans",
  ALPHA_SPECIAL = "as",
  NUMERIC_SPECIAL = "ns",
  TRACK_DATA = "z",
  BINARY_NUMERIC = "xn",
}

/**
 * ISO 8583 Field Length Type
 */
export enum LengthType {
  FIXED = "fixed",
  VARIABLE = "variable",
}

/**
 * ISO 8583 Field Definition
 */
export type FieldDefinition = {
  readonly id: number;
  readonly name: string;
  readonly format: FieldFormat;
  readonly length: number;
  readonly lengthType: LengthType;
  readonly description: string;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly contentFormat?: string; // Format pattern or regex
};

/**
 * ISO 8583 Message Type Indicator (MTI)
 */
export type MessageTypeIndicator = {
  readonly version: Iso8583Version;
  readonly class: MtiClass;
  readonly function: MtiFunction;
  readonly origin: MtiOrigin;
  readonly raw: string;
};

/**
 * ISO 8583 Bitmap
 */
export type Bitmap = {
  primary: string;
  secondary?: string;
  tertiary?: string;
  presentFields: number[];
};

/**
 * ISO 8583 Field with parsed data
 */
export type IsoField = {
  id: number;
  value: string;
  raw: string;
  lengthIndicator?: string;
  definition?: FieldDefinition;
};

/**
 * ISO 8583 Parsing Result
 */
export type Iso8583ParseResult = {
  mti: MessageTypeIndicator;
  bitmap: Bitmap;
  fields: Record<number, IsoField>;
  rawMessage: string;
  errors: Iso8583ParseError[];
};

/**
 * ISO 8583 Parsing Error
 */
export type Iso8583ParseError = {
  message: string;
  fieldId?: number;
  position?: number;
};

/**
 * ISO 8583 Parsing Options
 */
export type Iso8583ParseOptions = {
  version: Iso8583Version;
  binaryBitmap?: boolean;
  includeSecondaryBitmap?: boolean;
  includeTertiaryBitmap?: boolean;
  validateFields?: boolean;
};
