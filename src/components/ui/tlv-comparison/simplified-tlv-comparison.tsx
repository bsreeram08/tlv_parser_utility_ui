/**
 * Enhanced TLV Comparison Component
 *
 * A clean, straightforward interface for comparing two TLV data streams
 * with visual highlighting of differences and a unified view of all tags.
 */

import { useState, useMemo, type JSX } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type TlvElement, type TlvParsingResult } from "@/types/tlv";
import { parseTlv } from "@/utils/tlv";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EnhancedTestsDrawer } from "@/components/ui/enhanced-tests-drawer";
import {
  Copy,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy as CopyIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  hasCustomRenderer,
  getTagRenderer,
} from "@/components/ui/tlv-tags/tag-registry";
import { TagActionsMenu } from "@/components/ui/tlv-tags/tag-actions-menu";

// Path format for nested TLVs: parentTag:childTag (e.g., E0:9F26)
type TagPath = string;

// Type for comparison result
interface TlvComparisonResult {
  left: TlvParsingResult;
  right: TlvParsingResult;
  addedTags: TagPath[];
  removedTags: TagPath[];
  modifiedTags: TagPath[];
  differencesCount: number;
  // Unified tag list for side-by-side comparison
  unifiedTags: TagPath[];
  // Tag maps for easier lookup
  leftTagMap: Record<TagPath, TlvElement>;
  rightTagMap: Record<TagPath, TlvElement>;
}

/**
 * Create a hierarchical map of tag paths to elements for comparison
 */
function createTagMap(elements: TlvElement[]): Record<TagPath, TlvElement> {
  const map: Record<TagPath, TlvElement> = {};

  // Function to recursively add elements to the map
  const addElementsToMap = (elements: TlvElement[], parentPath = "") => {
    elements.forEach((element) => {
      // Create current path (either tag or parentPath:tag)
      const currentPath = parentPath
        ? `${parentPath}:${element.tag}`
        : element.tag;

      // Add to map with the hierarchical path
      map[currentPath] = element;

      // Process children recursively if they exist
      if (element.children && element.children.length > 0) {
        addElementsToMap(element.children, currentPath);
      }
    });
  };

  addElementsToMap(elements);
  return map;
}

/**
 * Component for displaying expandable hex values
 */
const ExpandableHexValue = ({
  value,
  maxLength = 16,
}: {
  value: string;
  maxLength?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > maxLength;

  // Check if it's a hex value
  const isHexValue = /^[0-9A-Fa-f]+$/.test(value);

  // If not a hex value or not long, just display normally
  if (!isHexValue || !isLong) {
    return <div className="font-mono text-xs">{value}</div>;
  }

  const displayValue = expanded ? value : value.substring(0, maxLength) + "...";

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    toast.success("Value copied to clipboard");
  };

  return (
    <div className="space-y-1">
      <div
        className="flex items-start gap-1 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-mono text-xs flex-1 break-all">{displayValue}</div>
        <div className="flex gap-1 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1 rounded-sm opacity-70 hover:opacity-100 hover:bg-muted"
                  onClick={handleCopyClick}
                  variant="ghost"
                >
                  <CopyIcon className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Copy value</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="p-1 rounded-sm opacity-70 hover:opacity-100 hover:bg-muted">
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="p-2 bg-muted/30 rounded-sm text-xs font-mono">
          {value}
        </div>
      )}
    </div>
  );
};

