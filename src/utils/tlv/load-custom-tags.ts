import { db } from "@/utils/db/db";
import { registerTag } from "./tag-registry";
import type { EmvTag } from "@/types/tlv";

/**
 * Load custom tags from the DB and register them in the tag registry.
 * Also dispatches a CustomTagsLoaded event for plural listeners.
 */
export async function loadAndRegisterCustomTags(): Promise<void> {
  try {
    const customTags = await db.getAllCustomTags();

    // Convert CustomTagDefinition to EmvTag-like objects where possible
    const emvTags: EmvTag[] = customTags.map((t) => ({
      id: t.id.toUpperCase(),
      name: t.name,
      description: t.description || "",
      format: (t.format as any) || ("primitive" as any),
      class: "application" as any,
      minLength: t.lengthRule?.min,
      maxLength: t.lengthRule?.max,
      fixedLength: t.lengthRule?.fixed,
    }));

    emvTags.forEach((tag) => registerTag(tag));

    // Dispatch event for backward compatibility
    const event = new CustomEvent<EmvTag[]>("CustomTagsLoaded", {
      detail: emvTags,
    });
    document.dispatchEvent(event);

    // New unified event for components to listen and trigger re-parse
    document.dispatchEvent(
      new CustomEvent("CustomTagRegistryUpdated", { detail: emvTags })
    );
  } catch (err) {
    // Swallow errors; caller may show a toast if needed
    // console.warn("Failed to load custom tags:", err);
  }
}
