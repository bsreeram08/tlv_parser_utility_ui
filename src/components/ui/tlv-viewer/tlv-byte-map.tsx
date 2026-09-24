/**
 * TLV Byte Map
 *
 * An offset-addressed hex dump of the raw payload, with every byte coloured by
 * its role (tag / length / value / unparsed). Makes framing bugs — a wrong
 * length field, a truncated value, trailing padding — visible at a glance.
 */

import { useMemo, useState, type JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import type { TlvElement, TlvParsingResult } from "@/types/tlv";

type ByteRole = "tag" | "length" | "value" | "unparsed";

type ByteInfo = {
  role: ByteRole;
  /** Colon-separated tag path this byte belongs to. */
  path: string;
  /** Nesting depth, 0 for top level. */
  depth: number;
};

const BYTES_PER_ROW = 16;

const ROLE_CLASSES: Record<ByteRole, string> = {
  tag: "bg-sky-500/25 text-sky-900 dark:text-sky-100",
  length: "bg-amber-500/25 text-amber-900 dark:text-amber-100",
  value: "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100",
  unparsed: "bg-destructive/20 text-destructive",
};

const ROLE_LABELS: Record<ByteRole, string> = {
  tag: "Tag",
  length: "Length",
  value: "Value",
  unparsed: "Unparsed",
};

/**
 * Map each byte of the payload to its role.
 *
 * Top-level `element.offset` is a position in the full hex string; nested
 * offsets are relative to the parent's value, so children are walked with a
 * base offset of their parent's value start.
 */
function buildByteMap(result: TlvParsingResult): ByteInfo[] {
  const totalBytes = Math.floor(result.rawHex.length / 2);
  const map: ByteInfo[] = new Array(totalBytes);

  const walk = (
    elements: TlvElement[],
    baseHexOffset: number,
    parentPath: string,
    depth: number
  ) => {
    for (const element of elements) {
      if (element.offset === undefined || !element.rawHex) continue;

      const startHex = baseHexOffset + element.offset;
      const path = parentPath
        ? `${parentPath}:${element.tag}`
        : element.tag;

      const tagBytes = element.tag.length / 2;
      const valueBytes = element.value.length / 2;
      const totalElementBytes = element.rawHex.length / 2;
      const lengthBytes = totalElementBytes - tagBytes - valueBytes;

      const startByte = Math.floor(startHex / 2);
      for (let i = 0; i < totalElementBytes; i++) {
        const index = startByte + i;
        if (index >= totalBytes) break;
        const role: ByteRole =
          i < tagBytes
            ? "tag"
            : i < tagBytes + lengthBytes
            ? "length"
            : "value";
        map[index] = { role, path, depth };
      }

      if (element.children && element.children.length > 0) {
        // Children's offsets are relative to this element's value.
        const valueStartHex = startHex + (tagBytes + lengthBytes) * 2;
        walk(element.children, valueStartHex, path, depth + 1);
      }
    }
  };

  walk(result.elements, 0, "", 0);

  for (let i = 0; i < totalBytes; i++) {
    if (!map[i]) map[i] = { role: "unparsed", path: "", depth: 0 };
  }

  return map;
}

interface TlvByteMapProps {
  result: TlvParsingResult | null;
}

export function TlvByteMap({ result }: TlvByteMapProps): JSX.Element {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const byteMap = useMemo(
    () => (result ? buildByteMap(result) : []),
    [result]
  );

  if (!result || result.rawHex.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Parse some TLV data to see its byte layout
      </div>
    );
  }

  const bytes = result.rawHex.match(/.{2}/g) || [];
  const rowCount = Math.ceil(bytes.length / BYTES_PER_ROW);
  const unparsedCount = byteMap.filter((b) => b.role === "unparsed").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
          Byte Map
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigator.clipboard
                .writeText(result.rawHex)
                .then(() => toast.success("Raw hex copied"))
                .catch(() => toast.error("Copy failed"))
            }
          >
            <Copy className="mr-1 h-3 w-3" /> Copy raw hex
          </Button>
        </CardTitle>
        <CardDescription>
          {bytes.length} byte{bytes.length === 1 ? "" : "s"}
          {unparsedCount > 0 && (
            <span className="text-destructive">
              {" "}
              · {unparsedCount} unparsed
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(Object.keys(ROLE_LABELS) as ByteRole[]).map((role) => (
            <div key={role} className="flex items-center gap-1.5">
              <span
                className={cn("inline-block h-3 w-3 rounded-sm", ROLE_CLASSES[role])}
              />
              <span className="text-muted-foreground">{ROLE_LABELS[role]}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max font-mono text-xs">
            {Array.from({ length: rowCount }, (_, row) => {
              const start = row * BYTES_PER_ROW;
              const rowBytes = bytes.slice(start, start + BYTES_PER_ROW);
              return (
                <div key={row} className="flex items-center gap-3 py-0.5">
                  <span className="w-14 select-none text-right text-muted-foreground">
                    {start.toString(16).padStart(6, "0").toUpperCase()}
                  </span>
                  <div className="flex gap-1">
                    {rowBytes.map((byte, col) => {
                      const index = start + col;
                      const info = byteMap[index];
                      const isSelected =
                        selectedPath !== null &&
                        info.path !== "" &&
                        (info.path === selectedPath ||
                          info.path.startsWith(`${selectedPath}:`));
                      return (
                        <button
                          key={col}
                          type="button"
                          title={`${index
                            .toString(16)
                            .padStart(6, "0")
                            .toUpperCase()} · ${ROLE_LABELS[info.role]}${
                            info.path ? ` · ${info.path}` : ""
                          }`}
                          onClick={() =>
                            setSelectedPath((prev) =>
                              prev === info.path || !info.path ? null : info.path
                            )
                          }
                          className={cn(
                            "w-6 rounded-sm py-0.5 text-center transition-shadow duration-100 ease-(--ease-out)",
                            ROLE_CLASSES[info.role],
                            isSelected && "ring-1 ring-primary ring-offset-1"
                          )}
                        >
                          {byte}
                        </button>
                      );
                    })}
                  </div>
                  <span className="select-none pl-2 text-muted-foreground">
                    {rowBytes
                      .map((byte) => {
                        const code = parseInt(byte, 16);
                        return code >= 0x20 && code <= 0x7e
                          ? String.fromCharCode(code)
                          : ".";
                      })
                      .join("")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {selectedPath && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Selected:</span>
            <Badge variant="secondary" className="font-mono">
              {selectedPath}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedPath(null)}
            >
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
