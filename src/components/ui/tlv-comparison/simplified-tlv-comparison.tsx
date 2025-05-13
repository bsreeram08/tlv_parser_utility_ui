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
import { Copy, FolderOpen, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Type for comparison result
interface TlvComparisonResult {
  left: TlvParsingResult;
  right: TlvParsingResult;
  addedTags: string[];
  removedTags: string[];
  modifiedTags: string[];
  differencesCount: number;
  // Unified tag list for side-by-side comparison
  unifiedTags: string[];
  // Tag maps for easier lookup
  leftTagMap: Record<string, TlvElement>;
  rightTagMap: Record<string, TlvElement>;
}

/**
 * Create a map of tag to element for faster comparison
 */
function createTagMap(elements: TlvElement[]): Record<string, TlvElement> {
  const map: Record<string, TlvElement> = {};

  // Function to recursively add elements to the map
  const addElementsToMap = (elements: TlvElement[]) => {
    elements.forEach((element) => {
      map[element.tag] = element;
      if (element.children && element.children.length > 0) {
        addElementsToMap(element.children);
      }
    });
  };

  addElementsToMap(elements);
  return map;
}

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

    return unifiedTags.map((tag) => {
      const leftElement = leftTagMap[tag];
      const rightElement = rightTagMap[tag];

      let status: "added" | "removed" | "modified" | "unchanged";
      if (addedTags.includes(tag)) {
        status = "added";
      } else if (removedTags.includes(tag)) {
        status = "removed";
      } else if (modifiedTags.includes(tag)) {
        status = "modified";
      } else {
        status = "unchanged";
      }

      return {
        tag,
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

      // Create a map of tag to element for faster comparison
      const leftTagMap = createTagMap(leftResult.elements);
      const rightTagMap = createTagMap(rightResult.elements);

      // Find differences
      const addedTags = Object.keys(rightTagMap).filter(
        (tag) => !leftTagMap[tag]
      );
      const removedTags = Object.keys(leftTagMap).filter(
        (tag) => !rightTagMap[tag]
      );

      // Find modified tags (tags present in both but with different values)
      const modifiedTags = Object.keys(leftTagMap).filter(
        (tag) =>
          rightTagMap[tag] && leftTagMap[tag].value !== rightTagMap[tag].value
      );

      // Create a unified tag list sorted by tag ID
      const unifiedTags = Array.from(
        new Set([...Object.keys(leftTagMap), ...Object.keys(rightTagMap)])
      ).sort();

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
      addedTags.forEach((tag) => {
        const element = rightTagMap[tag];
        if (element) {
          report += `- ${tag} ${element.tagInfo?.name || "Unknown"}: ${
            element.value
          }\n`;
        }
      });
      report += `\n`;
    }

    if (removedTags.length > 0) {
      report += `Removed Tags (present in left, not in right):\n`;
      removedTags.forEach((tag) => {
        const element = leftTagMap[tag];
        if (element) {
          report += `- ${tag} ${element.tagInfo?.name || "Unknown"}: ${
            element.value
          }\n`;
        }
      });
      report += `\n`;
    }

    if (modifiedTags.length > 0) {
      report += `Modified Tags (different values):\n`;
      modifiedTags.forEach((tag) => {
        const leftElement = leftTagMap[tag];
        const rightElement = rightTagMap[tag];
        if (leftElement && rightElement) {
          report += `- ${tag} ${leftElement.tagInfo?.name || "Unknown"}:\n`;
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
   * Render a unified table with both TLV streams side by side
   */
  const renderUnifiedTable = (): JSX.Element => {
    return (
      <table className="w-full border-collapse">
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            <th className="w-16 text-left p-2 font-medium border-r">Tag</th>
            <th className="w-1/5 text-left p-2 font-medium border-r">Name</th>
            <th className="w-2/5 text-left p-2 font-medium border-r">
              {leftLabel} Value
            </th>
            <th className="w-2/5 text-left p-2 font-medium">
              {rightLabel} Value
            </th>
          </tr>
        </thead>
        <tbody>
          {unifiedRows.map((row) => (
            <tr
              key={row.tag}
              className={cn(
                "border-b",
                row.status === "added" && "bg-green-50 dark:bg-green-950/20",
                row.status === "removed" && "bg-red-50 dark:bg-red-950/20",
                row.status === "modified" && "bg-amber-50 dark:bg-amber-950/20"
              )}
            >
              <td className="p-2 border-r">
                <code className="text-xs bg-muted/50 px-1 py-0.5 rounded">
                  {row.tag}
                </code>
              </td>
              <td className="p-2 border-r">
                <span className="text-xs">{row.name}</span>
              </td>
              <td className="p-2 border-r font-mono text-xs break-all">
                {row.leftElement ? (
                  <span>{row.leftElement.value}</span>
                ) : (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Not present
                  </span>
                )}
                {row.status === "removed" && (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    Removed
                  </Badge>
                )}
                {row.status === "modified" && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Modified
                  </Badge>
                )}
              </td>
              <td className="p-2 font-mono text-xs break-all">
                {row.rightElement ? (
                  <span>{row.rightElement.value}</span>
                ) : (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Not present
                  </span>
                )}
                {row.status === "added" && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    Added
                  </Badge>
                )}
                {row.status === "modified" && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Modified
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
                className="font-mono min-h-32"
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
                className="font-mono min-h-32"
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

              <TabsContent value="unified">
                <div className="overflow-x-auto">{renderUnifiedTable()}</div>
              </TabsContent>

              <TabsContent value="report">
                <Card className="border">
                  <CardContent className="pt-6">
                    <pre className="p-4 bg-muted rounded-md text-xs whitespace-pre-wrap">
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
