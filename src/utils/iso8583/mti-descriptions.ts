/**
 * ISO 8583 MTI (Message Type Indicator) Description Utilities
 * 
 * Provides human-readable descriptions for MTI components.
 * Extracted to eliminate duplication across formatter and display components.
 */

/**
 * Get a description for an MTI class code (position 2 of MTI)
 * 
 * @param classCode - MTI class code (0-9)
 * @returns Description of the message class
 */
export function getMtiClassDescription(classCode: string): string {
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
 * Get a description for an MTI function code (position 3 of MTI)
 * 
 * @param functionCode - MTI function code (0-9)
 * @returns Description of the function
 */
export function getMtiFunctionDescription(functionCode: string): string {
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
 * Get a description for an MTI origin code (position 4 of MTI)
 * 
 * @param originCode - MTI origin code (0-9)
 * @returns Description of the origin
 */
export function getMtiOriginDescription(originCode: string): string {
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
