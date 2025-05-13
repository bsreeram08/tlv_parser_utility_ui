/**
 * ISO 8583 Formatter Utility
 *
 * Provides functions to format ISO 8583 messages in various representations
 * for display and conversion purposes.
 */

import {
  type IsoField,
  type Iso8583ParseResult,
  type MessageTypeIndicator,
  type Bitmap,
} from "@/types/iso8583";

/**
 * Format options for ISO 8583 data representation
 */
export type Iso8583FormattingOptions = {
  readonly showFieldDetails: boolean;
  readonly showRawData: boolean;
  readonly hideEmptyFields: boolean;
  readonly sortFields: boolean;
  readonly verboseMti: boolean;
};

/**
 * Default formatting options
 */
const DEFAULT_FORMAT_OPTIONS: Iso8583FormattingOptions = {
  showFieldDetails: true,
  showRawData: false,
  hideEmptyFields: true,
  sortFields: true,
  verboseMti: true,
};

/**
 * Format an ISO 8583 parsing result as a readable text string
 *
 * @param result - ISO 8583 parsing result to format
 * @param options - Formatting options
 * @returns Formatted string representation
 */
export function formatIso8583AsText(
  result: Iso8583ParseResult,
  options: Partial<Iso8583FormattingOptions> = {}
): string {
  const mergedOptions: Iso8583FormattingOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    ...options,
  };

  let output = "";

  // Add raw message if requested
  if (mergedOptions.showRawData) {
    output += `Raw Message: ${result.rawMessage}\n\n`;
  }

  // Add any parsing errors
  if (result.errors.length > 0) {
    output += "Parsing Errors:\n";
    result.errors.forEach((error, index) => {
      output += `  ${index + 1}. ${error.message}`;
      if (error.fieldId !== undefined) {
        output += ` (Field ${error.fieldId})`;
      }
      if (error.position !== undefined) {
        output += ` (at position ${error.position})`;
      }
      output += "\n";
    });
    output += "\n";
  }

  // Format MTI
  output += formatMti(result.mti, mergedOptions.verboseMti);
  output += "\n\n";

  // Format bitmap
  output += formatBitmap(result.bitmap, mergedOptions.showRawData);
  output += "\n\n";

  // Format fields
  output += "Data Elements:\n";

  // Get fields to format
  let fields = Object.values(result.fields);

  // Sort fields if requested
  if (mergedOptions.sortFields) {
    fields = fields.sort((a, b) => a.id - b.id);
  }

  // Filter out empty fields if requested
  if (mergedOptions.hideEmptyFields) {
    fields = fields.filter((field) => field.value.length > 0);
  }

  if (fields.length === 0) {
    output += "  No data elements present\n";
  } else {
    fields.forEach((field) => {
      output += formatField(
        field,
        mergedOptions.showFieldDetails,
        mergedOptions.showRawData
      );
    });
  }

  return output;
}

/**
 * Format the Message Type Indicator (MTI)
 *
 * @param mti - MTI to format
 * @param verbose - Whether to include verbose descriptions
 * @returns Formatted MTI string
 */
function formatMti(mti: MessageTypeIndicator, verbose: boolean): string {
  let output = `Message Type Indicator (MTI): ${mti.raw}\n`;

  if (verbose) {
    output += `  Version: ${mti.version}\n`;
    output += `  Class: ${mti.class} - ${getMtiClassDescription(mti.class)}\n`;
    output += `  Function: ${mti.function} - ${getMtiFunctionDescription(
      mti.function
    )}\n`;
    output += `  Origin: ${mti.origin} - ${getMtiOriginDescription(
      mti.origin
    )}\n`;
  }

  return output;
}

/**
 * Get a description for an MTI class code
 *
 * @param classCode - MTI class code
 * @returns Description of the class
 */
function getMtiClassDescription(classCode: string): string {
  switch (classCode) {
    case "0":
      return "Authorization";
    case "1":
      return "Financial";
    case "2":
      return "File Actions";
    case "3":
      return "File Update";
    case "4":
      return "Reversal";
    case "5":
      return "Reconciliation";
    case "6":
      return "Administrative";
    case "7":
      return "Fee Collection";
    case "8":
      return "Network Management";
    case "9":
      return "Reserved for ISO use";
    default:
      return "Unknown";
  }
}

/**
 * Get a description for an MTI function code
 *
 * @param functionCode - MTI function code
 * @returns Description of the function
 */