export function SimplifiedTlvComparison(): JSX.Element {
  const [leftInput, setLeftInput] = useState<string>("");
  const [rightInput, setRightInput] = useState<string>("");
  const [leftLabel, setLeftLabel] = useState<string>("First TLV");
  const [rightLabel, setRightLabel] = useState<string>("Second TLV");
  const [comparisonResult, setComparisonResult] =
    useState<TlvComparisonResult | null>(null);

  // Generate unified rows for side-by-side comparison
  const unifiedRows = useMemo(() => {
    if (!comparisonResult) return [];

    const {
      unifiedTags,
      leftTagMap,
      rightTagMap,
      addedTags,
      removedTags,
      modifiedTags,
    } = comparisonResult;

    // Sort tags to ensure nested tags appear under their parents
    const sortedTags = [...unifiedTags].sort((a, b) => {
      // First sort by the number of path segments (parents first)
      const aDepth = a.split(":").length;
      const bDepth = b.split(":").length;

      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }

      // Then sort alphabetically within same depth
      return a.localeCompare(b);
    });

    return sortedTags.map((tagPath) => {
      const leftElement = leftTagMap[tagPath];
      const rightElement = rightTagMap[tagPath];

      let status: "added" | "removed" | "modified" | "unchanged";
      if (addedTags.includes(tagPath)) {
        status = "added";
      } else if (removedTags.includes(tagPath)) {
        status = "removed";
      } else if (modifiedTags.includes(tagPath)) {
        status = "modified";
      } else {
        status = "unchanged";
      }

      return {
        tag: tagPath,
        name:
          leftElement?.tagInfo?.name ||
          rightElement?.tagInfo?.name ||
          "Unknown",
        leftElement,
        rightElement,
        status,
      };
    });
  }, [comparisonResult]);

  /**
   * Compare the two TLV inputs
   */
  const handleCompare = () => {
    if (!leftInput || !rightInput) {
      toast.error("Both TLV inputs are required for comparison");
      return;
    }

    try {
      // Parse both TLV data streams
      const leftResult = parseTlv(leftInput);
      const rightResult = parseTlv(rightInput);

      // Create hierarchical tag maps for comparison
      const leftTagMap = createTagMap(leftResult.elements);
      const rightTagMap = createTagMap(rightResult.elements);

      // Find differences
      const addedTags = Object.keys(rightTagMap).filter(
        (tagPath) => !leftTagMap[tagPath]
      );
      const removedTags = Object.keys(leftTagMap).filter(
        (tagPath) => !rightTagMap[tagPath]
      );

      // Find modified tags (tags present in both but with different values)
      const modifiedTags = Object.keys(leftTagMap).filter(
        (tagPath) =>
          rightTagMap[tagPath] &&
          leftTagMap[tagPath].value !== rightTagMap[tagPath].value
      );

      // Create a unified tag list with all paths
      const unifiedTags = Array.from(
        new Set([...Object.keys(leftTagMap), ...Object.keys(rightTagMap)])
      );

      // Set the comparison result
      setComparisonResult({
        left: leftResult,
        right: rightResult,
        addedTags,
        removedTags,
        modifiedTags,
        differencesCount:
          addedTags.length + removedTags.length + modifiedTags.length,
        unifiedTags,
        leftTagMap,
        rightTagMap,
      });

      // Show toast notification
      if (addedTags.length + removedTags.length + modifiedTags.length > 0) {
        toast.info(
          `Found ${
            addedTags.length + removedTags.length + modifiedTags.length
          } differences`
        );
      } else {
        toast.success("TLV data streams are identical");
      }
    } catch (error) {
      toast.error(
        "Failed to compare TLV data: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  /**
   * Handle loading of saved TLV test for left side
   */
  const handleLoadLeft = (
    tlvData: string,
    options?: Record<string, unknown>
  ) => {
    setLeftInput(tlvData);

    // If a name is provided in the options, use it as the label
    if (options?.name && typeof options.name === "string") {
      setLeftLabel(options.name);
    }
  };

  /**
   * Handle loading of saved TLV test for right side
   */
  const handleLoadRight = (
    tlvData: string,
    options?: Record<string, unknown>
  ) => {
    setRightInput(tlvData);

    // If a name is provided in the options, use it as the label
    if (options?.name && typeof options.name === "string") {
      setRightLabel(options.name);
    }
  };

  /**
   * Generate a simple text report of the comparison
   */
  const generateComparisonReport = (): string => {
    if (!comparisonResult) return "";

    const { addedTags, removedTags, modifiedTags, leftTagMap, rightTagMap } =
      comparisonResult;

    let report = `TLV Comparison Report\n`;
    report += `===================\n\n`;
    report += `Left side: ${leftLabel}\n`;
    report += `Right side: ${rightLabel}\n\n`;

    report += `Summary:\n`;
    report += `- Total differences: ${
      addedTags.length + removedTags.length + modifiedTags.length
    }\n`;
    report += `- Added tags: ${addedTags.length}\n`;
    report += `- Removed tags: ${removedTags.length}\n`;
    report += `- Modified tags: ${modifiedTags.length}\n\n`;

    if (addedTags.length > 0) {
      report += `Added Tags (present in right, not in left):\n`;
      addedTags.forEach((tagPath) => {
        const element = rightTagMap[tagPath];
        if (element) {
          // Format the tag path for display
          const displayPath = tagPath.replace(/:/g, " > ");
          report += `- ${displayPath} ${element.tagInfo?.name || "Unknown"}: ${
            element.value
          }\n`;
        }
      });
      report += `\n`;
    }

    if (removedTags.length > 0) {
      report += `Removed Tags (present in left, not in right):\n`;
      removedTags.forEach((tagPath) => {
        const element = leftTagMap[tagPath];
        if (element) {
          // Format the tag path for display
          const displayPath = tagPath.replace(/:/g, " > ");
          report += `- ${displayPath} ${element.tagInfo?.name || "Unknown"}: ${
            element.value
          }\n`;
        }
      });
      report += `\n`;
    }

    if (modifiedTags.length > 0) {
      report += `Modified Tags (different values):\n`;
      modifiedTags.forEach((tagPath) => {
        const leftElement = leftTagMap[tagPath];
        const rightElement = rightTagMap[tagPath];
        if (leftElement && rightElement) {
          // Format the tag path for display
          const displayPath = tagPath.replace(/:/g, " > ");
          report += `- ${displayPath} ${
            leftElement.tagInfo?.name || "Unknown"
          }:\n`;
          report += `  Left:  ${leftElement.value}\n`;
          report += `  Right: ${rightElement.value}\n`;
        }
      });
    }

    return report;
  };

  /**
   * Copy comparison report to clipboard
   */
  const handleCopyReport = () => {
    const report = generateComparisonReport();
    navigator.clipboard
      .writeText(report)
      .then(() => toast.success("Report copied to clipboard"))
      .catch(() => toast.error("Failed to copy report"));
  };

  /**
   * Helper to format tag paths for display, highlighting nested structure
   */
  const formatTagPathForDisplay = (tagPath: TagPath): JSX.Element => {
    const parts = tagPath.split(":");

    if (parts.length === 1) {
      return <span>{tagPath}</span>;
    }

    // For nested tags, show the hierarchy with visual indicators
    return (
      <span className={`flex flex-col`}>
        {parts.map((part, index) => (
          <span
            key={index}
            className={index > 0 ? "ml-2 flex items-center" : ""}
          >
            {index > 0 && <span className="mr-1 text-muted-foreground">↳</span>}
            {part}
          </span>
        ))}
      </span>
    );
  };

  /**
   * Render tag-specific UI for a TLV element if available
   */
  const renderTagSpecificUI = (
    tag: string,
    value: string
  ): JSX.Element | null => {
    if (hasCustomRenderer(tag)) {
      const renderer = getTagRenderer(tag);
      if (renderer) {
        return renderer({
          tag,
          value,
          isComparison: true,
        }) as JSX.Element;
      }
    }
    return null;
  };

  /**
            >
              {part}
            </span>
          </span>
        ))}
      </span>
    );
  };

  /**
   * Render a unified table with both TLV streams side by side
   */
  const renderUnifiedTable = (): JSX.Element => {
    return (
      <div className="overflow-y-auto max-h-[60vh]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-border">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                className="py-3 px-4 text-left text-xs font-medium text-foreground uppercase w-[15%] border-r border-border"
              >
                Tag
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-left text-xs font-medium text-foreground uppercase w-[20%] border-r border-border"
              >
                Name
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-left text-xs font-medium text-foreground uppercase w-[32.5%] border-r border-border"
              >
                {leftLabel} Value
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-left text-xs font-medium text-foreground uppercase w-[32.5%]"
              >
                {rightLabel} Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-gray-200 dark:divide-gray-700">
            {unifiedRows.map((row) => (
              <tr
                key={row.tag}
                className={cn(
                  row.status === "added" && "bg-success/10 dark:bg-success/5",
                  row.status === "removed" &&
                    "bg-destructive/10 dark:bg-destructive/5",
                  row.status === "modified" && "bg-warning/10 dark:bg-warning/5"
                )}
              >
                <td className="py-2 px-4 align-top border-r border-border">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted/50 px-1 py-0.5 rounded inline-flex items-center">
                      {formatTagPathForDisplay(row.tag)}
                    </code>
                    <TagActionsMenu
                      tag={row.tag.split(":").pop() || row.tag}
                      value={
                        row.leftElement?.value || row.rightElement?.value || ""
                      }
                      path={row.tag}
                    />
                  </div>
                </td>
                <td className="py-2 px-4 align-top border-r border-border">
                  <span className="text-xs">{row.name}</span>
                </td>

                {/* Left side value */}
                <td className="py-2 px-4 align-top border-r border-border">
                  {row.leftElement ? (
                    <div className="flex flex-col gap-1">
                      <ExpandableHexValue value={row.leftElement.value} />

                      {/* Show custom tag UI if available */}
                      {hasCustomRenderer(row.leftElement.tag) && (
                        <div className="mt-2 border-t pt-2">
                          {renderTagSpecificUI(
                            row.leftElement.tag,
                            row.leftElement.value
                          )}
                        </div>
                      )}

                      {row.status === "removed" && (
                        <div className="mt-1">
                          <Badge variant="destructive" className="text-[10px]">
                            Removed
                          </Badge>
                        </div>
                      )}
                      {row.status === "modified" && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            Modified
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" /> Not
                      present
                    </span>
                  )}
                </td>

                {/* Right side value */}
                <td className="py-2 px-4 align-top">
                  {row.rightElement ? (
                    <div className="flex flex-col gap-1">
                      <ExpandableHexValue value={row.rightElement.value} />

                      {/* Show custom tag UI if available */}
                      {hasCustomRenderer(row.rightElement.tag) && (
                        <div className="mt-2 border-t pt-2">
                          {renderTagSpecificUI(
                            row.rightElement.tag,
                            row.rightElement.value
                          )}
                        </div>
                      )}

                      {row.status === "added" && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            Added
                          </Badge>
                        </div>
                      )}
                      {row.status === "modified" && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            Modified
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" /> Not
                      present
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>TLV Comparison Tool</CardTitle>
          <CardDescription>
            Compare two TLV data streams to identify differences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="left-input" className="text-base font-semibold">
                  {leftLabel}
                </Label>
                <EnhancedTestsDrawer testType="tlv" onLoad={handleLoadLeft}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <FolderOpen className="h-4 w-4" /> Load
                  </Button>
                </EnhancedTestsDrawer>
              </div>
              <Textarea
                id="left-input"
                value={leftInput}
                onChange={(e) => setLeftInput(e.target.value)}
                placeholder="Enter first TLV data in hex format"
                className="font-mono min-h-32 max-h-64"
              />
            </div>

            {/* Right side input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="right-input"
                  className="text-base font-semibold"
                >
                  {rightLabel}
                </Label>
                <EnhancedTestsDrawer testType="tlv" onLoad={handleLoadRight}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <FolderOpen className="h-4 w-4" /> Load
                  </Button>
                </EnhancedTestsDrawer>
              </div>
              <Textarea
                id="right-input"
                value={rightInput}
                onChange={(e) => setRightInput(e.target.value)}
                placeholder="Enter second TLV data in hex format"
                className="font-mono min-h-32 max-h-64"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="default"
            onClick={handleCompare}
            disabled={!leftInput || !rightInput}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Compare
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyReport}
            disabled={!comparisonResult}
            className="gap-1"
          >
            <Copy className="h-4 w-4" /> Copy Report
          </Button>
        </CardFooter>
      </Card>

      {/* Comparison results */}
      {comparisonResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span>Comparison Results</span>
              {comparisonResult.differencesCount > 0 ? (
                <Badge variant="destructive" className="ml-2">
                  {comparisonResult.differencesCount} Differences
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-2">
                  Identical
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {comparisonResult.differencesCount === 0
                ? "The TLV data streams are identical"
                : `Found ${comparisonResult.addedTags.length} added, ${comparisonResult.removedTags.length} removed, and ${comparisonResult.modifiedTags.length} modified tags`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="unified">
              <TabsList className="mb-4">
                <TabsTrigger value="unified">Unified View</TabsTrigger>
                <TabsTrigger value="report">Report</TabsTrigger>
              </TabsList>

              <TabsContent value="unified">{renderUnifiedTable()}</TabsContent>

              <TabsContent value="report">
                <Card className="border">
                  <CardContent className="pt-6">
                    <pre className="p-4 bg-muted rounded-md text-xs whitespace-pre-wrap ">
                      {generateComparisonReport()}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
