/**
 * The tool registry — the single source of truth for what this app contains.
 *
 * Navigation, the command palette and routing all read from here, so a new
 * tool appears everywhere at once. Group order below is the order shown in the
 * sidebar.
 */

import { lazy } from "react";
import { cryptoSpecs } from "./specs/crypto-specs";
import { pinSpecs } from "./specs/pin-specs";
import { tagDecoderSpecs, utilSpecs } from "./specs/util-specs";
import type { ComponentToolSpec, ToolSpec } from "./types";

// Tool metadata must be available immediately for navigation and search, but
// the heavy view implementations only need to load when a pane renders them.
const TlvViewer = lazy(() =>
  import("@/components/ui/tlv-viewer/tlv-viewer").then((module) => ({
    default: module.TlvViewer,
  })),
);
const IsoViewer = lazy(() =>
  import("@/components/ui/iso-builder/iso-viewer").then((module) => ({
    default: module.IsoViewer,
  })),
);
const CustomTagManager = lazy(() =>
  import("@/components/ui/custom-tags/custom-tag-manager").then((module) => ({
    default: module.CustomTagManager,
  })),
);
const TlvComparison = lazy(() =>
  import("@/components/ui/tlv-comparison/tlv-comparison").then((module) => ({
    default: module.TlvComparison,
  })),
);
const ApduInspector = lazy(() =>
  import("@/components/ui/apdu-inspector/apdu-inspector").then((module) => ({
    default: module.ApduInspector,
  })),
);
const CapkValidatorPanel = lazy(() =>
  import("@/components/ui/emv-checks/capk-validator-panel").then((module) => ({
    default: module.CapkValidatorPanel,
  })),
);
const EmvConfigViewer = lazy(() =>
  import("@/components/ui/emv-config/emv-config-viewer").then((module) => ({
    default: module.EmvConfigViewer,
  })),
);
const Dictionaries = lazy(() =>
  import("@/components/ui/dictionaries/dictionaries").then((module) => ({
    default: module.Dictionaries,
  })),
);
const TagDecoderBuilder = lazy(() =>
  import("@/components/ui/tag-builder/tag-decoder-builder").then((module) => ({
    default: module.TagDecoderBuilder,
  })),
);

/** Sidebar group order. Anything not listed is appended alphabetically. */
export const GROUP_ORDER = [
  "EMV",
  "EMV tag decoders",
  "ISO 8583",
  "Ciphers",
  "Hashes",
  "PIN blocks",
  "PIN verification",
  "Card security values",
  "Card numbers",
  "Converters",
  "Build",
  "Reference",
] as const;

const componentTools: ComponentToolSpec[] = [
  {
    kind: "component",
    id: "tlv",
    name: "TLV Parser",
    group: "EMV",
    description:
      "Parse a BER-TLV payload, decode each tag, edit values, add or delete tags, and view the byte layout.",
    keywords: ["tlv", "ber", "parse", "emv", "tags", "byte map"],
    component: TlvViewer,
  },
  {
    kind: "component",
    id: "emv-config",
    name: "EMV Config Viewer",
    group: "EMV",
    description:
      "Load a terminal EMV configuration by URL, paste or file and inspect kernels, limits, tags and CA keys.",
    keywords: ["config", "terminal", "kernel", "capk", "url", "signed"],
    component: EmvConfigViewer,
    fullWidth: true,
  },
  {
    kind: "component",
    id: "tlv-comparison",
    name: "TLV Compare",
    group: "EMV",
    description: "Diff two TLV payloads tag by tag.",
    keywords: ["compare", "diff", "tlv"],
    component: TlvComparison,
    fullWidth: true,
  },
  {
    kind: "component",
    id: "apdu",
    name: "APDU Inspector",
    group: "EMV",
    description:
      "Decode command and response APDUs, including EMV commands and status words.",
    keywords: ["apdu", "status word", "sw1", "sw2", "select", "generate ac"],
    component: ApduInspector,
  },
  {
    kind: "component",
    id: "capk",
    name: "CA Key Validator",
    group: "EMV",
    description:
      "Recompute a CA public key checksum and check the key structure.",
    keywords: ["capk", "ca key", "checksum", "sha-1", "public key", "oda"],
    component: CapkValidatorPanel,
  },
  {
    kind: "component",
    id: "custom-tags",
    name: "Custom Tags",
    group: "EMV",
    description: "Define proprietary tags so they stop parsing as unknown.",
    keywords: ["custom", "proprietary", "tag definition"],
    component: CustomTagManager,
  },
  {
    kind: "component",
    id: "iso8583",
    name: "ISO 8583 Parser",
    group: "ISO 8583",
    description: "Parse ISO 8583 financial messages field by field.",
    keywords: ["iso 8583", "message", "mti", "fields"],
    component: IsoViewer,
  },
  {
    kind: "component",
    id: "tag-builder",
    name: "Tag Decoder Builder",
    group: "Build",
    description:
      "Build a bitfield decoder for a tag through a form, preview it live, save it so it applies everywhere, and export it as code.",
    keywords: ["builder", "generate", "generator", "custom decoder", "bitfield", "new tag", "ui"],
    component: TagDecoderBuilder,
    fullWidth: true,
  },
  {
    kind: "component",
    id: "dictionaries",
    name: "Dictionaries",
    group: "Reference",
    description:
      "Searchable EMV tag, country and currency tables.",
    keywords: ["dictionary", "reference", "lookup", "tags", "countries", "currencies", "mcc"],
    component: Dictionaries,
  },
];

export const TOOLS: ToolSpec[] = [
  ...componentTools,
  ...tagDecoderSpecs,
  ...utilSpecs,
  ...cryptoSpecs,
  ...pinSpecs,
];

/** The tool shown when nothing is selected. */
export const DEFAULT_TOOL_ID = "tlv";

const BY_ID = new Map(TOOLS.map((tool) => [tool.id, tool]));

export function getTool(id: string): ToolSpec | undefined {
  return BY_ID.get(id);
}

export function getToolOrDefault(id: string): ToolSpec {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_TOOL_ID)!;
}

export type GroupedTools = { group: string; tools: ToolSpec[] }[];

/** Tools bucketed by group, in `GROUP_ORDER` then alphabetical order. */
export function groupedTools(): GroupedTools {
  const buckets = new Map<string, ToolSpec[]>();
  for (const tool of TOOLS) {
    const list = buckets.get(tool.group) ?? [];
    list.push(tool);
    buckets.set(tool.group, list);
  }

  const ordered: GroupedTools = [];
  for (const group of GROUP_ORDER) {
    const tools = buckets.get(group);
    if (tools) {
      ordered.push({ group, tools });
      buckets.delete(group);
    }
  }
  for (const group of [...buckets.keys()].sort()) {
    ordered.push({ group, tools: buckets.get(group)! });
  }
  return ordered;
}

/** Free-text search across name, group, description and keywords. */
export function searchTools(query: string): ToolSpec[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return TOOLS;
  const terms = needle.split(/\s+/);

  return TOOLS.filter((tool) => {
    const haystack = [
      tool.name,
      tool.group,
      tool.description,
      ...(tool.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
