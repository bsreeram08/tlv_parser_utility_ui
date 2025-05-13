/**
 * ISO 8583 Display Component
 * 
 * A component for displaying parsed ISO 8583 message data in a structured, readable format.
 */

import { type JSX } from "react";
import { type Iso8583ParseResult, type IsoField } from "@/types/iso8583";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IsoDisplayProps {
  result: Iso8583ParseResult | null;
}

export function IsoDisplay({ result }: IsoDisplayProps): JSX.Element {
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
                  {error.fieldId !== undefined && 
                    ` (Field ${error.fieldId})`}
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
                <TableCell>{result.mti.class} - {getMtiClassDescription(result.mti.class)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Function</TableCell>
                <TableCell>{result.mti.function} - {getMtiFunctionDescription(result.mti.function)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Origin</TableCell>
                <TableCell>{result.mti.origin} - {getMtiOriginDescription(result.mti.origin)}</TableCell>
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
                {result.bitmap.presentFields.map(fieldId => (
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
          <CardTitle>Data Elements</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <ScrollArea className="h-[calc(100vh-550px)]">
            {fieldCount > 0 ? (
              <Accordion type="multiple" className="w-full">
                {Object.values(result.fields)
                  .sort((a, b) => a.id - b.id)
                  .map((field) => (
                    <FieldAccordionItem key={field.id} field={field} />
                  ))}
              </Accordion>
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
          <span>
            {field.definition?.name || `Field ${field.id}`}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pl-2">
          {/* Field value */}
          <div>
            <h4 className="text-sm font-medium">Value</h4>
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
                    <TableCell className="py-1.5">{field.definition.format}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium py-1.5">Length Type</TableCell>
                    <TableCell className="py-1.5">{field.definition.lengthType}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium py-1.5">Length</TableCell>
                    <TableCell className="py-1.5">
                      {field.definition.lengthType === "fixed" 
                        ? field.definition.length 
                        : `${field.definition.minLength || 1}-${field.definition.maxLength || field.definition.length}`}
                    </TableCell>
                  </TableRow>
                  {field.definition.description && (
                    <TableRow>
                      <TableCell className="font-medium py-1.5">Description</TableCell>
                      <TableCell className="py-1.5">{field.definition.description}</TableCell>
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

// Helper functions for MTI descriptions
function getMtiClassDescription(classCode: string): string {
  switch (classCode) {
    case "0": return "Authorization";
    case "1": return "Financial";
    case "2": return "File Actions";
    case "3": return "File Update";
    case "4": return "Reversal";
    case "5": return "Reconciliation";
    case "6": return "Administrative";
    case "7": return "Fee Collection";
    case "8": return "Network Management";
    case "9": return "Reserved for ISO use";
    default: return "Unknown";
  }
}

function getMtiFunctionDescription(functionCode: string): string {
  switch (functionCode) {
    case "0": return "Request";
    case "1": return "Request Response";
    case "2": return "Advice";
    case "3": return "Advice Response";
    case "4": return "Notification";
    case "5": return "Notification Acknowledgement";
    case "6": return "Instruction";
    case "7": return "Instruction Acknowledgement";
    case "8": return "Reserved for ISO use";
    case "9": return "Reserved for ISO use";
    default: return "Unknown";
  }
}

function getMtiOriginDescription(originCode: string): string {
  switch (originCode) {
    case "0": return "Acquirer";
    case "1": return "Acquirer Repeat";
    case "2": return "Issuer";
    case "3": return "Issuer Repeat";
    case "4": return "Other";
    case "5": return "Other Repeat";
    case "6": return "Reserved for ISO use";
    case "7": return "Reserved for ISO use";
    case "8": return "Reserved for ISO use";
    case "9": return "Reserved for ISO use";
    default: return "Unknown";
  }
}
