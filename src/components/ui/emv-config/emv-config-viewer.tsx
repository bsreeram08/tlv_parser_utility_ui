/**
 * EMV Config Viewer
 *
 * Load a terminal EMV configuration — by URL, by paste, or by file — and
 * visualise it: metadata, terminal tags, each kernel's AIDs and per-transaction
 * limits, CA public keys with recomputed checksums, and a lint pass.
 *
 * A `?config=<url>` query parameter loads a config on page open, so a link to a
 * config file can be shared and opened directly.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type JSX } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  Link2,
  LoaderCircle,
  Upload,
  XCircle,
} from "lucide-react";
import {
  KERNEL_NAMES,
  TRANSACTION_TYPES,
  collectConfigTags,
  lintEmvConfig,
  parseEmvConfig,
  type ConfigFinding,
  type ParsedConfig,
} from "@/utils/emv/config-parser";
import { validateCapk } from "@/utils/emv/capk-validator";
import {
  isKernelDependentTag,
  resolveKernelTagName,
} from "@/utils/emv/kernel2-tags";
import { getTagInfo } from "@/utils/tlv";
import {
  getTagRenderer,
  hasCustomRenderer,
} from "@/components/ui/tlv-tags/tag-registry";

const SEVERITY_WEIGHT = { error: 0, warning: 1, info: 2 } as const;

function FindingRow({ finding }: { finding: ConfigFinding }) {
  const Icon =
    finding.severity === "error"
      ? XCircle
      : finding.severity === "warning"
      ? AlertTriangle
      : Info;
  const colour =
    finding.severity === "error"
      ? "text-destructive"
      : finding.severity === "warning"
      ? "text-amber-500"
      : "text-muted-foreground";

  return (
    <div className="flex items-start gap-2 rounded-lg border p-3">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${colour}`} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{finding.title}</span>
          <Badge variant="outline" className="font-mono text-xs">
            {finding.location}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{finding.detail}</p>
      </div>
    </div>
  );
}

/** One tag row, with the dedicated decoder inline when one exists. */
function ConfigTagRow({
  tag,
  value,
  location,
  kernelId,
}: {
  tag: string;
  value: string;
  location: string;
  /** Resolves tags whose meaning depends on the kernel (9F66, 9F6D, 9F6E…). */
  kernelId?: number;
}) {
  const [open, setOpen] = useState(false);
  const info = getTagInfo(tag);
  const decodable = hasCustomRenderer(tag);
  const renderer = decodable ? getTagRenderer(tag) : undefined;

  // 9F66 is the Visa TTQ in kernel 3 but PUNATC(Track2) in kernel 2; 9F6E is
  // AMEX reader capabilities in kernel 4 but card-sourced Third Party Data in
  // kernel 2. Naming these from the tag alone is simply wrong.
  const resolved = resolveKernelTagName(tag, kernelId, info?.name);
  const displayName = resolved.name;
  const displayDescription = resolved.description ?? info?.description;

  return (
    <div className="rounded border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-muted">
            <div className="flex min-w-0 items-center gap-2">
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
                  open ? "" : "-rotate-90"
                }`}
              />
              <Badge variant="secondary" className="font-mono text-xs">
                {tag}
              </Badge>
              <span className="truncate text-sm">{displayName}</span>
              {decodable && (
                <Badge variant="outline" className="text-xs">
                  decoder
                </Badge>
              )}
              {isKernelDependentTag(tag) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs">
                        kernel-specific
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        This tag means different things in different kernels.
                        Shown as its {kernelId !== undefined ? `kernel ${kernelId}` : "default"} meaning.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden font-mono sm:inline">{location}</span>
              <code className="max-w-40 truncate font-mono">{value}</code>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-2">
          {renderer ? (
            // Read-only here: a config is a signed artifact, so edits belong in
            // the repo file and a re-sign, not in this viewer.
            renderer({
              tag,
              value,
              onChange: () =>
                toast.info(
                  "This view is read-only — edit the config file and have it re-signed."
                ),
            })
          ) : (
            <div className="space-y-1 p-1">
              <div className="break-all font-mono text-xs">{value}</div>
              {displayDescription && (
                <p className="text-xs text-muted-foreground">
                  {displayDescription}
                </p>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function EmvConfigViewer(): JSX.Element {
  const urlInputId = useId();
  const pasteInputId = useId();
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [parsed, setParsed] = useState<ParsedConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire for every child element, so a plain boolean
  // flickers as the pointer moves inside the zone. Count instead.
  const dragDepth = useRef(0);
  // onDrop is defined before loadFromUrl; a ref avoids reordering the file.
  const loadFromUrlRef = useRef<((target: string) => Promise<void>) | null>(null);

  const ingest = useCallback((text: string, label: string) => {
    try {
      const result = parseEmvConfig(text);
      setParsed(result);
      setLoadError(null);
      setSourceLabel(label);
      toast.success(`Loaded config from ${label}`);
    } catch (e) {
      setParsed(null);
      setLoadError(e instanceof Error ? e.message : String(e));
      toast.error("Could not parse that config");
    }
  }, []);

  const readFile = useCallback(
    async (file: File) => {
      try {
        ingest(await file.text(), file.name);
      } catch (e) {
        toast.error(
          `Could not read ${file.name}: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    },
    [ingest]
  );

  /**
   * Drag and drop. The browser navigates away on an unhandled drop, so
   * dragover must be cancelled for the drop to reach us at all.
   */
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        void readFile(file);
        return;
      }
      // Dragging a selection or a link gives text rather than a file.
      const text = e.dataTransfer.getData("text");
      if (text?.trim()) {
        const trimmed = text.trim();
        if (/^https?:\/\//i.test(trimmed)) {
          setUrl(trimmed);
          void loadFromUrlRef.current?.(trimmed);
        } else {
          ingest(trimmed, "dropped text");
        }
        return;
      }
      toast.error("That drop contained no file or text");
    },
    [ingest, readFile]
  );

  const loadFromUrl = useCallback(
    async (target: string) => {
      const trimmed = target.trim();
      if (!trimmed) return;

      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(trimmed);
        if (!response.ok) {
          throw new Error(
            `The server responded ${response.status} ${response.statusText}.`
          );
        }
        ingest(await response.text(), trimmed);
      } catch (e) {
        setParsed(null);
        // A browser fetch to a private git host will usually fail on CORS or
        // auth, and the error surfaced to JS is deliberately vague. Say so
        // rather than letting it look like a bug in the tool.
        setLoadError(
          `${
            e instanceof Error ? e.message : String(e)
          }\n\nIf this is a private repository, the browser cannot fetch it: the request needs credentials the page does not have, and the host is unlikely to send permissive CORS headers. Download the file and use "Paste" or "Upload file" instead.`
        );
        toast.error("Could not fetch that URL");
      } finally {
        setLoading(false);
      }
    },
    [ingest]
  );

  useEffect(() => {
    loadFromUrlRef.current = loadFromUrl;
  }, [loadFromUrl]);

  // Deep link: ?config=<url> loads on open, so a link can be shared directly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("config");
    if (target) {
      setUrl(target);
      void loadFromUrl(target);
    }
  }, [loadFromUrl]);

  const findings = useMemo(
    () => (parsed ? lintEmvConfig(parsed) : []),
    [parsed]
  );
  const sortedFindings = useMemo(
    () =>
      [...findings].sort(
        (a, b) => SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]
      ),
    [findings]
  );
  const tags = useMemo(
    () => (parsed ? collectConfigTags(parsed.config) : []),
    [parsed]
  );

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const config = parsed?.config;

  return (
    // The whole panel is the drop target, so a file can be dropped anywhere on
    // it rather than only on a small strip.
    <div
      className="space-y-2"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Card className={dragging ? "border-primary ring-2 ring-primary/40" : ""}>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={urlInputId}>Config URL</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id={urlInputId}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadFromUrl(url);
                }}
                placeholder="https://…/ttp/united-kingdom/signed/prod.json"
                className="min-w-64 flex-1 font-mono text-sm"
              />
              <Button
                onClick={() => void loadFromUrl(url)}
                disabled={!url.trim() || loading}
                className="gap-1"
                aria-busy={loading}
              >
                <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
                  <Link2
                    className="emv-load-icon absolute inset-0 h-4 w-4"
                    data-visible={!loading}
                  />
                  <LoaderCircle
                    className="emv-load-icon absolute inset-0 h-4 w-4"
                    data-visible={loading}
                    data-spinning={loading}
                  />
                </span>
                <span>{loading ? "Loading…" : "Load"}</span>
              </Button>
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,application/json,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must be a raw file URL that allows cross-origin reads. A private
              git host will not — download the file and drop, paste or upload it.
            </p>
          </div>

          <div
            className={`flex flex-col items-center justify-center gap-1 rounded-md border border-dashed p-3 text-center transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
          >
            <Upload
              className={`emv-drop-icon h-5 w-5 ${
                dragging ? "text-primary" : "text-muted-foreground"
              }`}
              data-dragging={dragging}
            />
            <div className="grid" aria-live="polite">
              <p
                className="emv-drop-label text-sm font-medium"
                data-visible={!dragging}
                aria-hidden={dragging}
              >
                Drop a config file here
              </p>
              <p
                className="emv-drop-label text-sm font-medium"
                data-visible={dragging}
                aria-hidden={!dragging}
              >
                Drop to load
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              A .json or signed config file, or dropped text. You can also drop
              anywhere on this panel.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={pasteInputId}>Or paste the config</Label>
            <Textarea
              id={pasteInputId}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder='{"metadata":{…},"kernel":[…]}  — or a signed file starting with its hash line'
              className="min-h-20 font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pasted.trim()}
                onClick={() => ingest(pasted, "pasted text")}
              >
                Parse pasted config
              </Button>
              {parsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsed(null);
                    setPasted("");
                    setUrl("");
                    setSourceLabel(null);
                    setLoadError(null);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {loadError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="whitespace-pre-line text-xs">{loadError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {config && (
        <div className="emv-config-result-motion space-y-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {config.metadata?.label ?? "Config"}
                {config.metadata?.version && (
                  <Badge variant="secondary">v{config.metadata.version}</Badge>
                )}
                {parsed?.signatureLine && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          signed
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs break-all font-mono text-xs">
                          {parsed.signatureLine}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardTitle>
              <CardDescription>
                {sourceLabel && <>Loaded from {sourceLabel}. </>}
                {config.metadata?.client && (
                  <>Client {config.metadata.client}. </>
                )}
                {config.metadata?.last_modified && (
                  <>Last modified {config.metadata.last_modified}.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  {(config.kernel ?? []).length} kernels
                </Badge>
                <Badge variant="outline">
                  {(config.publicKey ?? []).length} CA keys
                </Badge>
                <Badge variant="outline">{tags.length} tags</Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">{errorCount} errors</Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="secondary">{warningCount} warnings</Badge>
                )}
                {errorCount === 0 && warningCount === 0 && (
                  <Badge variant="secondary">checks clean</Badge>
                )}
                {Object.entries(config.metadata?.properties ?? {}).map(
                  ([key, value]) => (
                    <Badge key={key} variant="outline" className="font-mono">
                      {key}={String(value)}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="checks">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="checks">
                Checks
                {findings.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {findings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="kernels">Kernels</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
              <TabsTrigger value="keys">CA Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="checks" className="mt-2 space-y-2">
              {sortedFindings.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border p-4 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  No issues found in the checks this tool performs. That is not
                  a substitute for kernel certification.
                </div>
              ) : (
                sortedFindings.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} />
                ))
              )}
            </TabsContent>

            <TabsContent value="kernels" className="mt-2 space-y-2">
              {(config.kernel ?? []).map((kernel, index) => (
                <Card key={`${kernel.kernelId}-${index}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      Kernel {kernel.kernelId ?? "?"}
                      <Badge variant="secondary">
                        {kernel.kernelId !== undefined
                          ? KERNEL_NAMES[kernel.kernelId] ?? "Unknown scheme"
                          : "Unknown scheme"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(kernel.config ?? []).length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          Reader config tags
                        </div>
                        {(kernel.config ?? []).map((tag) => (
                          <ConfigTagRow
                            key={tag.tag}
                            tag={tag.tag}
                            value={tag.value}
                            location={`kernel ${kernel.kernelId}`}
                            kernelId={kernel.kernelId}
                          />
                        ))}
                      </div>
                    )}

                    {(kernel.application ?? []).map((application, ai) => (
                      <div key={ai} className="space-y-2 rounded-lg border p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(application.aid ?? []).map((aid) => (
                            <Badge
                              key={aid}
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {aid}
                            </Badge>
                          ))}
                        </div>

                        {(application.transaction ?? []).length > 0 && (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Transaction</TableHead>
                                  <TableHead>CVM limit</TableHead>
                                  <TableHead>Floor limit</TableHead>
                                  <TableHead>Txn limit</TableHead>
                                  <TableHead>Tags</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(application.transaction ?? []).map(
                                  (transaction, ti) => (
                                    <TableRow key={ti}>
                                      <TableCell className="text-xs">
                                        <span className="font-mono">
                                          {transaction.transactionType ?? "?"}
                                        </span>{" "}
                                        {TRANSACTION_TYPES[
                                          transaction.transactionType ?? ""
                                        ] ?? ""}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {transaction.readerCVMRequiredLimit ??
                                          "—"}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {transaction.terminalFloorLimit ?? "—"}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {transaction.readerContactlessTransactionLimit ??
                                          "—"}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {(transaction.config ?? [])
                                          .map((t) => `${t.tag}=${t.value}`)
                                          .join(", ") || "—"}
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="tags" className="mt-2 space-y-1">
              {tags.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No tags found in this config.
                </p>
              ) : (
                tags.map((entry, index) => (
                  <ConfigTagRow
                    key={`${entry.location}-${entry.tag}-${index}`}
                    tag={entry.tag}
                    value={entry.value}
                    location={entry.location}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="keys" className="mt-2 space-y-2">
              {(config.publicKey ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  This config carries no CA public keys.
                </p>
              ) : (
                (config.publicKey ?? []).map((key, index) => {
                  const validation = validateCapk({
                    rid: key.rId ?? "",
                    index: key.index ?? "",
                    modulus: key.modulus ?? "",
                    exponent: key.exponent ?? "",
                    checksum: key.checksum,
                    expiry: key.expiryDate,
                  });
                  const bad = validation.issues.some(
                    (i) => i.severity === "error"
                  );
                  return (
                    <div
                      key={`${key.rId}-${key.index}-${index}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {bad ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        <Badge variant="secondary" className="font-mono text-xs">
                          {key.rId}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          index {key.index}
                        </Badge>
                        {validation.schemeName && (
                          <span className="text-sm">
                            {validation.schemeName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {validation.modulusBits}-bit
                        </Badge>
                        {key.expiryDate && (
                          <Badge variant="outline" className="font-mono text-xs">
                            exp {key.expiryDate}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            validation.checksumMatches === false
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {validation.checksumMatches === true
                            ? "checksum OK"
                            : validation.checksumMatches === false
                            ? "checksum mismatch"
                            : "no checksum stated"}
                        </Badge>
                      </div>
                      {validation.issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {validation.issues.map((issue, i) => (
                            <p
                              key={i}
                              className="text-xs text-muted-foreground"
                            >
                              • {issue.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              const report = [
                `EMV config report — ${config.metadata?.label ?? "config"} v${
                  config.metadata?.version ?? "?"
                }`,
                `Source: ${sourceLabel ?? "unknown"}`,
                `Errors: ${errorCount}, warnings: ${warningCount}`,
                "",
                ...sortedFindings.map(
                  (f) =>
                    `[${f.severity.toUpperCase()}] ${f.location} — ${f.title}\n    ${f.detail}`
                ),
              ].join("\n");
              navigator.clipboard
                .writeText(report)
                .then(() => toast.success("Report copied to clipboard"))
                .catch(() => toast.error("Copy failed"));
            }}
          >
            <Download className="h-4 w-4" />
            Copy findings report
          </Button>
        </div>
      )}
    </div>
  );
}
