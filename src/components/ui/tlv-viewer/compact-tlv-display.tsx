/**
 * Compact TLV Display Component
 *
 * A cleaner, more compact view of TLV data with all tags visible at once
 * and expandable details on click.
 */

import { useState, type JSX } from "react";
import { sanitizeSelectValues } from "@/utils/select-helpers";
import { type TlvElement, type TlvParsingResult } from "@/types/tlv";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { tlvValueToAscii } from "@/utils/tlv";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTagForm } from "@/components/ui/custom-tags";
import {
  type CustomTagCreationParams,
  CustomTagDataFormat,
  DisplayFormat,
  LengthRuleType,
} from "@/types/custom-tag";
import { db } from "@/utils/db/db";
import {
  hasCustomRenderer,
  getTagRenderer,
} from "@/components/ui/tlv-tags/tag-registry";
import { TagActionsMenu } from "@/components/ui/tlv-tags/tag-actions-menu";

interface CompactTlvDisplayProps {
  result: TlvParsingResult | null;
  onRefresh?: () => void;
  expandAll?: boolean;
}

export function CompactTlvDisplay({
  result,
  onRefresh,
  expandAll: externalExpandAll,
}: CompactTlvDisplayProps): JSX.Element {
  const [internalExpandAll, setInternalExpandAll] = useState(false);

  // Use external expandAll if provided, otherwise use internal state
  const expandAll =
    externalExpandAll !== undefined ? externalExpandAll : internalExpandAll;

  if (!result) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Enter TLV data and click Parse to see results here
      </div>
    );
  }

  if (result.elements.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No TLV elements were parsed
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          TLV Data
          {externalExpandAll === undefined && (
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setInternalExpandAll(!internalExpandAll)}
            >
              {expandAll ? "Collapse All" : "Expand All"}
              {expandAll ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {result.elements.length} tag{result.elements.length !== 1 ? "s" : ""}{" "}
          found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {result.elements.map((element, index) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [isOpen, setIsOpen] = useState(false);
            return (
              <CompactTlvElement
                key={index}
                element={element}
                onRefresh={onRefresh}
                path={element.tag}
                isOpen={expandAll || isOpen}
                setIsOpen={setIsOpen}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface CompactTlvElementProps {
  element: TlvElement;
  onRefresh?: () => void;
  depth?: number;
  path?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

function CompactTlvElement({
  element,
  onRefresh,
  depth = 0,
  isOpen,
  setIsOpen,
  path = "",
}: CompactTlvElementProps): JSX.Element {
  const [defineTagOpen, setDefineTagOpen] = useState(false);
  const [activeValueTab, setActiveValueTab] = useState<string>("hex");

  // Try to display ASCII representation for primitive values
  const displayValue = element.value;
  const asciiValue = tlvValueToAscii(displayValue);
  const hasAsciiRepresentation =
    asciiValue !== displayValue && asciiValue.trim().length > 0;

  // Create a custom tag definition from this unknown tag
  const handleCreateCustomTag = async (tagParams: CustomTagCreationParams) => {
    // Sanitize tag params to prevent empty string values
    const sanitizedParams = sanitizeSelectValues(tagParams);

    // Add the custom tag to the database
    await db.addCustomTag({
      ...sanitizedParams,
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
      dataFormat: CustomTagDataFormat.Binary,
      lengthRule: {
        type: LengthRuleType.Fixed,
        fixed: element.length,
      },
      displayFormat: DisplayFormat.Hex,
    };
  };

  // Determine tag component UI
  const renderTagSpecificUI = () => {
    if (hasCustomRenderer(element.tag)) {
      const renderer = getTagRenderer(element.tag);
      if (renderer) {
        return renderer({
          tag: element.tag,
          value: element.value,
          onChange: (newValue) => {
            // In a real implementation, you'd handle value updates here
            console.log(`Value changed for ${element.tag}: ${newValue}`);
            // If needed, update the parsed data and call onRefresh
            if (onRefresh) onRefresh();
          },
        });
      }
    }
    return null;
  };

  return (
    <div className="rounded border relative">
      {/* Position the actions menu outside the button to avoid nesting issues */}
      <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
        {element.isUnknown && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full p-0 hover:bg-muted/80"
                  onClick={() => setDefineTagOpen(true)}
                >
                  <HelpCircle className="h-4 w-4 text-warning" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Define Custom Tag</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TagActionsMenu
          tag={element.tag}
          value={element.value}
          path={path || element.tag}
        />
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex w-full items-start justify-between pr-10 rounded-none text-left",
              element.isUnknown
                ? "bg-muted/60 hover:bg-muted/80"
                : "hover:bg-muted",
              // Indentation for nested elements
              depth > 0 && "ml-" + depth * 4
            )}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex-shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-shrink-0">
                <Badge
                  variant={element.isUnknown ? "outline" : "secondary"}
                  className={cn("font-mono")}
                >
                  {element.tag}
                </Badge>
              </div>

              <div className="truncate font-medium">
                {element.tagInfo?.name || "Unknown Tag"}
              </div>
            </div>

            <div className="flex items-center text-xs text-muted-foreground">
              <div className="mr-4">
                <Badge variant="outline" className="font-mono text-xs">
                  {element.length} bytes
                </Badge>
              </div>
              <div className="w-24 truncate font-mono text-xs">
                {element.value ? element.value : "<empty>"}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="p-3 pt-0 border-t">
          <div className="p-3 pt-0 border-t">
            {" "}
            {/* Tag description */}
            {element.tagInfo && (
              <div className="text-sm mt-3 text-muted-foreground">
                {element.tagInfo.description}
              </div>
            )}
            {/* Value display with tabs */}
            {element.length > 0 && (
              <div className="mt-3 mb-3">
                <Tabs value={activeValueTab} onValueChange={setActiveValueTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="hex" className="text-xs">
                      Hex
                    </TabsTrigger>
                    {hasAsciiRepresentation && (
                      <TabsTrigger value="ascii" className="text-xs">
                        ASCII
                      </TabsTrigger>
                    )}
                    {/* Add more tabs for different interpretations */}
                    <TabsTrigger value="binary" className="text-xs">
                      Binary
                    </TabsTrigger>
                    <TabsTrigger value="decimal" className="text-xs">
                      Decimal
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="hex" className="mt-2">
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                      {displayValue}
                    </div>
                  </TabsContent>

                  {hasAsciiRepresentation && (
                    <TabsContent value="ascii" className="mt-2">
                      <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                        {asciiValue}
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="binary" className="mt-2">
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                      {/* Convert hex to binary representation */}
                      {displayValue
                        .match(/.{1,2}/g)
                        ?.map((byte) =>
                          parseInt(byte, 16).toString(2).padStart(8, "0")
                        )
                        .join(" ")}
                    </div>
                  </TabsContent>

                  <TabsContent value="decimal" className="mt-2">
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                      {/* Convert hex to decimal representation */}
                      {displayValue
                        .match(/.{1,2}/g)
                        ?.map((byte) => parseInt(byte, 16).toString(10))
                        .join(" ")}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            {/* Tag-specific UI component */}
            {renderTagSpecificUI()}
            {/* Nested elements */}
            {element.children && element.children.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium mb-2">Nested Elements:</div>
                <div className="space-y-2">
                  {element.children.map((child, index) => {
                    const childPath = path ? `${path}:${child.tag}` : child.tag;
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const [isOpen, setIsOpen] = useState(false);
                    return (
                      <CompactTlvElement
                        key={index}
                        element={child}
                        depth={depth + 1}
                        onRefresh={onRefresh}
                        path={childPath}
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

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
