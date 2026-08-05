/**
 * CA Public Key validator UI.
 *
 * Paste a CAPK entry, get the recomputed SHA-1 checksum and a verdict. Also
 * accepts the TLV `.key` layout used by scheme key files, so a key can be
 * checked without unpacking it by hand.
 */

import { useMemo, useState, type JSX } from "react";
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
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  XCircle,
} from "lucide-react";
import { validateCapk } from "@/utils/emv/capk-validator";
import { parseTlv } from "@/utils/tlv";

/**
 * Tags used by the scheme CA key TLV files:
 * DFC316 RID, DFC317 modulus, DFC318 exponent, DFC31A checksum, 9F22 index.
 */
const KEY_FILE_TAGS = {
  rid: "DFC316",
  index: "9F22",
  modulus: "DFC317",
  exponent: "DFC318",
  checksum: "DFC31A",
} as const;

export function CapkValidatorPanel(): JSX.Element {
  const [rid, setRid] = useState("");
  const [index, setIndex] = useState("");
  const [modulus, setModulus] = useState("");
  const [exponent, setExponent] = useState("");
  const [checksum, setChecksum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [importHex, setImportHex] = useState("");

  const hasInput = Boolean(rid || index || modulus || exponent);

  const validation = useMemo(
    () =>
      hasInput
        ? validateCapk({
            rid,
            index,
            modulus,
            exponent,
            checksum: checksum || undefined,
            expiry: expiry || undefined,
          })
        : null,
    [rid, index, modulus, exponent, checksum, expiry, hasInput]
  );

  /** Pull the CAPK fields out of a pasted TLV key file. */
  const importFromTlv = () => {
    const result = parseTlv(importHex);
    if (result.elements.length === 0) {
      toast.error("No TLV elements found in that input");
      return;
    }

    const byTag = new Map(result.elements.map((e) => [e.tag, e.value]));
    const found = Object.entries(KEY_FILE_TAGS).filter(([, tag]) =>
      byTag.has(tag)
    );

    if (found.length === 0) {
      toast.error(
        "None of the expected key-file tags (DFC316, 9F22, DFC317, DFC318, DFC31A) are present"
      );
      return;
    }

    setRid(byTag.get(KEY_FILE_TAGS.rid) ?? "");
    setIndex(byTag.get(KEY_FILE_TAGS.index) ?? "");
    setModulus(byTag.get(KEY_FILE_TAGS.modulus) ?? "");
    setExponent(byTag.get(KEY_FILE_TAGS.exponent) ?? "");
    setChecksum(byTag.get(KEY_FILE_TAGS.checksum) ?? "");
    toast.success(`Imported ${found.length} field(s) from the key file`);
  };

  const errors = validation?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings =
    validation?.issues.filter((i) => i.severity === "warning") ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>CA Public Key Validator</CardTitle>
          <CardDescription>
            Recomputes the SHA-1 checksum over RID &#8214; index &#8214; modulus
            &#8214; exponent and checks the key structure. A stale checksum
            after a hand edit, or a modulus with an odd digit count, is the usual
            sign of a corrupted key — and a key the kernel rejects at
            initialisation, not at transaction time.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="capk-import">
              Import from a TLV key file (optional)
            </Label>
            <Textarea
              id="capk-import"
              value={importHex}
              onChange={(e) => setImportHex(e.target.value)}
              placeholder="DFC3160AA000000025..."
              className="font-mono min-h-20"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!importHex.trim()}
                onClick={importFromTlv}
              >
                Import fields
              </Button>
              <span className="text-xs text-muted-foreground">
                Reads DFC316 (RID), 9F22 (index), DFC317 (modulus), DFC318
                (exponent), DFC31A (checksum)
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="capk-rid">RID (5 bytes)</Label>
              <Input
                id="capk-rid"
                value={rid}
                onChange={(e) => setRid(e.target.value)}
                placeholder="A000000025"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capk-index">Key index (1 byte)</Label>
              <Input
                id="capk-index"
                value={index}
                onChange={(e) => setIndex(e.target.value)}
                placeholder="03"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capk-modulus">Modulus</Label>
            <Textarea
              id="capk-modulus"
              value={modulus}
              onChange={(e) => setModulus(e.target.value)}
              placeholder="B0C2C6E2..."
              className="font-mono min-h-24"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="capk-exponent">Exponent</Label>
              <Input
                id="capk-exponent"
                value={exponent}
                onChange={(e) => setExponent(e.target.value)}
                placeholder="03"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capk-expiry">Expiry (MMYY, optional)</Label>
              <Input
                id="capk-expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="1249"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capk-checksum">
              Stated checksum (optional — leave blank to just compute one)
            </Label>
            <Input
              id="capk-checksum"
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
              placeholder="20-byte SHA-1"
              className="font-mono"
            />
          </div>

          {hasInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRid("");
                setIndex("");
                setModulus("");
                setExponent("");
                setChecksum("");
                setExpiry("");
              }}
            >
              Clear all
            </Button>
          )}
        </CardContent>
      </Card>

      {validation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {errors.length > 0 ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : warnings.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              {errors.length > 0
                ? "Key is not valid"
                : warnings.length > 0
                ? "Key is structurally valid, with warnings"
                : "Key looks valid"}
              {validation.schemeName && (
                <Badge variant="secondary">{validation.schemeName}</Badge>
              )}
              {validation.modulusBits > 0 && (
                <Badge variant="outline">{validation.modulusBits}-bit</Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Computed SHA-1 checksum
                </span>
                <div className="flex items-center gap-2">
                  {validation.checksumMatches === true && (
                    <Badge variant="secondary" className="text-xs">
                      Matches stated
                    </Badge>
                  )}
                  {validation.checksumMatches === false && (
                    <Badge variant="destructive" className="text-xs">
                      Does not match
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(validation.computedChecksum)
                        .then(() => toast.success("Checksum copied"))
                        .catch(() => toast.error("Copy failed"))
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="break-all font-mono text-xs">
                {validation.computedChecksum}
              </div>
            </div>

            {validation.issues.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No structural problems found.
              </p>
            ) : (
              <div className="space-y-2">
                {validation.issues.map((issue, i) => (
                  <div
                    key={`${issue.field}-${i}`}
                    className="flex items-start gap-2 rounded-lg border p-3"
                  >
                    {issue.severity === "error" ? (
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className="mb-1 font-mono text-xs"
                      >
                        {issue.field}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {issue.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
