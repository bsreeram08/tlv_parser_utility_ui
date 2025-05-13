/**
 * ISO 8583 Field Registry
 *
 * Registry of standard ISO 8583 field definitions based on ISO 8583:1987/1993/2003
 * specifications for financial transaction messaging.
 */

import {
  type FieldDefinition,
  FieldFormat,
  LengthType,
  Iso8583Version,
} from "@/types/iso8583";

// Map of field IDs to their definitions
const fieldRegistry = new Map<string, FieldDefinition>();

/**
 * Register standard ISO 8583 fields
 * These fields are based on the ISO 8583:1987 specification
 * Additional fields for other versions are registered separately
 */
function registerStandardFields(): void {
  const standardFields: FieldDefinition[] = [
    {
      id: 2,
      name: "Primary Account Number (PAN)",
      format: FieldFormat.NUMERIC,
      length: 19,
      lengthType: LengthType.VARIABLE,
      maxLength: 19,
      description: "Card number that identifies the cardholder account",
    },
    {
      id: 3,
      name: "Processing Code",
      format: FieldFormat.NUMERIC,
      length: 6,
      lengthType: LengthType.FIXED,
      description:
        "Transaction type and accounts affected (position 1-2: transaction type, 3-4: account type from, 5-6: account type to)",
    },
    {
      id: 4,
      name: "Amount, Transaction",
      format: FieldFormat.NUMERIC,
      length: 12,
      lengthType: LengthType.FIXED,
      description:
        "Transaction amount in the smallest currency unit without decimal point",
    },
    {
      id: 7,
      name: "Transmission Date and Time",
      format: FieldFormat.NUMERIC,
      length: 10,
      lengthType: LengthType.FIXED,
      contentFormat: "MMDDhhmmss",
      description: "Date and time of the transaction in MMDDhhmmss format",
    },
    {
      id: 11,
      name: "System Trace Audit Number (STAN)",
      format: FieldFormat.NUMERIC,
      length: 6,
      lengthType: LengthType.FIXED,
      description:
        "Unique trace number assigned by the sending device for identification",
    },
    {
      id: 12,
      name: "Time, Local Transaction",
      format: FieldFormat.NUMERIC,
      length: 6,
      lengthType: LengthType.FIXED,
      contentFormat: "hhmmss",
      description: "Time of the transaction in hhmmss format",
    },
    {
      id: 13,
      name: "Date, Local Transaction",
      format: FieldFormat.NUMERIC,
      length: 4,
      lengthType: LengthType.FIXED,
      contentFormat: "MMDD",
      description: "Date of the transaction in MMDD format",
    },
    {
      id: 14,
      name: "Date, Expiration",
      format: FieldFormat.NUMERIC,
      length: 4,
      lengthType: LengthType.FIXED,
      contentFormat: "YYMM",
      description: "Card expiration date in YYMM format",
    },
  ];

  // Register all fields in the registry
  standardFields.forEach((field) => {
    fieldRegistry.set(field.id.toString(), field);
  });
}

/**
 * Register additional fields for ISO 8583:1987
 */
