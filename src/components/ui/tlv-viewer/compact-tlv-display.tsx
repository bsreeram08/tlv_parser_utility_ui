/**
 * Dense TLV data table. Raw tag data is always visible; richer decoders are an
 * explicit secondary action instead of forcing every row into an accordion.
 */

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Copy, CornerDownRight, HelpCircle, ScanSearch, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { sanitizeSelectValues } from "@/utils/select-helpers";
import { type TlvElement, type TlvParsingResult } from "@/types/tlv";
import { CustomTagForm } from "@/components/ui/custom-tags";
import { TagActionsMenu } from "@/components/ui/tlv-tags/tag-actions-menu";
import { db } from "@/utils/db/db";
import { loadAndRegisterCustomTags } from "@/utils/tlv/load-custom-tags";
import {
  getTagRenderer,
  hasCustomRenderer,
} from "@/components/ui/tlv-tags/tag-registry";
import { tlvValueToAscii } from "@/utils/tlv";
import { encodeLength } from "@/utils/tlv/tlv-edit";
import { cn } from "@/lib/utils";
import {
  type CustomTagCreationParams,
  CustomTagDataFormat,
  DisplayFormat,
  LengthRuleType,
} from "@/types/custom-tag";

function filterElementsByQuery(
  elements: TlvElement[],
  query: string
): TlvElement[] {
  const needle = query.trim().toUpperCase();
  if (!needle) return elements;

  const matches = (element: TlvElement) =>
    element.tag.toUpperCase().includes(needle) ||
    (element.tagInfo?.name || "").toUpperCase().includes(needle) ||
    element.value.toUpperCase().includes(needle);

  return elements.reduce<TlvElement[]>((kept, element) => {
    const keptChildren = element.children
      ? filterElementsByQuery(element.children, query)
      : undefined;

    if (matches(element)) kept.push(element);
    else if (keptChildren && keptChildren.length > 0) {
      kept.push({ ...element, children: keptChildren });
    }
    return kept;
  }, []);
}

type FlatTlvRow = {
  element: TlvElement;
  depth: number;
  path: string;
  key: string;
};

function flattenElements(
  elements: TlvElement[],
  parentPath = "",
  depth = 0
): FlatTlvRow[] {
  return elements.flatMap((element, index) => {
    const path = parentPath ? `${parentPath}:${element.tag}` : element.tag;
    const row: FlatTlvRow = {
      element,
      depth,
      path,
      key: `${path}-${index}`,
    };
    return element.children?.length
      ? [row, ...flattenElements(element.children, path, depth + 1)]
      : [row];
  });
}

function fullTlv(tag: string, value: string): string {
  return `${tag}${encodeLength(value.length / 2)}${value}`;
}

async function copyText(value: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error("Copy failed");
  }
}

interface CompactTlvDisplayProps {
  result: TlvParsingResult | null;
  onRefresh?: () => void;
  /** Kept for source compatibility; rows are now always visible. */
  expandAll?: boolean;
  onEditElement?: (path: string, newValueHex: string) => void;
  onDeleteElement?: (path: string) => void;
  highlightPath?: string;
}

