/**
 * User-defined bitfield tag decoders.
 *
 * New EMV tags turn up faster than this app can hardcode them, and some are
 * kernel-specific enough that a wrong built-in decode would be worse than
 * none. So the same `BitfieldSpec` the built-in decoders use can be authored
 * from the UI, stored in IndexedDB, and registered at run time.
 *
 * There is deliberately no user-supplied code here: a spec is pure data (bytes,
 * masks, labels), so nothing is ever evaluated. To make a decoder permanent,
 * export it as a TypeScript literal and paste it into `bitfield-specs.ts`.
 */

import type {
  BitDef,
  BitfieldSpec,
  ByteDef,
  EnumDef,
  PresetDef,
} from "./bitfield-specs";

/** A spec as stored, with the bookkeeping the built-in table does not need. */
export type StoredBitfieldSpec = BitfieldSpec & {
  /** Primary key — the tag, uppercased. */
  readonly tag: string;
  readonly created?: Date;
  readonly modified?: Date;
};

export type ValidationIssue = { field: string; message: string };

const BIT_LABELS = [
  "bit 8 (0x80)",
  "bit 7 (0x40)",
  "bit 6 (0x20)",
  "bit 5 (0x10)",
  "bit 4 (0x08)",
  "bit 3 (0x04)",
  "bit 2 (0x02)",
  "bit 1 (0x01)",
];

/** Mask for a bit index, where 0 is bit 8 (the most significant). */
export function maskForBitIndex(index: number): number {
  return 0x80 >> index;
}

export function bitLabelForIndex(index: number): string {
  return BIT_LABELS[index] ?? `bit ${8 - index}`;
}

/**
 * Check a spec is coherent enough to decode with. Returns every problem so the
 * builder can show them all at once rather than one per save attempt.
 */
export function validateBitfieldSpec(
  spec: Partial<BitfieldSpec>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const tag = (spec.tag ?? "").replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (tag.length === 0) {
    issues.push({ field: "tag", message: "Enter a tag." });
  } else if (tag.length % 2 !== 0) {
    issues.push({
      field: "tag",
      message: `Tag must be a whole number of bytes; "${tag}" has ${tag.length} hex digits.`,
    });
  } else if (tag.length > 8) {
    issues.push({
      field: "tag",
      message: "A BER-TLV tag is at most 4 bytes.",
    });
  }

  if (!(spec.name ?? "").trim()) {
    issues.push({ field: "name", message: "Enter a name." });
  }

  const bytes = spec.bytes ?? [];
  if (bytes.length === 0) {
    issues.push({ field: "bytes", message: "Add at least one byte." });
  }
  if (bytes.length > 16) {
    issues.push({
      field: "bytes",
      message: "This decoder is meant for short bitmaps; 16 bytes is the limit.",
    });
  }

  bytes.forEach((byteDef, index) => {
    const where = `bytes[${index}]`;
    if (!(byteDef.name ?? "").trim()) {
      issues.push({ field: where, message: `Byte ${index + 1} needs a name.` });
    }

    const seen = new Set<number>();
    (byteDef.bits ?? []).forEach((bit, bitIndex) => {
      const bitWhere = `${where}.bits[${bitIndex}]`;
      if (
        !Number.isInteger(bit.mask) ||
        bit.mask < 1 ||
        bit.mask > 0xff ||
        (bit.mask & (bit.mask - 1)) !== 0
      ) {
        issues.push({
          field: bitWhere,
          message: `Byte ${index + 1}: mask 0x${Number(bit.mask)
            .toString(16)
            .toUpperCase()} is not a single bit.`,
        });
      }
      if (seen.has(bit.mask)) {
        issues.push({
          field: bitWhere,
          message: `Byte ${index + 1}: mask 0x${bit.mask
            .toString(16)
            .toUpperCase()} is used twice.`,
        });
      }
      seen.add(bit.mask);

      if (!(bit.label ?? "").trim()) {
        issues.push({
          field: bitWhere,
          message: `Byte ${index + 1}, ${bitLabelForIndex(
            Math.log2(0x80 / bit.mask)
          )}: enter a label or remove the bit.`,
        });
      }
    });

    (byteDef.enums ?? []).forEach((enumDef, enumIndex) => {
      const enumWhere = `${where}.enums[${enumIndex}]`;
      if (!(enumDef.label ?? "").trim()) {
        issues.push({ field: enumWhere, message: "Enum needs a label." });
      }
      if (!Number.isInteger(enumDef.mask) || enumDef.mask < 1 || enumDef.mask > 0xff) {
        issues.push({
          field: enumWhere,
          message: `Enum mask 0x${Number(enumDef.mask)
            .toString(16)
            .toUpperCase()} must be between 0x01 and 0xFF.`,
        });
        return;
      }
      // Enum keys are masked values, so a key outside the mask can never match.
      for (const raw of Object.keys(enumDef.values ?? {})) {
        const value = Number(raw);
        if ((value & enumDef.mask) !== value) {
          issues.push({
            field: enumWhere,
            message: `Enum "${enumDef.label}": value 0x${value
              .toString(16)
              .toUpperCase()} has bits outside its mask 0x${enumDef.mask
              .toString(16)
              .toUpperCase()}, so it can never match.`,
          });
        }
      }
      // A bit covered by an enum should not also be a checkbox.
      for (const bit of byteDef.bits ?? []) {
        if ((bit.mask & enumDef.mask) !== 0) {
          issues.push({
            field: enumWhere,
            message: `Byte ${index + 1}: bit 0x${bit.mask
              .toString(16)
              .toUpperCase()} ("${bit.label}") overlaps enum "${
              enumDef.label
            }". Use one or the other for a given bit.`,
          });
        }
      }
    });
  });

  (spec.presets ?? []).forEach((preset, index) => {
    const where = `presets[${index}]`;
    if (!(preset.name ?? "").trim()) {
      issues.push({ field: where, message: "Preset needs a name." });
    }
    const value = (preset.value ?? "").replace(/[^0-9A-Fa-f]/g, "");
    if (value.length !== bytes.length * 2) {
      issues.push({
        field: where,
        message: `Preset "${preset.name || index + 1}" is ${
          value.length / 2
        } bytes but this tag is ${bytes.length}.`,
      });
    }
  });

  return issues;
}