function registerISO8583_1987Fields(): void {
  const fields: FieldDefinition[] = [
    {
      id: 22,
      name: "Point of Service Entry Mode",
      format: FieldFormat.NUMERIC,
      length: 3,
      lengthType: LengthType.FIXED,
      description: "Method by which the PAN was entered, and PIN capability",
    },
    {
      id: 24,
      name: "Network International Identifier (NII)",
      format: FieldFormat.NUMERIC,
      length: 3,
      lengthType: LengthType.FIXED,
      description: "Identifies the institution that issues the message",
    },
    {
      id: 25,
      name: "Point of Service Condition Code",
      format: FieldFormat.NUMERIC,
      length: 2,
      lengthType: LengthType.FIXED,
      description:
        "Terminal attendance, transaction status, and terminal location",
    },
    {
      id: 32,
      name: "Acquiring Institution Identification Code",
      format: FieldFormat.NUMERIC,
      length: 11,
      lengthType: LengthType.VARIABLE,
      maxLength: 11,
      description: "Code identifying the acquiring institution",
    },
    {
      id: 35,
      name: "Track 2 Data",
      format: FieldFormat.TRACK_DATA,
      length: 37,
      lengthType: LengthType.VARIABLE,
      maxLength: 37,
      description: "Data from track 2 of the magnetic stripe",
    },
    {
      id: 37,
      name: "Retrieval Reference Number",
      format: FieldFormat.ALPHA_NUMERIC,
      length: 12,
      lengthType: LengthType.FIXED,
      description: "Reference number for transaction retrieval purposes",
    },
    {
      id: 38,
      name: "Authorization Identification Response",
      format: FieldFormat.ALPHA_NUMERIC,
      length: 6,
      lengthType: LengthType.FIXED,
      description: "Code assigned by the authorizing institution",
    },
    {
      id: 39,
      name: "Response Code",
      format: FieldFormat.ALPHA_NUMERIC,
      length: 2,
      lengthType: LengthType.FIXED,
      description: "Code indicating the status of the transaction",
    },
    {
      id: 41,
      name: "Card Acceptor Terminal Identification",
      format: FieldFormat.ALPHA_NUMERIC,
      length: 8,
      lengthType: LengthType.FIXED,
      description: "Code identifying the terminal",
    },
    {
      id: 42,
      name: "Card Acceptor Identification Code",
      format: FieldFormat.ALPHA_NUMERIC,
      length: 15,
      lengthType: LengthType.FIXED,
      description: "Code identifying the card acceptor",
    },
    {
      id: 43,
      name: "Card Acceptor Name/Location",
      format: FieldFormat.ALPHA_NUMERIC_SPECIAL,
      length: 40,
      lengthType: LengthType.FIXED,
      description: "Name and location of the card acceptor",
    },
    {
      id: 49,
      name: "Currency Code, Transaction",
      format: FieldFormat.NUMERIC,
      length: 3,
      lengthType: LengthType.FIXED,
      description:
        "Code representing the currency of the transaction according to ISO 4217",
    },
    {
      id: 52,
      name: "Personal Identification Number (PIN) Data",
      format: FieldFormat.BINARY,
      length: 8,
      lengthType: LengthType.FIXED,
      description: "Encrypted PIN block for transaction validation",
    },
    {
      id: 54,
      name: "Additional Amounts",
      format: FieldFormat.ALPHA_NUMERIC_SPECIAL,
      length: 120,
      lengthType: LengthType.VARIABLE,
      maxLength: 120,
      description:
        "Amounts associated with the transaction but separate from the transaction amount",
    },
  ];

  // Register all fields in the registry
  fields.forEach((field) => {
    fieldRegistry.set(field.id.toString(), field);
  });
}

// Initialize the registry with standard fields
registerStandardFields();
registerISO8583_1987Fields();

/**
 * Get the definition of a specific field by ID
 *
 * @param fieldId - The field ID (1-128 for primary, 129-192 for secondary)
 * @param version - ISO 8583 version (optional, defaults to 1987)
 * @returns Field definition or undefined if not found
 */
export function getFieldDefinition(
  fieldId: number,
  version: Iso8583Version = Iso8583Version.V1987
): FieldDefinition | undefined {
  const fieldDef = fieldRegistry.get(fieldId.toString());
  if (fieldDef) {
    return fieldDef;
  }

  // Try to find a version-specific definition if not found in standard fields
  // This would be implemented for fields that differ between versions
  return undefined;
}

/**
 * Register a custom field definition
 *
 * @param fieldDef - Field definition to register
 * @returns True if registered successfully, false if already exists
 */
export function registerFieldDefinition(fieldDef: FieldDefinition): boolean {
  const key = fieldDef.id.toString();
  if (fieldRegistry.has(key)) {
    return false;
  }

  fieldRegistry.set(key, fieldDef);
  return true;
}

/**
 * Get all field definitions
 *
 * @param version - ISO 8583 version (optional, defaults to 1987)
 * @returns Array of all field definitions
 */
export function getAllFieldDefinitions(
  version: Iso8583Version = Iso8583Version.V1987
): FieldDefinition[] {
  return Array.from(fieldRegistry.values());
}
