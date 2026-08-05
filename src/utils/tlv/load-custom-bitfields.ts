/**
 * Load user-built bitfield decoders from IndexedDB and register them as tag
 * renderers, so they work everywhere a built-in decoder does — the TLV parser,
 * the config viewer, and nested elements.
 */

import { createElement } from "react";
import { db } from "@/utils/db/db";
import { registerTagRenderer } from "@/components/ui/tlv-tags/tag-registry";
import { BitfieldTag } from "@/components/ui/tlv-tags/bitfield-tag";
import { registerCustomBitfieldSpec } from "./custom-bitfield-registry";
import type { StoredBitfieldSpec } from "./custom-bitfields";

/** Fired after registration so open views can re-render. */
export const CUSTOM_BITFIELDS_LOADED = "CustomBitfieldsLoaded";

/** Register one spec so the tag renders with its decoder from now on. */
export function registerBitfieldDecoder(spec: StoredBitfieldSpec): void {
  registerCustomBitfieldSpec(spec);
  registerTagRenderer(spec.tag, ({ value, onChange }) =>
    createElement(BitfieldTag, {
      spec,
      value,
      onChange: onChange ?? (() => {}),
    })
  );
}

/** Load and register every stored decoder. Safe to call more than once. */
export async function loadAndRegisterCustomBitfields(): Promise<number> {
  try {
    const specs = await db.getAllCustomBitfields();
    for (const spec of specs) registerBitfieldDecoder(spec);
    if (specs.length > 0) {
      document.dispatchEvent(new CustomEvent(CUSTOM_BITFIELDS_LOADED));
    }
    return specs.length;
  } catch (e) {
    // A missing or blocked IndexedDB must not stop the app from loading.
    console.error("Could not load custom bitfield decoders", e);
    return 0;
  }
}
