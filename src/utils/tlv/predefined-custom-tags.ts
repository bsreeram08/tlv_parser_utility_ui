/**
 * Predefined Custom Tags
 *
 * This file contains predefined custom EMV tags that are loaded into the application.
 * Developers can add commonly used proprietary or custom tags here to make them
 * available to all users of the application.
 */

import type { EmvTag } from "@/types/tlv";
import { TagClass, TagFormat } from "@/types/tlv";

/**
 * Predefined custom tags array
 *
 * Add your custom tag definitions here following the EmvTag interface.
 * Each tag must have a unique ID that doesn't conflict with standard EMV tags.
 * All tags defined here will be marked as proprietary (isPropriety: true).
 *
 * Example format:
 * {
 *   id: "9F8101",          // Tag ID in hexadecimal
 *   name: "My Custom Tag", // Descriptive name
 *   description: "...",    // Detailed description
 *   format: TagFormat.PRIMITIVE, // PRIMITIVE or CONSTRUCTED
 *   class: TagClass.PRIVATE,     // Typically PRIVATE or CONTEXT_SPECIFIC for custom tags
 *   fixedLength: 6,        // If the tag has a fixed length (in bytes)
 *   // OR use these for variable length:
 *   minLength: 1,          // Minimum length in bytes
 *   maxLength: 10,         // Maximum length in bytes
 *   isPropriety: true      // Always true for custom tags
 * }
 */
