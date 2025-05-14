import { type ReactNode } from "react";
import { TerminalCapabilitiesTag } from "./terminal-capabilities";

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

  // Add more tag-specific renderers here
  // Example:
  // "9F34": ({ value, onChange }) => (
  //   <CVMResultsTag value={value} onChange={onChange || (() => {})} />
  // ),
};

/**
 * Get a tag-specific renderer component if available
 * @param tag The tag identifier
 * @returns Tag renderer or undefined if no custom renderer exists
 */
export function getTagRenderer(tag: string): TagRenderer | undefined {
  return tagRegistry[tag];
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
