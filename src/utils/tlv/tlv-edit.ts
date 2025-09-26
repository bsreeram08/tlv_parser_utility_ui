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