function getMtiFunctionDescription(functionCode: string): string {
  switch (functionCode) {
    case "0":
      return "Request";
    case "1":
      return "Request Response";
    case "2":
      return "Advice";
    case "3":
      return "Advice Response";
    case "4":
      return "Notification";
    case "5":
      return "Notification Acknowledgement";
    case "6":
      return "Instruction";
    case "7":
      return "Instruction Acknowledgement";
    case "8":
      return "Reserved for ISO use";
    case "9":
      return "Reserved for ISO use";
    default:
      return "Unknown";
  }
}

/**
 * Get a description for an MTI origin code
 *
 * @param originCode - MTI origin code
 * @returns Description of the origin
 */
function getMtiOriginDescription(originCode: string): string {
  switch (originCode) {
    case "0":
      return "Acquirer";
    case "1":
      return "Acquirer Repeat";
    case "2":
      return "Issuer";
    case "3":
      return "Issuer Repeat";
    case "4":
      return "Other";
    case "5":
      return "Other Repeat";
    case "6":
      return "Reserved for ISO use";
    case "7":
      return "Reserved for ISO use";
    case "8":
      return "Reserved for ISO use";
    case "9":
      return "Reserved for ISO use";
    default:
      return "Unknown";
  }
}

/**
 * Format the bitmap
 *
 * @param bitmap - Bitmap to format
 * @param showRaw - Whether to include raw bitmap data
 * @returns Formatted bitmap string
 */
function formatBitmap(bitmap: Bitmap, showRaw: boolean): string {
  let output = "Bitmap:\n";

  if (showRaw) {
    output += `  Primary: ${bitmap.primary}\n`;
    if (bitmap.secondary) {
      output += `  Secondary: ${bitmap.secondary}\n`;
    }
    if (bitmap.tertiary) {
      output += `  Tertiary: ${bitmap.tertiary}\n`;
    }
    output += "\n";
  }

  output += "  Present Fields: ";
  output += bitmap.presentFields.join(", ");

  return output;
}

/**
 * Format a single ISO 8583 field
 *
 * @param field - Field to format
 * @param showDetails - Whether to include field details
 * @param showRaw - Whether to include raw field data
 * @returns Formatted field string
 */
function formatField(
  field: IsoField,
  showDetails: boolean,
  showRaw: boolean
): string {
  let output = `  Field ${field.id}`;

  if (field.definition) {
    output += ` - ${field.definition.name}`;
  }

  output += "\n";

  // Show field details if requested
  if (showDetails && field.definition) {
    output += `    Format: ${field.definition.format}`;
    output += `, Length Type: ${field.definition.lengthType}`;

    if (field.definition.lengthType === "fixed") {
      output += `, Length: ${field.definition.length}`;
    } else {
      output += `, Max Length: ${
        field.definition.maxLength ?? field.definition.length
      }`;
    }

    output += "\n";

    if (field.definition.description) {
      output += `    Description: ${field.definition.description}\n`;
    }
  }

  // Show field value
  output += `    Value: ${field.value}\n`;

  // Show raw data if requested
  if (showRaw) {
    output += `    Raw: ${field.raw}\n`;
  }

  return output;
}

/**
 * Format an ISO 8583 parsing result as a JSON object
 *
 * @param result - ISO 8583 parsing result to format
 * @returns JSON-friendly representation
 */
export function formatIso8583AsJson(
  result: Iso8583ParseResult
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  // Format fields
  Object.values(result.fields).forEach((field) => {
    fields[field.id.toString()] = {
      id: field.id,
      value: field.value,
      raw: field.raw,
      lengthIndicator: field.lengthIndicator,
      definition: field.definition
        ? {
            name: field.definition.name,
            format: field.definition.format,
            lengthType: field.definition.lengthType,
            description: field.definition.description,
          }
        : undefined,
    };
  });

  return {
    mti: {
      raw: result.mti.raw,
      version: result.mti.version,
      class: result.mti.class,
      function: result.mti.function,
      origin: result.mti.origin,
    },
    bitmap: {
      primary: result.bitmap.primary,
      secondary: result.bitmap.secondary,
      tertiary: result.bitmap.tertiary,
      presentFields: result.bitmap.presentFields,
    },
    fields,
    errors: result.errors,
    rawMessage: result.rawMessage,
  };
}