export function CompactTlvDisplay({
  result,
  onRefresh,
  onEditElement,
  onDeleteElement,
  highlightPath,
}: CompactTlvDisplayProps): JSX.Element {
  const [query, setQuery] = useState("");
  const allRows = useMemo(
    () => (result ? flattenElements(result.elements) : []),
    [result]
  );
  const visibleRows = useMemo(
    () =>
      result
        ? flattenElements(filterElementsByQuery(result.elements, query))
        : [],
    [query, result]
  );

  if (!result) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        Enter TLV data and click Parse to see results here
      </div>
    );
  }

  if (allRows.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        No TLV elements were parsed
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm">TLV Data</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {allRows.length} tag{allRows.length === 1 ? "" : "s"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 gap-1.5 px-2 text-xs"
            onClick={() => void copyText(result.rawHex, "Complete TLV copied")}
          >
            <Copy className="size-3.5" />
            Copy TLV
          </Button>
        </div>
        <CardDescription className="text-xs">
          Raw values are visible and selectable. Inspect only when you need a decoded view.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by tag, name, or value"
            aria-label="Filter tags"
            className="h-8 pl-8 pr-8 text-xs"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear filter"
              className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
              onClick={() => setQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {visibleRows.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No tags match “{query.trim()}”
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="hidden grid-cols-[5rem_minmax(10rem,0.7fr)_4.5rem_minmax(16rem,1.3fr)] gap-2 border-b bg-muted/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <div>Tag</div>
              <div>Name</div>
              <div>Length</div>
              <div>Value</div>
            </div>
            <div className="divide-y">
              {visibleRows.map((row) => (
                <TlvTableRow
                  key={row.key}
                  {...row}
                  onRefresh={onRefresh}
                  onEditElement={onEditElement}
                  onDeleteElement={onDeleteElement}
                  highlighted={highlightPath === row.path}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TlvTableRow({
  element,
  depth,
  path,
  onRefresh,
  onEditElement,
  onDeleteElement,
  highlighted,
}: FlatTlvRow & {
  onRefresh?: () => void;
  onEditElement?: (path: string, newValueHex: string) => void;
  onDeleteElement?: (path: string) => void;
  highlighted: boolean;
}): JSX.Element {
  const [defineTagOpen, setDefineTagOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState(element.value);
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const asciiValue = tlvValueToAscii(element.value);
  const hasAscii =
    asciiValue !== element.value && asciiValue.trim().length > 0;
  const hasDecoder = hasCustomRenderer(element.tag);
  const hasDetails = Boolean(element.tagInfo?.description || hasAscii || hasDecoder);

  useEffect(() => setEditValue(element.value), [element.value]);

  useEffect(
    () => () => {
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
      }
    },
    []
  );

  const handleDelete = () => {
    if (!onDeleteElement || exiting) return;

    setExiting(true);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    exitTimer.current = window.setTimeout(
      () => onDeleteElement(path),
      reducedMotion ? 100 : 120
    );
  };

  const handleCreateCustomTag = async (
    tagParams: CustomTagCreationParams
  ) => {
    await db.addCustomTag({
      ...sanitizeSelectValues(tagParams),
      created: new Date(),
    });
    await loadAndRegisterCustomTags();
    onRefresh?.();
  };

  const initialTagParams: Partial<CustomTagCreationParams> = {
    id: element.tag,
    name: `Custom Tag ${element.tag}`,
    description: "Custom tag definition for unknown tag",
    dataFormat: CustomTagDataFormat.Binary,
    lengthRule: { type: LengthRuleType.Fixed, fixed: element.length },
    displayFormat: DisplayFormat.Hex,
  };

  const renderer = hasDecoder ? getTagRenderer(element.tag) : undefined;

  return (
    <div
      data-highlighted={highlighted}
      data-structural-entry={highlighted}
      data-exiting={exiting}
      aria-hidden={exiting || undefined}
      className={cn(
        "tlv-mutation-feedback tlv-structural-row relative grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-1 px-2 py-1.5 text-xs hover:bg-muted/25 md:grid-cols-[5rem_minmax(10rem,0.7fr)_4.5rem_minmax(16rem,1.3fr)] md:items-start",
        element.isUnknown && "bg-muted/20"
      )}
    >
      <div
        className="flex min-w-0 items-center gap-1"
        style={{ paddingLeft: `${Math.min(depth, 4) * 10}px` }}
      >
        {depth > 0 && <CornerDownRight className="size-3 shrink-0 text-muted-foreground" />}
        <Badge
          variant={element.isUnknown ? "outline" : "secondary"}
          className="h-5 px-1.5 font-mono text-[10px]"
        >
          {element.tag}
        </Badge>
      </div>

      <div className="min-w-0 self-center font-medium leading-snug">
        {element.tagInfo?.name || "Unknown tag"}
      </div>

      <Badge variant="outline" className="h-5 self-center px-1.5 text-[10px]">
        {element.length} B
      </Badge>

      <div className="col-span-3 flex min-w-0 items-start gap-1 md:col-span-1">
        <code className="min-w-0 flex-1 select-all break-all rounded bg-muted/55 px-1.5 py-1 font-mono text-[11px] leading-4">
          {element.value || "<empty>"}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0"
          onClick={() => void copyText(element.value, `Value for ${element.tag} copied`)}
          aria-label={`Copy value for tag ${element.tag}`}
          title={`Copy value for tag ${element.tag}`}
        >
          <Copy className="size-3.5" />
        </Button>
        {hasDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="size-7 shrink-0 p-0"
            onClick={() => setInspectOpen(true)}
            aria-label={`Inspect decoded value for tag ${element.tag}`}
            title={`Inspect decoded value for tag ${element.tag}`}
          >
            <ScanSearch className="size-3.5" />
          </Button>
        )}
        {element.isUnknown && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => setDefineTagOpen(true)}
            aria-label={`Define unknown tag ${element.tag}`}
            title="Define custom tag"
          >
            <HelpCircle className="size-3.5" />
          </Button>
        )}
        <TagActionsMenu
          tag={element.tag}
          path={path}
          onEdit={onEditElement ? () => setEditOpen(true) : undefined}
          onDelete={onDeleteElement ? handleDelete : undefined}
        />
      </div>

      {element.isUnknown && defineTagOpen && (
        <CustomTagForm
          isOpen={defineTagOpen}
          onClose={() => setDefineTagOpen(false)}
          onSave={handleCreateCustomTag}
          title={`Define Custom Tag: ${element.tag}`}
          description="Create a custom tag definition for this unknown tag"
          initialValues={initialTagParams}
        />
      )}

      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {element.tag}
              </Badge>
              {element.tagInfo?.name || "Unknown tag"}
            </DialogTitle>
            <DialogDescription>
              {element.tagInfo?.description || `${element.length} byte TLV value`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Raw value
              </div>
              <div className="flex items-start gap-1">
                <code className="min-w-0 flex-1 select-all break-all rounded bg-muted p-2 font-mono text-xs">
                  {element.value || "<empty>"}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyText(element.value, `Value for ${element.tag} copied`)}
                >
                  <Copy className="size-3.5" /> Copy
                </Button>
              </div>
            </div>
            {hasAscii && (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  ASCII
                </div>
                <code className="block select-all break-all rounded bg-muted p-2 font-mono text-xs">
                  {asciiValue}
                </code>
              </div>
            )}
            {renderer?.({
              tag: element.tag,
              value: element.value,
              onChange: (value) => onEditElement?.(path, value.toUpperCase()),
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Value: {element.tag}</DialogTitle>
            <DialogDescription>
              Enter an even number of hexadecimal characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              className="font-mono"
              value={editValue}
              onChange={(event) =>
                setEditValue(
                  event.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase()
                )
              }
              placeholder="Hex value"
              autoFocus
            />
            <div>
              <div className="mb-1 text-[10px] text-muted-foreground">
                Tag + length + value
              </div>
              <div className="flex items-start gap-1">
                <code className="min-w-0 flex-1 select-all break-all rounded bg-muted p-2 font-mono text-xs">
                  {fullTlv(element.tag, editValue)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void copyText(
                      fullTlv(element.tag, editValue),
                      "Edited TLV preview copied"
                    )
                  }
                >
                  <Copy className="size-3.5" /> Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!/^[0-9A-F]*$/.test(editValue) || editValue.length % 2 !== 0) {
                  toast.error("Use only hex digits and an even number of characters.");
                  return;
                }
                onEditElement?.(path, editValue);
                setEditOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
