/**
 * TLV Comparison Types
 *
 * Type definitions for the TLV comparison feature
 */

import type { TlvElement } from "@/types/tlv";

/**
 * Data structure for saved TLV comparison
 */
export interface SavedTlvComparison {
  id?: number;
  name: string;
  description?: string;
  leftData: string;
  rightData: string;
  leftName: string;
  rightName: string;
  date: Date;
  tags?: string[];
  category?: string;
  favorite?: boolean;
  lastAccessed?: Date;
  source?: string;
  options?: Record<string, unknown>;
}

/**
 * Reference to a saved TLV test
 */
export interface TlvTestReference {
  id: number;
  name: string;
  description?: string;
  lastAccessed?: Date;
  favorite?: boolean;
  preview: string; // Short preview of the TLV data
}

/**
 * Diff status for a TLV element
 */
export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

/**
 * Enhanced TLV element with diff status
 */
export interface TlvElementWithDiff extends TlvElement {
  diffStatus: DiffStatus;
  differences?: {
    field: string;
    leftValue: string;
    rightValue: string;
  }[];
  leftValue?: string;
  rightValue?: string;
  // These properties come from TlvElement
  // They're listed here for clarity but are already included via extension
  // readonly tag: string; 
  // readonly length: number;
  // readonly value: string;
  // readonly tagInfo?: EmvTag;
  // children?: TlvElement[];
  // readonly rawHex?: string;
  // readonly offset?: number;
  // readonly isUnknown?: boolean;
}

/**
 * Result of comparing two TLV structures
 */
export interface TlvComparisonResult {
  leftOnly: TlvElementWithDiff[];
  rightOnly: TlvElementWithDiff[];
  modified: TlvElementWithDiff[];
  unchanged: TlvElementWithDiff[];
  differencesCount: number;
  totalElementsCompared: number;
}

/**
 * Sorting information for TLV comparison
 */
export interface TlvComparisonSorting {
  field: string;
  direction: "asc" | "desc";
  depth?: number; // for hierarchical sorting
}
