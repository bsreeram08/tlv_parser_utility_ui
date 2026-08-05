/**
 * Tag Decoder Builder — build a bitfield decoder for a tag through a form,
 * preview it live against a sample value, save it so it works everywhere, and
 * export it as code to promote into the codebase.
 *
 * A decoder is pure data: bytes, bit masks and labels. Nothing here is
 * evaluated, so a saved decoder cannot execute anything.
 */

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Copy,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { BitfieldTag } from "@/components/ui/tlv-tags/bitfield-tag";
import { db } from "@/utils/db/db";
import { getTagInfo } from "@/utils/tlv";
import type { BitfieldSpec, ByteDef } from "@/utils/tlv/bitfield-specs";
import {
  bitLabelForIndex,
  emitBitfieldSpecCode,
  emptyByte,
  emptySpec,
  maskForBitIndex,
  normaliseBitfieldSpec,
  validateBitfieldSpec,
  type StoredBitfieldSpec,
} from "@/utils/tlv/custom-bitfields";
import {
  isBuiltInBitfieldTag,
  unregisterCustomBitfieldSpec,
} from "@/utils/tlv/custom-bitfield-registry";
import { registerBitfieldDecoder } from "@/utils/tlv/load-custom-bitfields";

/** Editor for one byte: eight labelled bit slots. */
function ByteEditor({
  byteDef,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  byteDef: ByteDef;
  index: number;
  onChange: (next: ByteDef) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const labelForMask = (mask: number) =>
    byteDef.bits?.find((b) => b.mask === mask)?.label ?? "";
  const noteForMask = (mask: number) =>
    byteDef.bits?.find((b) => b.mask === mask)?.note ?? "";

  const setBit = (mask: number, label: string, note: string) => {
    const others = (byteDef.bits ?? []).filter((b) => b.mask !== mask);
    const next =
      label.trim() || note.trim()
        ? [...others, { mask, label, note: note || undefined }]
        : others;
    onChange({ ...byteDef, bits: next.sort((a, b) => b.mask - a.mask) });
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Input
          value={byteDef.name}
          onChange={(e) => onChange({ ...byteDef, name: e.target.value })}
          placeholder={`Byte ${index + 1} name`}
          className="h-8 text-sm"
          aria-label={`Byte ${index + 1} name`}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`Remove byte ${index + 1}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-1.5">
        {Array.from({ length: 8 }, (_, bitIndex) => {
          const mask = maskForBitIndex(bitIndex);
          return (
            <div key={mask} className="flex items-center gap-2">
              <code className="w-24 flex-shrink-0 text-[11px] text-muted-foreground">
                {bitLabelForIndex(bitIndex)}
              </code>
              <Input
                value={labelForMask(mask)}
                onChange={(e) =>
                  setBit(mask, e.target.value, noteForMask(mask))
                }
                placeholder="Leave blank if unused / RFU"
                className="h-7 text-xs"
                aria-label={`Byte ${index + 1} ${bitLabelForIndex(
                  bitIndex
                )} label`}
              />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Blank bits are treated as reserved and are not shown as flags.
      </p>
    </div>
  );
}

export function TagDecoderBuilder(): JSX.Element {
  const [spec, setSpec] = useState<BitfieldSpec>(emptySpec);
  const [sample, setSample] = useState("");
  const [saved, setSaved] = useState<StoredBitfieldSpec[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSaved(await db.getAllCustomBitfields());
    } catch {
      // An unavailable IndexedDB just means no saved decoders to list.
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const issues = useMemo(() => validateBitfieldSpec(spec), [spec]);
  const valid = issues.length === 0;
  const normalised = useMemo(
    () => (valid ? normaliseBitfieldSpec(spec) : null),
    [valid, spec]
  );

  const tagUpper = spec.tag.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  const knownTag = tagUpper ? getTagInfo(tagUpper) : undefined;
  const shadowsBuiltIn = tagUpper ? isBuiltInBitfieldTag(tagUpper) : false;

  const setBytes = (bytes: ByteDef[]) => setSpec((s) => ({ ...s, bytes }));

  const handleSave = async () => {
    if (!normalised) return;
    try {
      await db.saveCustomBitfield(normalised);
      registerBitfieldDecoder(normalised);
      await refresh();
      toast.success(
        `Decoder for ${normalised.tag} saved — it now applies in the TLV parser`
      );
    } catch (e) {
      toast.error(
        `Could not save: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const handleDelete = async (tag: string) => {
    try {
      await db.deleteCustomBitfield(tag);
      unregisterCustomBitfieldSpec(tag);
      await refresh();
      toast.success(
        `Deleted the decoder for ${tag}. Reload the page to drop it from the current session.`
      );
    } catch (e) {
      toast.error(
        `Could not delete: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tag Decoder Builder</CardTitle>
          <CardDescription>
            Build a field-level decoder for a bit-mapped tag. Saved decoders
            apply anywhere a built-in one does — the TLV parser, nested elements
            and the config viewer. A decoder is pure data, so nothing you enter
            is ever executed.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="builder-tag">Tag (hex)</Label>
              <Input
                id="builder-tag"
                value={spec.tag}
                onChange={(e) =>
                  setSpec((s) => ({
                    ...s,
                    tag: e.target.value
                      .replace(/[^0-9a-fA-F]/g, "")
                      .toUpperCase(),
                  }))
                }
                placeholder="9F6E"
                className="font-mono"
              />
              {knownTag && (
                <p className="text-xs text-muted-foreground">
                  Known tag: {knownTag.name}
                </p>
              )}
              {shadowsBuiltIn && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  A built-in decoder already exists for {tagUpper}. It takes
                  precedence, so yours will not be used until the built-in is
                  removed.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="builder-name">Name</Label>
              <Input
                id="builder-name"
                value={spec.name}
                onChange={(e) =>
                  setSpec((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Enhanced Contactless Reader Capabilities"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="builder-description">Description</Label>
              <Input
                id="builder-description"
                value={spec.description}
                onChange={(e) =>
                  setSpec((s) => ({ ...s, description: e.target.value }))
                }
                placeholder="What this tag means"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="builder-ref">Spec reference</Label>
              <Input
                id="builder-ref"
                value={spec.ref}
                onChange={(e) =>
                  setSpec((s) => ({ ...s, ref: e.target.value }))
                }
                placeholder="AMEX Expresspay C-4, Table 4-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="builder-note">
                Caveat (optional)
              </Label>
              <Input
                id="builder-note"
                value={spec.note ?? ""}
                onChange={(e) =>
                  setSpec((s) => ({ ...s, note: e.target.value }))
                }
                placeholder="e.g. kernel-dependent meaning"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Bytes{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({spec.bytes.length})
                </span>
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setBytes([...spec.bytes, emptyByte(spec.bytes.length)])
                }
              >
                <Plus className="h-3 w-3" /> Add byte
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {spec.bytes.map((byteDef, index) => (
                <ByteEditor
                  key={index}
                  byteDef={byteDef}
                  index={index}
                  canRemove={spec.bytes.length > 1}
                  onChange={(next) =>
                    setBytes(
                      spec.bytes.map((b, i) => (i === index ? next : b))
                    )
                  }
                  onRemove={() =>
                    setBytes(spec.bytes.filter((_, i) => i !== index))
                  }
                />
              ))}
            </div>
          </div>

          {issues.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {issues.length} thing{issues.length === 1 ? "" : "s"} to fix
              </div>
              {issues.map((issue, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  • {issue.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="gap-1"
              disabled={!valid}
              onClick={() => void handleSave()}
            >
              <Save className="h-4 w-4" /> Save decoder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSpec(emptySpec());
                setSample("");
              }}
            >
              Start over
            </Button>
            {valid && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Valid — {spec.bytes.length} byte
                {spec.bytes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {normalised && (
        <Tabs defaultValue="preview">
          <TabsList className="grid grid-cols-2 sm:w-72">
            <TabsTrigger value="preview">Live preview</TabsTrigger>
            <TabsTrigger value="code">Export code</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="builder-sample">
                Sample value ({normalised.bytes.length} bytes, hex)
              </Label>
              <Input
                id="builder-sample"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                placeholder={"0".repeat(normalised.bytes.length * 2)}
                className="font-mono"
              />
            </div>
            {/* The real renderer, so the preview is what you will actually see. */}
            <BitfieldTag
              spec={normalised}
              value={sample.replace(/[^0-9a-fA-F]/g, "").toUpperCase()}
              onChange={(next) => setSample(next)}
            />
          </TabsContent>

          <TabsContent value="code" className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Paste this into{" "}
              <code className="font-mono">src/utils/tlv/bitfield-specs.ts</code>{" "}
              to make the decoder permanent and reviewable, rather than living
              only in this browser.
            </p>
            <Textarea
              readOnly
              value={emitBitfieldSpecCode(normalised)}
              className="min-h-72 font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                navigator.clipboard
                  .writeText(emitBitfieldSpecCode(normalised))
                  .then(() => toast.success("Code copied"))
                  .catch(() => toast.error("Copy failed"))
              }
            >
              <Copy className="h-4 w-4" /> Copy code
            </Button>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Saved decoders{" "}
            <Badge variant="secondary">{saved.length}</Badge>
          </CardTitle>
          <CardDescription>
            Stored in this browser only. Export a decoder as code to share it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom decoders yet.
            </p>
          ) : (
            saved.map((entry) => (
              <div
                key={entry.tag}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
              >
                <Badge variant="secondary" className="font-mono text-xs">
                  {entry.tag}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {entry.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {entry.bytes.length} byte
                  {entry.bytes.length === 1 ? "" : "s"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSpec(entry);
                    setSample("");
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(emitBitfieldSpecCode(entry))
                      .then(() => toast.success("Code copied"))
                      .catch(() => toast.error("Copy failed"))
                  }
                >
                  <Code2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Delete decoder for ${entry.tag}`}
                  onClick={() => setConfirmDelete(entry.tag)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete the decoder for {confirmDelete}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The tag will fall back to the raw hex, ASCII, binary and decimal
              views. Export it as code first if you want to keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const tag = confirmDelete;
                setConfirmDelete(null);
                if (tag) void handleDelete(tag);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
