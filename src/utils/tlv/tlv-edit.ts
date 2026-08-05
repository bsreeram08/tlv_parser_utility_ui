import { parseTlv } from "@/utils/tlv/tlv-parser";
import type { TlvElement, TlvParsingResult } from "@/types/tlv";

/** Encode TLV length per BER-TLV rules */
export function encodeLength(len: number): string {
  if (len < 0) throw new Error("Negative length");
  if (len < 0x80) return len.toString(16).toUpperCase().padStart(2, "0");
  // Long form
  const bytes: number[] = [];
  let tmp = len;
  while (tmp > 0) {
    bytes.unshift(tmp & 0xff);
    tmp >>= 8;
  }
  const first = (0x80 | bytes.length)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
  return (
    first +
    bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join("")
  );
}

/** Build raw hex for primitive element (tag + length + value) */
function buildPrimitiveRaw(tag: string, valueHex: string): string {
  const lenBytes = valueHex.length / 2;
  const lengthField = encodeLength(lenBytes);
  return tag + lengthField + valueHex;
}

/** Rebuild a constructed element raw from its (already rebuilt) children */
function buildConstructedRaw(tag: string, children: TlvElement[]): string {
  const valueHex = children.map((c) => c.rawHex || "").join("");
  const lenBytes = valueHex.length / 2;
  const lengthField = encodeLength(lenBytes);
  return tag + lengthField + valueHex;
}

/**
 * Edit (replace) the value of a primitive element designated by a colon-separated path of tag IDs.
 * Automatically updates all ancestor constructed tag length fields.
 * Returns new full raw hex string.
 */
export function editTlvValue(
  rawHex: string,
  path: string,
  newValueHex: string
): string {
  if (!/^[0-9A-F]*$/.test(newValueHex) || newValueHex.length % 2 !== 0) {
    throw new Error("Invalid hex value (must be even length hex)");
  }

  const pathParts = path.split(":").filter(Boolean);
  if (pathParts.length === 0) throw new Error("Empty path");

  // Parse full structure
  const parsed: TlvParsingResult = parseTlv(rawHex);

  // Convert to mutable tree clone preserving order
  const cloneElements = parsed.elements.map(cloneElementDeep);

  // Find target element reference chain
  let currentLevel = cloneElements;
  let target: TlvElement | undefined;
  const ancestorStack: TlvElement[] = [];
  for (const tag of pathParts) {
    target = currentLevel.find((e) => e.tag === tag);
    if (!target) {
      throw new Error(`Path segment not found: ${tag}`);
    }
    ancestorStack.push(target);
    currentLevel = target.children || [];
  }
  if (!target) throw new Error("Target element not found");
  if (target.children && target.children.length > 0) {
    // For now we only support editing primitive values directly.
    throw new Error("Editing constructed element value not supported");
  }

  // Rebuild target primitive raw
  const newRaw = buildPrimitiveRaw(target.tag, newValueHex);
  (target as any).value = newValueHex;
  (target as any).rawHex = newRaw;
  (target as any).length = newValueHex.length / 2;

  // Rebuild ancestors bottom-up
  for (let i = ancestorStack.length - 2; i >= 0; i--) {
    const ancestor = ancestorStack[i];
    if (ancestor.children && ancestor.children.length > 0) {
      const rebuilt = buildConstructedRaw(
        ancestor.tag,
        ancestor.children as TlvElement[]
      );
      (ancestor as any).rawHex = rebuilt;
      // Update length field
      const valueHex = ancestor.children.map((c) => c.rawHex || "").join("");
      (ancestor as any).length = valueHex.length / 2;
      (ancestor as any).value = valueHex; // keep a synthesized value hex (concatenated)
    }
  }

  // Concatenate top-level elements raw
  const finalRaw = cloneElements.map((e) => e.rawHex).join("");
  return finalRaw;
}

/**
 * Rebuild every ancestor's length field after a child list has been mutated.
 * `ancestorStack` is outermost-first and must not include the mutated child.
 */
