/**
 * Generic bitfield / enum tag renderer.
 *
 * Driven entirely by a `BitfieldSpec` (see `@/utils/tlv/bitfield-specs`), so a
 * new bit-mapped tag needs a spec entry, not a new component.
 */

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Copy, Edit3, Info, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  bytesToHex,
  isBitSet,
  parseHexToBytes,
  toggleBit,
} from "@/utils/byte-utils";
import type { BitfieldSpec } from "@/utils/tlv/bitfield-specs";

interface BitfieldTagProps {
  spec: BitfieldSpec;
  value: string;
  onChange: (newValue: string) => void;
}

export function BitfieldTag({ spec, value, onChange }: BitfieldTagProps) {
  const expectedBytes = spec.bytes.length;
  const [isEditing, setIsEditing] = useState(false);
  const [hexValue, setHexValue] = useState(value.toUpperCase());
  const [byteValues, setByteValues] = useState<number[]>(() =>
    parseHexToBytes(value, expectedBytes)
  );

  // Re-sync whenever the parsed value changes underneath us (e.g. after a save
  // round-trips through the parser, or the user loads a different payload).
  useEffect(() => {
    setHexValue(value.toUpperCase());
    setByteValues(parseHexToBytes(value, expectedBytes));
    setIsEditing(false);
  }, [value, expectedBytes]);

  const actualBytes = Math.floor(value.replace(/[^0-9A-Fa-f]/g, "").length / 2);
  const lengthMismatch = actualBytes !== expectedBytes;

  const setBytes = (bytes: number[]) => {
    setByteValues(bytes);
    setHexValue(bytesToHex(bytes));
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .substring(0, expectedBytes * 2)
      .toUpperCase();
    setHexValue(input);
    setByteValues(parseHexToBytes(input, expectedBytes));
  };

  const handleSave = () => {
    const next = bytesToHex(byteValues);
    onChange(next);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setHexValue(value.toUpperCase());
    setByteValues(parseHexToBytes(value, expectedBytes));
    setIsEditing(false);
  };

  const copy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {spec.name} ({spec.tag})
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm max-w-xs">
                    {spec.description}
                    <br />
                    <span className="text-muted-foreground">{spec.ref}</span>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                  {value.toUpperCase() || "<empty>"}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(value.toUpperCase())}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {spec.note && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>{spec.note}</span>
          </div>
        )}

        {lengthMismatch && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>
              Value is {actualBytes} byte{actualBytes === 1 ? "" : "s"};{" "}
              {spec.tag} is defined as {expectedBytes}. Decode below is
              padded/truncated to {expectedBytes}.
            </span>
          </div>
        )}

        {isEditing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`bitfield-hex-${spec.tag}`}
                className="text-sm font-medium"
              >
                Hex value:
              </Label>
              <Input
                id={`bitfield-hex-${spec.tag}`}
                value={hexValue}
                onChange={handleHexInput}
                className="w-32 h-8 font-mono text-center"
                maxLength={expectedBytes * 2}
                placeholder={"0".repeat(expectedBytes * 2)}
              />
            </div>

            {spec.presets && spec.presets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Presets:</span>
                {spec.presets.map((preset) => (
                  <TooltipProvider key={preset.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setBytes(
                              parseHexToBytes(preset.value, expectedBytes)
                            )
                          }
                        >
                          {preset.name}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          <span className="font-mono">{preset.value}</span> —{" "}
                          {preset.desc}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3">
          {spec.bytes.map((byteDef, byteIndex) => {
            const byteVal = byteValues[byteIndex] || 0;
            const hasFields =
              (byteDef.bits && byteDef.bits.length > 0) ||
              (byteDef.enums && byteDef.enums.length > 0);

            return (
              <div key={byteDef.name} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">{byteDef.name}</h4>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      0x
                      {byteVal.toString(16).padStart(2, "0").toUpperCase()}
                    </code>
                    <code className="text-xs text-muted-foreground">
                      {byteVal.toString(2).padStart(8, "0")}
                    </code>
                  </div>
                </div>

                {!hasFields && (
                  <p className="text-xs text-muted-foreground">
                    Reserved for future use.
                  </p>
                )}

                {byteDef.enums?.map((enumDef) => {
                  const masked = byteVal & enumDef.mask;
                  const current = enumDef.values[masked];
                  return (
                    <div key={enumDef.label} className="mb-2 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        {enumDef.label}
                      </div>
                      {isEditing ? (
                        <Select
                          value={String(masked)}
                          onValueChange={(v) => {
                            const next = [...byteValues];
                            next[byteIndex] =
                              (byteVal & ~enumDef.mask) |
                              (parseInt(v, 10) & enumDef.mask);
                            setBytes(next);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(enumDef.values).map(
                              ([raw, label]) => (
                                <SelectItem key={raw} value={raw}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={current ? "secondary" : "outline"}>
                          {current ??
                            `Unrecognised (0x${masked
                              .toString(16)
                              .padStart(2, "0")
                              .toUpperCase()})`}
                        </Badge>
                      )}
                    </div>
                  );
                })}

                {byteDef.bits && byteDef.bits.length > 0 && (
                  <div className="space-y-1">
                    {byteDef.bits.map((bit) => {
                      const active = isBitSet(byteVal, bit.mask);
                      const row = (
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={active}
                              aria-label={bit.label}
                              onChange={() => {
                                const next = [...byteValues];
                                next[byteIndex] = toggleBit(byteVal, bit.mask);
                                setBytes(next);
                              }}
                            />
                          ) : (
                            <div
                              className={`h-3 w-3 rounded-sm border ${
                                active
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground"
                              }`}
                            />
                          )}
                          <span
                            className={`text-xs ${
                              active ? "font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {bit.label}
                          </span>
                          {bit.note && (
                            <Info className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      );

                      return (
                        <div key={bit.mask}>
                          {bit.note ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>{row}</div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">{bit.note}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            row
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
