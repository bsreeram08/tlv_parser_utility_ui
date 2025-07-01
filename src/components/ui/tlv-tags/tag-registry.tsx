import { type ReactNode } from "react";
import { sanitizeSelectValues } from "@/utils/select-helpers";
import { TerminalCapabilitiesTag } from "./terminal-capabilities";
import { ApplicationInterchangeProfileTag } from "./application-interchange-profile";
import { TerminalVerificationResultsTag } from "./terminal-verification-results";
import { CVMResultsTag } from "./cvm-results";
import { TransactionDateTag } from "./transaction-date";
import { CurrencyCodeTag } from "./currency-code";
import { TransactionTypeTag } from "./transaction-type";
import { AmountAuthorisedTag } from "./amount-authorised";

// Interface for tag renderer props
export interface TagRendererProps {
  tag: string;
  value: string;
  onChange?: (newValue: string) => void;
  isComparison?: boolean;
}

// Type for tag renderer component
export type TagRenderer = (props: TagRendererProps) => ReactNode;

// Tag registry maps tag IDs to their specialized renderer components
const tagRegistry: Record<string, TagRenderer> = {
  // EMV Terminal capabilities
  "9F33": ({ value, onChange }) => (
    <TerminalCapabilitiesTag value={value} onChange={onChange || (() => {})} />
  ),

  // EMV Application Interchange Profile
  "82": ({ value, onChange }) => (
    <ApplicationInterchangeProfileTag
      value={value}
      onChange={onChange || (() => {})}
    />
  ),

  // EMV Terminal Verification Results
  "95": ({ value, onChange }) => (
    <TerminalVerificationResultsTag
      value={value}
      onChange={onChange || (() => {})}
    />
  ),

  // EMV CVM Results
  "9F34": ({ value, onChange }) => (
    <CVMResultsTag value={value} onChange={onChange || (() => {})} />
  ),

  // EMV Transaction Date
  "9A": ({ value, onChange }) => (
    <TransactionDateTag value={value} onChange={onChange || (() => {})} />
  ),

  // EMV Currency Code
  "5F2A": ({ value, onChange }) => (
    <CurrencyCodeTag value={value} onChange={onChange || (() => {})} />
  ),

  // EMV Transaction Type
  "9C": ({ value, onChange }) => (
    <TransactionTypeTag value={value} onChange={onChange || (() => {})} />
  ),

  // EMV Amount Authorised
  "9F02": ({ value, onChange }) => (
    <AmountAuthorisedTag value={value} onChange={onChange || (() => {})} />
  ),

  // Add more tag-specific renderers here
};

/**
 * Get a tag-specific renderer component if available
 * @param tag The tag identifier
 * @returns Tag renderer or undefined if no custom renderer exists
 */
export function getTagRenderer(tag: string): TagRenderer | undefined {
  const renderer = tagRegistry[tag];

  if (!renderer) return undefined;

  // Return a wrapper that sanitizes props before rendering
  return (props) => {
    // Sanitize props to avoid empty strings in SelectItem components
    const sanitizedProps = sanitizeSelectValues(props);
    return renderer(sanitizedProps);
  };
}

/**
 * Check if a custom renderer exists for a given tag
 * @param tag The tag identifier
 * @returns True if a custom renderer exists
 */
export function hasCustomRenderer(tag: string): boolean {
  return tag in tagRegistry;
}

/**
 * Register a new tag renderer
 * @param tag The tag identifier
 * @param renderer The renderer component for the tag
 */
export function registerTagRenderer(tag: string, renderer: TagRenderer): void {
  tagRegistry[tag] = renderer;
}