function rebuildAncestors(ancestorStack: TlvElement[]): void {
  for (let i = ancestorStack.length - 1; i >= 0; i--) {
    const ancestor = ancestorStack[i];
    const children = ancestor.children || [];
    const valueHex = children.map((c) => c.rawHex || "").join("");
    (ancestor as any).rawHex = ancestor.tag + encodeLength(valueHex.length / 2) + valueHex;
    (ancestor as any).value = valueHex;
    (ancestor as any).length = valueHex.length / 2;
  }
}

/**
 * Walk a colon-separated tag path, returning the sibling list that holds the
 * final segment plus the chain of constructed ancestors above it.
 */
function resolveContainer(
  elements: TlvElement[],
  pathParts: string[]
): { container: TlvElement[]; ancestors: TlvElement[] } {
  const ancestors: TlvElement[] = [];
  let container = elements;
  for (const tag of pathParts) {
    const parent = container.find((e) => e.tag === tag);
    if (!parent) throw new Error(`Path segment not found: ${tag}`);
    if (!parent.children) {
      throw new Error(`Tag ${tag} is not a constructed element`);
    }
    ancestors.push(parent);
    container = parent.children;
  }
  return { container, ancestors };
}

/**
 * Delete the element designated by a colon-separated path of tag IDs.
 * Ancestor length fields are recalculated. Returns the new full raw hex.
 */
export function deleteTlvElement(rawHex: string, path: string): string {
  const pathParts = path.split(":").filter(Boolean);
  if (pathParts.length === 0) throw new Error("Empty path");

  const elements = parseTlv(rawHex).elements.map(cloneElementDeep);
  const targetTag = pathParts[pathParts.length - 1];
  const { container, ancestors } = resolveContainer(
    elements,
    pathParts.slice(0, -1)
  );

  const index = container.findIndex((e) => e.tag === targetTag);
  if (index === -1) throw new Error(`Path segment not found: ${targetTag}`);
  container.splice(index, 1);

  rebuildAncestors(ancestors);
  return elements.map((e) => e.rawHex).join("");
}

/**
 * Insert a new primitive element. `parentPath` is the colon-separated path of
 * the constructed tag to insert into, or "" / undefined for top level.
 * Appends to the end of that container. Returns the new full raw hex.
 */
export function insertTlvElement(
  rawHex: string,
  parentPath: string | undefined,
  tag: string,
  valueHex: string
): string {
  const normalizedTag = tag.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  const normalizedValue = valueHex.replace(/[^0-9a-fA-F]/g, "").toUpperCase();

  if (normalizedTag.length === 0 || normalizedTag.length % 2 !== 0) {
    throw new Error("Invalid tag (must be even-length hex)");
  }
  if (normalizedValue.length % 2 !== 0) {
    throw new Error("Invalid hex value (must be even length hex)");
  }

  const elements = parseTlv(rawHex).elements.map(cloneElementDeep);
  const pathParts = (parentPath || "").split(":").filter(Boolean);
  const { container, ancestors } = resolveContainer(elements, pathParts);

  if (container.some((e) => e.tag === normalizedTag)) {
    // Paths address elements by tag, so a duplicate tag in one container would
    // make the new element unreachable for later edits.
    throw new Error(
      `Tag ${normalizedTag} already exists in this container; edit it instead`
    );
  }

  const raw = buildPrimitiveRaw(normalizedTag, normalizedValue);
  container.push({
    tag: normalizedTag,
    length: normalizedValue.length / 2,
    value: normalizedValue,
    rawHex: raw,
  });

  rebuildAncestors(ancestors);
  return elements.map((e) => e.rawHex).join("");
}

function cloneElementDeep(e: TlvElement): TlvElement {
  const cloned: TlvElement = {
    tag: e.tag,
    length: e.length,
    value: e.value,
    tagInfo: e.tagInfo,
    rawHex: e.rawHex,
    offset: e.offset,
    isUnknown: e.isUnknown,
  };
  if (e.children) {
    cloned.children = e.children.map(cloneElementDeep);
  }
  return cloned;
}
