/**
 * Compact TLV Display Component
 *
 * A cleaner, more compact view of TLV data with all tags visible at once
 * and expandable details on click.
 */

import { useState, type JSX } from "react";
import { type TlvElement, type TlvParsingResult } from "@/types/tlv";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  ChevronDown, 
  ChevronRight,
  Tag as TagIcon, 
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tlvValueToAscii } from "@/utils/tlv";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTagForm } from "@/components/ui/custom-tags";
import { 
  type CustomTagCreationParams, 
  CustomTagDataFormat, 
  DisplayFormat, 
  LengthRuleType 
} from "@/types/custom-tag";
import { db } from "@/utils/db/db";

interface CompactTlvDisplayProps {
  result: TlvParsingResult | null;
  onRefresh?: () => void;
}

export function CompactTlvDisplay({ result, onRefresh }: CompactTlvDisplayProps): JSX.Element {
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
        <CardTitle className="text-lg">TLV Data</CardTitle>
        <CardDescription>
          {result.elements.length} tag{result.elements.length !== 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {result.elements.map((element, index) => (
            <CompactTlvElement 
              key={index} 
              element={element} 
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CompactTlvElementProps {
  element: TlvElement;
  onRefresh?: () => void;
  depth?: number;
}

function CompactTlvElement({ 
  element, 
  onRefresh,
  depth = 0 
}: CompactTlvElementProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [defineTagOpen, setDefineTagOpen] = useState(false);
  const [activeValueTab, setActiveValueTab] = useState<string>("hex");
  
  // Try to display ASCII representation for primitive values
  const displayValue = element.value;
  const asciiValue = tlvValueToAscii(displayValue);
  const hasAsciiRepresentation = asciiValue !== displayValue && asciiValue.trim().length > 0;

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
    // In future versions, this will render custom UI based on tag type
    // For now, just show a placeholder for tag 9C (Transaction Type)
    if (element.tag === "9C") {
      return (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">Transaction Type UI</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Custom UI for Transaction Type tag will be implemented here
          </div>
        </div>
      );
    }
    
    // Add more tag-specific UI components as needed
    return null;
  };

  // Create indentation based on depth
  const indentStyle = {
    marginLeft: `${depth * 1.5}rem`,
  };

  return (
    <div style={indentStyle}>
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className={cn(
          "border rounded-md",
          element.isUnknown ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10" : "border-border",
          element.tagInfo?.isPropriety ? "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10" : ""
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30">
            <div className="flex items-center gap-2">
              {isOpen ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
              
              <code className="bg-muted px-1 rounded text-xs">{element.tag}</code>
              
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {element.tagInfo?.name || "Unknown Tag"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    {element.tagInfo?.description || "No description available"}
                  </p>
                </TooltipContent>
              </Tooltip>
              
              {element.isUnknown && (
                <Badge variant="outline" className="text-xs gap-1 px-1 border-amber-500 text-amber-500">
                  <HelpCircle className="h-3 w-3" /> Unknown
                </Badge>
              )}
              
              {element.tagInfo?.isPropriety && (
                <Badge variant="outline" className="text-xs gap-1 px-1 border-blue-500 text-blue-500">
                  <TagIcon className="h-3 w-3" /> Custom
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-muted/50 px-1 rounded truncate max-w-[100px]">
                {displayValue.length > 12 ? `${displayValue.substring(0, 12)}...` : displayValue}
              </span>
              
              <Badge variant="outline" className="text-xs">
                {element.length} bytes
              </Badge>
              
              {element.isUnknown && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDefineTagOpen(true);
                  }}
                >
                  <TagIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-3 pt-0 border-t">
            {/* Tag description */}
            {element.tagInfo && (
              <div className="text-sm mt-3 text-muted-foreground">
                {element.tagInfo.description}
              </div>
            )}
            
            {/* Value display with tabs */}
            {element.length > 0 && (
              <div className="mt-3">
                <Tabs value={activeValueTab} onValueChange={setActiveValueTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="hex" className="text-xs">Hex</TabsTrigger>
                    {hasAsciiRepresentation && (
                      <TabsTrigger value="ascii" className="text-xs">ASCII</TabsTrigger>
                    )}
                    {/* Add more tabs for different interpretations */}
                    <TabsTrigger value="binary" className="text-xs">Binary</TabsTrigger>
                    <TabsTrigger value="decimal" className="text-xs">Decimal</TabsTrigger>
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
                      {displayValue.match(/.{1,2}/g)?.map(byte => 
                        parseInt(byte, 16).toString(2).padStart(8, '0')
                      ).join(' ')}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="decimal" className="mt-2">
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                      {/* Convert hex to decimal representation */}
                      {displayValue.match(/.{1,2}/g)?.map(byte => 
                        parseInt(byte, 16).toString(10)
                      ).join(' ')}
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
                  {element.children.map((child, index) => (
                    <CompactTlvElement 
                      key={index} 
                      element={child} 
                      depth={depth + 1}
                      onRefresh={onRefresh}
                    />
                  ))}
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