/** Normalise a draft into a stored spec. Assumes it already validates. */
export function normaliseBitfieldSpec(
  spec: BitfieldSpec
): StoredBitfieldSpec {
  return {
    ...spec,
    tag: spec.tag.replace(/[^0-9A-Fa-f]/g, "").toUpperCase(),
    name: spec.name.trim(),
    description: (spec.description ?? "").trim(),
    ref: (spec.ref ?? "").trim(),
    note: spec.note?.trim() || undefined,
    bytes: spec.bytes.map((byteDef) => ({
      name: byteDef.name.trim(),
      bits: (byteDef.bits ?? [])
        .filter((b) => b.label.trim())
        // Show bits most-significant first, as EMV tables do.
        .sort((a, b) => b.mask - a.mask)
        .map((b) => ({
          mask: b.mask,
          label: b.label.trim(),
          note: b.note?.trim() || undefined,
        })),
      enums: (byteDef.enums ?? []).filter(
        (e) => e.label.trim() && Object.keys(e.values ?? {}).length > 0
      ),
    })),
    presets: (spec.presets ?? [])
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        value: p.value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase(),
        desc: (p.desc ?? "").trim(),
      })),
  };
}

/* ------------------------------------------------------------ code export */

const quote = (value: string) => JSON.stringify(value);
const hexMask = (mask: number) =>
  `0x${mask.toString(16).padStart(2, "0")}`;

function emitBit(bit: BitDef, indent: string): string {
  const parts = [`mask: ${hexMask(bit.mask)}`, `label: ${quote(bit.label)}`];
  if (bit.note) parts.push(`note: ${quote(bit.note)}`);
  return `${indent}{ ${parts.join(", ")} },`;
}

function emitEnum(enumDef: EnumDef, indent: string): string {
  const values = Object.entries(enumDef.values)
    .map(
      ([raw, label]) =>
        `${indent}    ${hexMask(Number(raw))}: ${quote(label)},`
    )
    .join("\n");
  return [
    `${indent}{`,
    `${indent}  mask: ${hexMask(enumDef.mask)},`,
    `${indent}  label: ${quote(enumDef.label)},`,
    `${indent}  values: {`,
    values,
    `${indent}  },`,
    `${indent}},`,
  ].join("\n");
}

function emitByte(byteDef: ByteDef, indent: string): string {
  const lines = [`${indent}{`, `${indent}  name: ${quote(byteDef.name)},`];

  if (byteDef.enums && byteDef.enums.length > 0) {
    lines.push(`${indent}  enums: [`);
    for (const enumDef of byteDef.enums) {
      lines.push(emitEnum(enumDef, `${indent}    `));
    }
    lines.push(`${indent}  ],`);
  }
  if (byteDef.bits && byteDef.bits.length > 0) {
    lines.push(`${indent}  bits: [`);
    for (const bit of byteDef.bits) {
      lines.push(emitBit(bit, `${indent}    `));
    }
    lines.push(`${indent}  ],`);
  }

  lines.push(`${indent}},`);
  return lines.join("\n");
}

function emitPreset(preset: PresetDef, indent: string): string {
  return `${indent}{ name: ${quote(preset.name)}, value: ${quote(
    preset.value
  )}, desc: ${quote(preset.desc)} },`;
}

/**
 * Emit the spec as a TypeScript literal for `bitfield-specs.ts`, so a decoder
 * built in the UI can be promoted into the codebase.
 */
export function emitBitfieldSpecCode(spec: BitfieldSpec): string {
  const constName = `TAG_${spec.tag.toUpperCase()}`;
  const lines = [
    `const ${constName}: BitfieldSpec = {`,
    `  tag: ${quote(spec.tag.toUpperCase())},`,
    `  name: ${quote(spec.name)},`,
    `  description: ${quote(spec.description ?? "")},`,
    `  ref: ${quote(spec.ref ?? "")},`,
  ];
  if (spec.note) lines.push(`  note: ${quote(spec.note)},`);

  lines.push(`  bytes: [`);
  for (const byteDef of spec.bytes) lines.push(emitByte(byteDef, "    "));
  lines.push(`  ],`);

  if (spec.presets && spec.presets.length > 0) {
    lines.push(`  presets: [`);
    for (const preset of spec.presets) lines.push(emitPreset(preset, "    "));
    lines.push(`  ],`);
  }

  lines.push(`};`);
  lines.push("");
  lines.push(`// Then add to the bitfieldSpecs map:`);
  lines.push(`//   ${quote(spec.tag.toUpperCase())}: ${constName},`);

  return lines.join("\n");
}

/** A blank byte, for the builder's "add byte" action. */
export function emptyByte(index: number): ByteDef {
  return { name: `Byte ${index + 1}`, bits: [], enums: [] };
}

/** A blank spec, for a new decoder. */
export function emptySpec(): BitfieldSpec {
  return {
    tag: "",
    name: "",
    description: "",
    ref: "",
    bytes: [emptyByte(0)],
    presets: [],
  };
}
