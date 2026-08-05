/**
 * ISO 8583 Display Component
 *
 * A component for displaying parsed ISO 8583 message data in a structured, readable format.
 */

import { useEffect, useId, useMemo, useState, type JSX } from "react";
import { type Iso8583ParseResult, type IsoField } from "@/types/iso8583";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Copy, Search, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getMtiClassDescription,
  getMtiFunctionDescription,
  getMtiOriginDescription,
} from "@/utils/iso8583/mti-descriptions";

interface IsoDisplayProps {
  result: Iso8583ParseResult | null;
}

export function IsoDisplay({ result }: IsoDisplayProps): JSX.Element {
  const [fieldSearch, setFieldSearch] = useState("");
  const fieldSearchId = useId();

  const sortedFields = useMemo(
    () =>
      result ? Object.values(result.fields).sort((a, b) => a.id - b.id) : [],
    [result]
  );

  const filteredFields = useMemo(() => {
    const normalizedSearch = fieldSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return sortedFields;
    }

    return sortedFields.filter((field) => {
      const searchableParts = [
        String(field.id),
        field.definition?.name ?? "",
        field.definition?.description ?? "",
        field.value,
      ];

      return searchableParts.some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [fieldSearch, sortedFields]);

  useEffect(() => {
    setFieldSearch("");
  }, [result]);

  if (!result) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Enter ISO 8583 message and click Parse to see results here
      </div>
    );
  }

  // Get the count of fields in the message
  const fieldCount = Object.keys(result.fields).length;

  return (
    <div className="grid w-full min-w-0 gap-2">
      {result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Parsing Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {result.errors.map((error, index) => (
                <li key={index}>
                  {error.message}
                  {error.fieldId !== undefined && ` (Field ${error.fieldId})`}
                  {error.position !== undefined &&
                    ` (at position ${error.position})`}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-sm">
              <span>Message Type Indicator: {result.mti.raw}</span>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                ISO 8583:{result.mti.version}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="text-xs">
              <TableBody>
                <TableRow>
                  <TableCell className="w-20 font-medium">Version</TableCell>
                  <TableCell>{result.mti.version}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Class</TableCell>
                  <TableCell>
                    {result.mti.class} – {getMtiClassDescription(result.mti.class)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Function</TableCell>
                  <TableCell>
                    {result.mti.function} – {getMtiFunctionDescription(result.mti.function)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Origin</TableCell>
                  <TableCell>
                    {result.mti.origin} – {getMtiOriginDescription(result.mti.origin)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Bitmap</span>
              <Badge variant="secondary" className="text-[10px]">
                {fieldCount} fields
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                <div className="min-w-0">
                  <h4 className="mb-1 text-xs font-medium">Primary</h4>
                  <div className="break-all rounded bg-muted p-1.5 font-mono text-xs">
                    {result.bitmap.primary}
                  </div>
                </div>
                {result.bitmap.secondary && (
                  <div className="min-w-0">
                    <h4 className="mb-1 text-xs font-medium">Secondary</h4>
                    <div className="break-all rounded bg-muted p-1.5 font-mono text-xs">
                      {result.bitmap.secondary}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium">Present fields</h4>
                <div className="flex flex-wrap gap-1">
                  {result.bitmap.presentFields.map((fieldId) => (
                    <Badge
                      key={fieldId}
                      variant="outline"
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {fieldId}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 self-start">
        <CardHeader className="pb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CardTitle className="mr-auto text-sm">Data Elements</CardTitle>
            <Badge
              variant="secondary"
              className="text-[10px]"
              aria-live={fieldSearch ? "polite" : undefined}
            >
              {filteredFields.length}/{fieldCount}
            </Badge>
            {fieldCount > 0 && (
              <>
                <label htmlFor={fieldSearchId} className="sr-only">
                  Search data elements
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={fieldSearchId}
                    value={fieldSearch}
                    onChange={(event) => setFieldSearch(event.target.value)}
                    placeholder="Search field, name, or value"
                    className="h-7 w-48 pl-7 text-xs xl:w-60"
                  />
                </div>
                {fieldSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setFieldSearch("")}
                    aria-label="Clear data element search"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => void copyText(result.rawMessage, "ISO 8583 message copied")}
                >
                  <Copy className="size-3.5" /> Copy message
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {fieldCount > 0 ? (
            filteredFields.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <div className="hidden grid-cols-[3.5rem_minmax(8rem,0.85fr)_5rem_minmax(10rem,1.15fr)_2rem] items-center gap-2 border-b bg-muted/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <span>Field</span>
                  <span>Name</span>
                  <span>Format</span>
                  <span>Value</span>
                  <span className="sr-only">Actions</span>
                </div>
                <div className="divide-y">
                  {filteredFields.map((field) => (
                    <FieldRow key={field.id} field={field} />
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="p-4 text-center text-xs text-muted-foreground"
                aria-live="polite"
              >
                No data elements match the current search
              </div>
            )
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No data elements were parsed
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface FieldAccordionItemProps {
  field: IsoField;
}

async function copyText(value: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error("Copy failed");
  }
}

function fieldFormat(field: IsoField): string {
  if (!field.definition) return `${field.value.length} chars`;

  const length =
    field.definition.lengthType === "fixed"
      ? String(field.definition.length)
      : `${field.definition.minLength || 1}–${
          field.definition.maxLength || field.definition.length
        }`;
  return `${field.definition.format} · ${length}`;
}

function FieldRow({ field }: FieldAccordionItemProps): JSX.Element {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-2 py-1.5 text-xs hover:bg-muted/25 md:grid-cols-[3.5rem_minmax(8rem,0.85fr)_5rem_minmax(10rem,1.15fr)_2rem]">
      <Badge variant="outline" className="h-5 w-fit px-1.5 font-mono text-[10px]">
        {field.id}
      </Badge>

      <div className="min-w-0 leading-snug">
        <div className="font-medium">
          {field.definition?.name || `Field ${field.id}`}
        </div>
        {field.definition?.description && (
          <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground" title={field.definition.description}>
            {field.definition.description}
          </div>
        )}
      </div>

      <div className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
        {fieldFormat(field)}
        {field.lengthIndicator && (
          <div title="Length indicator">LI {field.lengthIndicator}</div>
        )}
      </div>

      <code
        className="col-span-3 min-w-0 select-all break-all rounded bg-muted/55 px-1.5 py-1 font-mono text-[11px] leading-4 md:col-span-1"
        aria-label={`Field ${field.id} value`}
      >
        {field.value || "<empty>"}
      </code>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => void copyText(field.value, `Field ${field.id} copied`)}
        aria-label={`Copy field ${field.id} value`}
        title={`Copy field ${field.id}`}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}
