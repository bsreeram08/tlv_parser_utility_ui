/**
 * Runtime registry of user-built bitfield specs.
 *
 * Kept separate from the built-in `bitfieldSpecs` table so the built-ins stay a
 * static, reviewable constant while user decoders are added at run time. Lookups
 * that should see both go through `lookupBitfieldSpec`.
 */

import { bitfieldSpecs, type BitfieldSpec } from "./bitfield-specs";

const customSpecs = new Map<string, BitfieldSpec>();

export function registerCustomBitfieldSpec(spec: BitfieldSpec): void {
  customSpecs.set(spec.tag.toUpperCase(), spec);
}

export function unregisterCustomBitfieldSpec(tag: string): void {
  customSpecs.delete(tag.toUpperCase());
}

export function getCustomBitfieldSpecs(): BitfieldSpec[] {
  return [...customSpecs.values()];
}

/** Built-in specs win, so a user decoder cannot silently shadow a reviewed one. */
export function lookupBitfieldSpec(tag: string): BitfieldSpec | undefined {
  const key = tag.toUpperCase();
  return bitfieldSpecs[key] ?? customSpecs.get(key);
}

export function isBuiltInBitfieldTag(tag: string): boolean {
  return tag.toUpperCase() in bitfieldSpecs;
}
