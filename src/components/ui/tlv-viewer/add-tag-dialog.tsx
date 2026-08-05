/**
 * Add Tag dialog — appends a new primitive TLV element to the payload, either
 * at the top level or inside a constructed tag.
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getTagInfo } from "@/utils/tlv";
import { encodeLength } from "@/utils/tlv/tlv-edit";
import type { TlvElement, TlvParsingResult } from "@/types/tlv";

const TOP_LEVEL = "__top__";

/** Collect the paths of every constructed element, for the parent selector. */
function collectConstructedPaths(
  elements: TlvElement[],
  parentPath = ""
): string[] {
  return elements.flatMap((element) => {
    if (!element.children) return [];
    const path = parentPath ? `${parentPath}:${element.tag}` : element.tag;
    return [path, ...collectConstructedPaths(element.children, path)];
  });
}

interface AddTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: TlvParsingResult | null;
  onAdd: (parentPath: string | undefined, tag: string, valueHex: string) => void;
}

export function AddTagDialog({
  isOpen,
  onClose,
  result,
  onAdd,
}: AddTagDialogProps) {
  const [tag, setTag] = useState("");
  const [valueHex, setValueHex] = useState("");
  const [parentPath, setParentPath] = useState<string>(TOP_LEVEL);

  const constructedPaths = useMemo(
    () => (result ? collectConstructedPaths(result.elements) : []),
    [result]
  );

  const tagInfo = getTagInfo(tag);
  const tagValid = tag.length > 0 && tag.length % 2 === 0;
  const valueValid = valueHex.length % 2 === 0;
  const canSubmit = tagValid && valueValid;

  const preview = canSubmit
    ? `${tag}${encodeLength(valueHex.length / 2)}${valueHex}`
    : "";

  const reset = () => {
    setTag("");
    setValueHex("");
    setParentPath(TOP_LEVEL);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tag</DialogTitle>
          <DialogDescription>
            Appends a new primitive element. Enclosing length fields are
            recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-tag-id">Tag (hex)</Label>
            <Input
              id="add-tag-id"
              value={tag}
              onChange={(e) =>
                setTag(
                  e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase()
                )
              }
              placeholder="9F66"
              className="font-mono"
              autoFocus
            />
            {tag.length > 0 && !tagValid && (
              <p className="text-xs text-destructive">
                Tag must be an even number of hex digits.
              </p>
            )}
            {tagInfo && (
              <p className="text-xs text-muted-foreground">{tagInfo.name}</p>
            )}
            {tagValid && !tagInfo && (
              <p className="text-xs text-muted-foreground">
                Not in the tag registry — it will show as an unknown tag.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-tag-value">Value (hex)</Label>
            <Input
              id="add-tag-value"
              value={valueHex}
              onChange={(e) =>
                setValueHex(
                  e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase()
                )
              }
              placeholder="24804000"
              className="font-mono"
            />
            {!valueValid && (
              <p className="text-xs text-destructive">
                Value must be an even number of hex digits.
              </p>
            )}
          </div>

          {constructedPaths.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="add-tag-parent">Insert into</Label>
              <Select value={parentPath} onValueChange={setParentPath}>
                <SelectTrigger id="add-tag-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP_LEVEL}>Top level</SelectItem>
                  {constructedPaths.map((path) => (
                    <SelectItem key={path} value={path}>
                      {path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {preview && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Preview (tag + length + value)
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-xs break-all whitespace-normal"
              >
                {preview}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onAdd(
                parentPath === TOP_LEVEL ? undefined : parentPath,
                tag,
                valueHex
              );
              reset();
              onClose();
            }}
          >
            Add Tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