export const predefinedCustomTags: EmvTag[] = [
  // Add your custom tag definitions here
  {
    id: "82",
    name: "Application Interchange Profile",
    description:
      "Indicates the capabilities of the card to support specific functions in the application",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "binary",
  },
  {
    id: "91",
    name: "Issuer Authentication Data",
    description: "Data used for issuer authentication",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 16,
    valueType: "binary",
  },
  {
    id: "84",
    name: "Dedicated File (DF) Name",
    description: "Identifies the name of the DF as described in ISO/IEC 7816-4",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    minLength: 5,
    maxLength: 16,
    valueType: "binary",
  },
  {
    id: "95",
    name: "Terminal Verification Results",
    description: "Status of the different functions as seen from the terminal",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 5,
    valueType: "binary",
  },
  {
    id: "9A",
    name: "Transaction Date",
    description: "Local date that the transaction was authorized",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 3,
    valueType: "numeric",
  },
  {
    id: "9C",
    name: "Transaction Type",
    description:
      "Indicates the type of financial transaction, represented by the first two digits of the ISO 8583:1987 Processing Code",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
    valueType: "numeric",
  },
  {
    id: "5F2A",
    name: "Transaction Currency Code",
    description:
      "Indicates the currency code of the transaction according to ISO 4217",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    fixedLength: 2,
    valueType: "numeric",
  },
  {
    id: "5F34",
    name: "Application Primary Account Number (PAN) Sequence Number",
    description: "Identifies and differentiates cards with the same PAN",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    fixedLength: 1,
    valueType: "numeric",
  },
  {
    id: "5F24",
    name: "Application Expiry Date",
    description: "Expiry date of the application",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    fixedLength: 2,
    valueType: "numeric",
  },
  {
    id: "57",
    name: "Track 2",
    description: "Track 2 data",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    fixedLength: 16,
    valueType: "binary",
  },
  {
    id: "9F41",
    name: "Transaction Sequence Counter",
    description: "Transaction sequence counter",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "numeric",
  },
  {
    id: "8E",
    name: "Cardholder Verification Method (CVM) List",
    description: "List of CVMs supported by the card",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
    valueType: "binary",
  },
  {
    id: "9F08",
    name: "Application Version Number",
    description:
      "Version number assigned by the payment system for the application",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "binary",
  },
  {
    id: "5F20",
    name: "Cardholder Name",
    description: "Cardholder name",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    fixedLength: 16,
    valueType: "text",
  },
  {
    id: "9F39",
    name: "Point of Sale (POS) Entry mode",
    description:
      "Indicates the method used to obtain the cardholder's signature",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
    valueType: "numeric",
  },
  {
    id: "5A",
    name: "Application Primary Account Number (PAN)",
    description: "Primary Account Number",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    fixedLength: 16,
    valueType: "numeric",
  },
  {
    id: "9F02",
    name: "Amount, Authorised (Numeric)",
    description: "Authorized amount of the transaction (excluding adjustments)",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 6,
    valueType: "numeric",
  },
  {
    id: "9F03",
    name: "Amount, Other (Numeric)",
    description:
      "Secondary amount associated with the transaction representing a cashback amount",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 6,
    valueType: "numeric",
  },
  {
    id: "9F10",
    name: "Issuer Application Data",
    description:
      "Contains proprietary application data for transmission to the issuer in an online transaction",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    minLength: 0,
    maxLength: 32,
    valueType: "binary",
  },
  {
    id: "9F1A",
    name: "Terminal Country Code",
    description:
      "Indicates the country of the terminal, represented according to ISO 3166",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "numeric",
  },
  {
    id: "9F26",
    name: "Application Cryptogram",
    description: "Cryptogram generated by the card for the transaction",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 8,
    valueType: "binary",
  },
  {
    id: "9F27",
    name: "Cryptogram Information Data",
    description:
      "Indicates the type of cryptogram and the actions to be performed by the terminal",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
    valueType: "binary",
  },
  {
    id: "9F34",
    name: "Cardholder Verification Method (CVM) Results",
    description: "Indicates the results of the last CVM performed",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 3,
    valueType: "binary",
  },
  {
    id: "9F35",
    name: "Terminal Type",
    description:
      "Indicates the environment of the terminal, its communications capability, and its operational control",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 1,
    valueType: "numeric",
  },
  {
    id: "9F36",
    name: "Application Transaction Counter (ATC)",
    description:
      "Counter maintained by the application in the card (incrementing the ATC is managed by the card)",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "binary",
  },
  {
    id: "9F37",
    name: "Unpredictable Number",
    description:
      "Random number generated by the terminal and used in the generation of the Application Cryptogram",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 4,
    valueType: "binary",
  },
  {
    id: "9F6E",
    name: "Form Factor Indicator",
    description:
      "Indicates the form factor of the device and additional device information",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 4,
    valueType: "binary",
  },
  {
    id: "9F21",
    name: "Transaction Time",
    description: "Local time that the transaction was authorized",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 3,
    valueType: "numeric",
  },
  {
    id: "9F09",
    name: "Application Version Number",
    description:
      "Version number assigned by the payment system for the application",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "binary",
  },
  {
    id: "50",
    name: "Application Label",
    description: "Mnemonic associated with the AID according to ISO/IEC 7816-5",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    minLength: 1,
    maxLength: 16,
    valueType: "text",
  },
  {
    id: "9F06",
    name: "Application Identifier (AID) – terminal",
    description: "Identifies the application as described in ISO/IEC 7816-5",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    minLength: 5,
    maxLength: 16,
    valueType: "binary",
  },
  {
    id: "4F",
    name: "Application Identifier (AID) – card",
    description: "Identifies the application as described in ISO/IEC 7816-5",
    format: TagFormat.PRIMITIVE,
    class: TagClass.APPLICATION,
    minLength: 5,
    maxLength: 16,
    valueType: "binary",
  },
  {
    id: "9F15",
    name: "Merchant Category Code",
    description:
      "Classifies the type of business being done by the merchant, represented according to ISO 8583:1993",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 2,
    valueType: "numeric",
  },
  {
    id: "9F33",
    name: "Terminal Capabilities",
    description:
      "Indicates the card data input, CVM, and security capabilities of the terminal",
    format: TagFormat.PRIMITIVE,
    class: TagClass.CONTEXT_SPECIFIC,
    fixedLength: 3,
    valueType: "binary",
  },

  // You can add your 10-15 custom tags here
  // {
  //   id: "9F8102",
  //   name: "Another Custom Tag",
  //   description: "Another example of a predefined custom tag",
  //   format: TagFormat.PRIMITIVE,
  //   class: TagClass.PRIVATE,
  //   minLength: 1,
  //   maxLength: 10,
  //   isPropriety: true
  // },
];

/**
 * This array will contain both your predefined tags and any imported tags from external sources.
 * It's useful if you want to import tag definitions from JSON files or other external sources.
 */
export const allPredefinedCustomTags: EmvTag[] = [
  ...predefinedCustomTags,
  // Add imported tags here if needed
];
