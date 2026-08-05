/**
 * Renderers for TLV values that carry a structured payment payload:
 * Track 2 (57 / 9F6B), CVM List (8E) and Data Object Lists (9F38, 8C, 8D, …).
 *
 * These are read-only decoders — use the raw hex editor to change the value.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Check, Eye, EyeOff, X } from "lucide-react";
import {
  SERVICE_CODE_DIGITS,
  SERVICE_CODE_LABELS,
  decodeCvmList,
  decodeDol,
  decodeTrack2,
  maskPan,
} from "@/utils/tlv/payment-decoders";

function DecodeErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2">
      {errors.map((error) => (
        <div key={error} className="flex items-start gap-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-destructive" />
          <span>{error}</span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Track 2 */

export function Track2Tag({ tag, value }: { tag: string; value: string }) {
  // Default to masked: this is cardholder data.
  const [revealed, setRevealed] = useState(false);
  const track = decodeTrack2(value);

  const expiryLabel =
    track.expiry.length === 4
      ? `20${track.expiry.substring(0, 2)}-${track.expiry.substring(2, 4)}`
      : track.expiry || "—";

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Track 2 Data ({tag})
        </CardTitle>
        <CardDescription>
          Decoded per ISO/IEC 7813. Cardholder data is masked by default.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <DecodeErrors errors={track.errors} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                PAN
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3 w-3" /> Reveal
                  </>
                )}
              </Button>
            </div>
            <div className="font-mono text-sm break-all">
              {revealed ? track.pan || "—" : maskPan(track.pan) || "—"}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {track.panValid ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-muted-foreground">
                    Luhn check passes ({track.pan.length} digits)
                  </span>
                </>
              ) : (
                <>
                  <X className="h-3 w-3 text-destructive" />
                  <span className="text-muted-foreground">
                    Luhn check fails
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Expiry (YYMM)
            </div>
            <div className="font-mono text-sm">{expiryLabel}</div>
            <div className="mt-3 mb-1 text-xs font-medium text-muted-foreground">
              Discretionary data
            </div>
            <div className="font-mono text-xs break-all">
              {track.discretionaryData
                ? revealed
                  ? track.discretionaryData
                  : "*".repeat(track.discretionaryData.length)
                : "—"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Service code
            </span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {track.serviceCode || "—"}
            </code>
          </div>
          <div className="space-y-1.5">
            {SERVICE_CODE_LABELS.map((label, i) => {
              const digit = track.serviceCode[i];
              const meaning = digit ? SERVICE_CODE_DIGITS[i][digit] : undefined;
              return (
                <div key={label} className="text-xs">
                  <span className="text-muted-foreground">{label}: </span>
                  {digit ? (
                    <span>
                      <span className="font-mono">{digit}</span> —{" "}
                      {meaning ?? "Reserved / not defined by ISO 7813"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- CVM List */

export function CvmListTag({ value }: { value: string }) {
  const cvm = decodeCvmList(value);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">CVM List (8E)</CardTitle>
        <CardDescription>
          Cardholder verification methods in the card&rsquo;s priority order —
          the first rule whose condition is met is attempted first.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <DecodeErrors errors={cvm.errors} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Amount X
            </div>
            <div className="font-mono text-sm">{cvm.amountX}</div>
            <div className="text-xs text-muted-foreground">
              minor units of the application currency
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Amount Y
            </div>
            <div className="font-mono text-sm">{cvm.amountY}</div>
            <div className="text-xs text-muted-foreground">
              minor units of the application currency
            </div>
          </div>
        </div>

        {cvm.rules.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-16">Rule</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="w-24">On failure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cvm.rules.map((rule, index) => (
                  <TableRow key={`${rule.raw}-${index}`}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.raw}
                    </TableCell>
                    <TableCell className="text-xs">{rule.method}</TableCell>
                    <TableCell className="text-xs">{rule.condition}</TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.continueOnFailure ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {rule.continueOnFailure ? "Try next" : "Stop"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------- DOL */

const DOL_NAMES: Record<string, string> = {
  "9F38": "PDOL — Processing Options Data Object List",
  "8C": "CDOL1 — Card Risk Management Data Object List 1",
  "8D": "CDOL2 — Card Risk Management Data Object List 2",
  "97": "TDOL — Transaction Certificate Data Object List",
  "9F4F": "Log Format",
};

export function DolTag({ tag, value }: { tag: string; value: string }) {
  const dol = decodeDol(value);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {DOL_NAMES[tag] ?? `Data Object List (${tag})`}
        </CardTitle>
        <CardDescription>
          Tag-and-length pairs the terminal must supply, in order.{" "}
          {dol.totalBytes} byte{dol.totalBytes === 1 ? "" : "s"} total.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <DecodeErrors errors={dol.errors} />

        {dol.entries.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-20">Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20">Length</TableHead>
                  <TableHead className="w-20">Offset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dol.entries.map((entry, index) => (
                  <TableRow key={`${entry.tag}-${index}`}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {entry.tag}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.name === "Unknown tag" ? (
                        <span className="text-muted-foreground">
                          {entry.name}
                        </span>
                      ) : (
                        entry.name
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.length}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.dataOffset}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
