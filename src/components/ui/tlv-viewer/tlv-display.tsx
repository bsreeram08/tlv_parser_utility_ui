/**
 * TLV Display Component
 *
 * A component for displaying parsed TLV data in a structured, readable format.
 */

import { useState, type JSX } from "react";
import { type TlvElement, type TlvParsingResult, TagFormat } from "@/types/tlv";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tlvValueToAscii } from "@/utils/tlv";
import { HelpCircle, Tag, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomTagForm } from "@/components/ui/custom-tags";
import { type CustomTagCreationParams, CustomTagDataFormat, DisplayFormat, LengthRuleType } from "@/types/custom-tag";
import { db } from "@/utils/db/db";

interface TlvDisplayProps {
  result: TlvParsingResult | null;
  onRefresh?: () => void;
}

export function TlvDisplay({ result, onRefresh }: TlvDisplayProps): JSX.Element {
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
              <TlvElementCard key={index} element={element} onRefresh={onRefresh} />
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
  onRefresh?: () => void;
}

function TlvElementCard({
  element,
  depth = 0,
  onRefresh,
}: TlvElementCardProps): JSX.Element {
  const [defineTagOpen, setDefineTagOpen] = useState(false);
  const paddingLeft = `${depth * 1.5}rem`;

  // Try to display ASCII representation for primitive values
  const displayValue = element.value;
  const asciiValue = tlvValueToAscii(displayValue);
  const hasAsciiRepresentation = asciiValue !== displayValue;

  // Create a custom tag definition from this unknown tag
  const handleCreateCustomTag = async (tagParams: CustomTagCreationParams) => {
    // Add the custom tag to the database
    await db.addCustomTag({
      ...tagParams,
      created: new Date(),
    });
    
    // Refresh the display if provided
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Default values for the custom tag form based on the unknown tag
  const getInitialTagParams = (): Partial<CustomTagCreationParams> => {
    return {
      id: element.tag,
      name: `Custom Tag ${element.tag}`,
      description: "Custom tag definition for unknown tag",
      format: TagFormat.PRIMITIVE, // Default to primitive
      dataFormat: CustomTagDataFormat.Binary,
      lengthRule: {
        type: LengthRuleType.Fixed,
        fixed: element.length,
      },
      displayFormat: DisplayFormat.Hex,
    };
  };
  
  return (
    <div style={{ marginLeft: paddingLeft }}>
      <Card className={cn(
        element.isUnknown ? "border-amber-500/30 bg-amber-50 dark:bg-amber-950/10" : "",
        element.tagInfo?.isPropriety ? "border-blue-500/30 bg-blue-50 dark:bg-blue-950/10" : ""
      )}>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-1">
              Tag: <code className="bg-muted px-1 rounded">{element.tag}</code>
              {element.tagInfo ? (
                <span className="text-foreground">{element.tagInfo.name}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="ml-1 text-xs gap-1 px-1 border-amber-500 text-amber-500">
                    <HelpCircle className="h-3 w-3" /> Unknown
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 rounded-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefineTagOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Define as custom tag</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              
              {/* Show custom tag indicator if this is a custom tag */}
              {element.tagInfo?.isPropriety && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="ml-1 text-xs gap-1 px-1 border-blue-500 text-blue-500">
                      <Tag className="h-3 w-3" /> Custom
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">This is a custom or proprietary tag</p>
                  </TooltipContent>
                </Tooltip>
              )}
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
      
      {/* Custom Tag Definition Dialog */}
      {element.isUnknown && defineTagOpen && (
        <CustomTagForm
          isOpen={defineTagOpen}
          onClose={() => setDefineTagOpen(false)}
          onSave={handleCreateCustomTag}
          title={`Define Custom Tag: ${element.tag}`}
          description="Create a custom tag definition for this unknown tag"
          initialValues={getInitialTagParams()}
        />
      )}
    </div>
  );
}
