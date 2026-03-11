/**
 * ISO 8583 Display Component
 *
 * A component for displaying parsed ISO 8583 message data in a structured, readable format.
 */

import { useEffect, useMemo, useState, type JSX } from "react";
import { type Iso8583ParseResult, type IsoField } from "@/types/iso8583";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [expandedFields, setExpandedFields] = useState<string[]>([]);

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
    setExpandedFields([]);
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
    <div className="space-y-4 w-full">
      {/* Display any parsing errors */}
      {result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Parsing Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
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

      {/* Display MTI information */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex justify-between items-center">
            <span>Message Type Indicator (MTI): {result.mti.raw}</span>
            <Badge variant="outline" className="ml-2">
              ISO 8583:{result.mti.version}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Version</TableCell>
                <TableCell>{result.mti.version}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Class</TableCell>
                <TableCell>
                  {result.mti.class} -{" "}
                  {getMtiClassDescription(result.mti.class)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Function</TableCell>
                <TableCell>
                  {result.mti.function} -{" "}
                  {getMtiFunctionDescription(result.mti.function)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Origin</TableCell>
                <TableCell>
                  {result.mti.origin} -{" "}
                  {getMtiOriginDescription(result.mti.origin)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Display Bitmap information */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex justify-between items-center">
            <span>Bitmap</span>
            <Badge variant="secondary" className="ml-2">
              {fieldCount} Fields Present
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Primary Bitmap</h4>
                <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                  {result.bitmap.primary}
                </div>
              </div>

              {result.bitmap.secondary && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Secondary Bitmap</h4>
                  <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                    {result.bitmap.secondary}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">Present Fields</h4>
              <div className="flex flex-wrap gap-1">
                {result.bitmap.presentFields.map((fieldId) => (
                  <Badge key={fieldId} variant="outline">
                    {fieldId}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display parsed fields */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Data Elements</CardTitle>
            {fieldCount > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="iso8583-field-search" className="sr-only">
                    Search data elements
                  </label>
                  <Input
                    id="iso8583-field-search"
                    value={fieldSearch}
                    onChange={(event) => setFieldSearch(event.target.value)}
                    placeholder="Search by field, name, or value..."
                    className="w-full sm:w-72"
                  />
                  {fieldSearch && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFieldSearch("")}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedFields(
                        filteredFields.map((field) => `field-${field.id}`)
                      )
                    }
                    disabled={filteredFields.length === 0}
                  >
                    Expand all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedFields([])}
                    disabled={expandedFields.length === 0}
                  >
                    Collapse all
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ScrollArea className="h-[calc(100vh-550px)]">
            {fieldCount > 0 ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    Showing {filteredFields.length} of {fieldCount} fields
                  </Badge>
                  {fieldSearch && filteredFields.length > 0 && (
                    <Badge variant="outline" aria-live="polite">
                      Filtered by “{fieldSearch}”
                    </Badge>
                  )}
                </div>
                {filteredFields.length > 0 ? (
                  <Accordion
                    type="multiple"
                    className="w-full"
                    value={expandedFields}
                    onValueChange={setExpandedFields}
                  >
                    {filteredFields.map((field) => (
                      <FieldAccordionItem key={field.id} field={field} />
                    ))}
                  </Accordion>
                ) : (
                  <div
                    className="text-center p-4 text-muted-foreground"
                    aria-live="polite"
                  >
                    No data elements match the current search
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                No data elements were parsed
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface FieldAccordionItemProps {
  field: IsoField;
}

function FieldAccordionItem({ field }: FieldAccordionItemProps): JSX.Element {
  return (
    <AccordionItem value={`field-${field.id}`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">
            {field.id}
          </Badge>
          <span>{field.definition?.name || `Field ${field.id}`}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pl-2">
          {/* Field value */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium">Value</h4>
              <span className="text-xs text-muted-foreground">
                {field.value.length} characters
              </span>
            </div>
            <div className="bg-muted p-2 rounded font-mono text-xs break-all mt-1">
              {field.value}
            </div>
          </div>

          {/* Length indicator if present */}
          {field.lengthIndicator && (
            <div>
              <h4 className="text-sm font-medium">Length Indicator</h4>
              <div className="bg-muted p-2 rounded font-mono text-xs mt-1">
                {field.lengthIndicator}
              </div>
            </div>
          )}

          {/* Field definition if available */}
          {field.definition && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Definition</h4>
              <Table>
                <TableBody className="text-xs">
                  <TableRow>
                    <TableCell className="font-medium py-1.5">Format</TableCell>
                    <TableCell className="py-1.5">
                      {field.definition.format}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium py-1.5">
                      Length Type
                    </TableCell>
                    <TableCell className="py-1.5">
                      {field.definition.lengthType}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium py-1.5">Length</TableCell>
                    <TableCell className="py-1.5">
                      {field.definition.lengthType === "fixed"
                        ? field.definition.length
                        : `${field.definition.minLength || 1}-${
                            field.definition.maxLength ||
                            field.definition.length
                          }`}
                    </TableCell>
                  </TableRow>
                  {field.definition.description && (
                    <TableRow>
                      <TableCell className="font-medium py-1.5">
                        Description
                      </TableCell>
                      <TableCell className="py-1.5">
                        {field.definition.description}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
