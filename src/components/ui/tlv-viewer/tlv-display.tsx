/**
 * TLV Display Component
 *
 * A component for displaying parsed TLV data in a structured, readable format.
 */

import { type TlvElement, type TlvParsingResult } from "@/types/tlv";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tlvValueToAscii } from "@/utils/tlv";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { JSX } from "react";

interface TlvDisplayProps {
  result: TlvParsingResult | null;
}

export function TlvDisplay({ result }: TlvDisplayProps): JSX.Element {
  if (!result) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Enter TLV data and click Parse to see results here
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Display parsed elements */}
      <ScrollArea className="h-[calc(100vh-300px)] pr-4">
        {result.elements.length > 0 ? (
          <div className="space-y-4">
            {result.elements.map((element, index) => (
              <TlvElementCard key={index} element={element} />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No TLV elements were parsed
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface TlvElementCardProps {
  element: TlvElement;
  depth?: number;
}

function TlvElementCard({
  element,
  depth = 0,
}: TlvElementCardProps): JSX.Element {
  const paddingLeft = `${depth * 1.5}rem`;

  // Try to display ASCII representation for primitive values
  const displayValue = element.value;
  const asciiValue = tlvValueToAscii(displayValue);
  const hasAsciiRepresentation = asciiValue !== displayValue;

  return (
    <div style={{ marginLeft: paddingLeft }}>
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              Tag: <code className="bg-muted px-1 rounded">{element.tag}</code>
              {element.tagInfo && ` - ${element.tagInfo.name}`}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              Length: {element.length} bytes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          {/* Tag details */}
          {element.tagInfo && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">
                {element.tagInfo.description}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Format: {element.tagInfo.format}</div>
                <div>Class: {element.tagInfo.class}</div>
              </div>
            </div>
          )}

          {/* Value display */}
          {element.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Value:</div>
              <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                {displayValue}
              </div>

              {/* ASCII representation if applicable */}
              {hasAsciiRepresentation && (
                <div className="mt-2">
                  <div className="text-sm font-medium">ASCII:</div>
                  <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                    {asciiValue}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nested elements for constructed tags */}
          {element.children && element.children.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium">Nested Elements:</div>
              {element.children.map((child, index) => (
                <TlvElementCard key={index} element={child} depth={1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
