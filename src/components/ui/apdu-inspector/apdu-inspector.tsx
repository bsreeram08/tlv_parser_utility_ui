/**
 * APDU Inspector
 *
 * Decodes a command or response APDU and, when the payload is BER-TLV, hands
 * the data field straight to the TLV display.
 */

import { useId, useMemo, useState, type JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { CompactTlvDisplay } from "@/components/ui/tlv-viewer/compact-tlv-display";
import { parseTlv } from "@/utils/tlv";
import { decodeApdu, type ApduKind } from "@/utils/apdu/apdu-decoder";

const EXAMPLES: Record<ApduKind, { label: string; value: string }[]> = {
  command: [
    { label: "SELECT by AID", value: "00A4040007A000000003101000" },
    { label: "GET PROCESSING OPTIONS", value: "80A8000002830000" },
    { label: "GENERATE AC (ARQC + CDA)", value: "80AE900002ABCD" },
    { label: "READ RECORD (SFI 1, rec 1)", value: "00B2010C00" },
  ],
  response: [
    { label: "Success with TLV", value: "9F3303E0F8C89C01009000" },
    { label: "PIN tries remaining", value: "63C2" },
    { label: "File not found", value: "6A82" },
    { label: "More data available", value: "6115" },
  ],
};

export function ApduInspector(): JSX.Element {
  const inputId = useId();
  const [kind, setKind] = useState<ApduKind>("command");
  const [input, setInput] = useState("");

  const decoded = useMemo(
    () => (input.trim() ? decodeApdu(input, kind) : null),
    [input, kind]
  );

  // Data fields in EMV are usually BER-TLV; show a parse only if it holds up.
  const dataHex =
    decoded?.kind === "command" ? decoded.data : decoded?.data ?? "";
  const tlvResult = useMemo(() => {
    if (!dataHex) return null;
    const result = parseTlv(dataHex);
    const parsedBytes = result.elements.reduce(
      (sum, element) => sum + (element.rawHex?.length ?? 0) / 2,
      0
    );
    // Only offer the TLV view when it explains essentially the whole field.
    const looksLikeTlv =
      result.errors.length === 0 &&
      result.elements.length > 0 &&
      parsedBytes === dataHex.length / 2;
    return looksLikeTlv ? result : null;
  }, [dataHex]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>APDU Inspector</CardTitle>
          <CardDescription>
            Decode ISO/IEC 7816-4 command and response APDUs, including the EMV
            command set and status words. Direction must be selected — the same
            bytes frame differently each way.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as ApduKind)}>
            <TabsList className="grid w-full grid-cols-2 sm:w-80">
              <TabsTrigger value="command">Command (C-APDU)</TabsTrigger>
              <TabsTrigger value="response">Response (R-APDU)</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor={inputId}>APDU (hex)</Label>
            <Textarea
              id={inputId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                kind === "command"
                  ? "00A4040007A0000000031010"
                  : "9F3303E0F8C89000"
              }
              className="font-mono min-h-24"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Examples:</span>
            {EXAMPLES[kind].map((example) => (
              <Button
                key={example.label}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setInput(example.value)}
              >
                {example.label}
              </Button>
            ))}
            {input && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setInput("")}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {decoded && decoded.errors.length > 0 && (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-3">
          {decoded.errors.map((error) => (
            <div key={error} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {decoded?.kind === "command" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {decoded.name ?? "Unrecognised command"}
              <Badge variant="secondary" className="font-mono">
                {decoded.cla}
                {decoded.ins}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["CLA", decoded.cla],
                  ["INS", decoded.ins],
                  ["P1", decoded.p1],
                  ["P2", decoded.p2],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg border p-2 text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-mono text-sm">{value || "—"}</div>
                </div>
              ))}
            </div>

            {(decoded.claNotes.length > 0 ||
              decoded.parameterNotes.length > 0) && (
              <div className="space-y-1 rounded-lg border p-3">
                {[...decoded.claNotes, ...decoded.parameterNotes].map((note) => (
                  <div key={note} className="text-xs text-muted-foreground">
                    • {note}
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Lc (data length)
                </div>
                <div className="font-mono text-sm">
                  {decoded.lc === undefined ? "absent" : decoded.lc}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Le (expected response length)
                </div>
                <div className="font-mono text-sm">
                  {decoded.le === undefined
                    ? "absent"
                    : decoded.le === 0
                    ? "0 (up to 256 bytes)"
                    : decoded.le}
                </div>
              </div>
            </div>

            {decoded.data && (
              <div className="rounded-lg border p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Data field
                </div>
                <div className="break-all font-mono text-xs">
                  {decoded.data}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {decoded?.kind === "response" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {decoded.statusWord.severity === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : decoded.statusWord.severity === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <Badge variant="secondary" className="font-mono">
                {decoded.statusWord.sw}
              </Badge>
            </CardTitle>
            <CardDescription>{decoded.statusWord.meaning}</CardDescription>
          </CardHeader>
          {decoded.data && (
            <CardContent>
              <div className="rounded-lg border p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Response data ({decoded.data.length / 2} bytes)
                </div>
                <div className="break-all font-mono text-xs">
                  {decoded.data}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {tlvResult && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Data field parsed as BER-TLV
          </div>
          <CompactTlvDisplay result={tlvResult} />
        </div>
      )}
    </div>
  );
}
