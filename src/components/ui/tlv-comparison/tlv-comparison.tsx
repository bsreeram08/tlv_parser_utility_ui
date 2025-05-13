/**
 * TLV Comparison Tool
 * 
 * A component for comparing two TLV data streams side by side,
 * highlighting differences, and generating comparison reports.
 */

import { useState, useMemo, type JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { parseTlv, getTagInfo } from "@/utils/tlv";
import { type TlvElement, type TlvParsingResult } from "@/types/tlv";
import { toast } from "sonner";
import { FileDown, Copy } from "lucide-react";
import { EnhancedTestsDrawer } from "@/components/ui/enhanced-tests-drawer";

// Diff status for a TLV element
type DiffStatus = "added" | "removed" | "modified" | "unchanged";

// Enhanced TLV element with diff status
interface TlvElementWithDiff extends TlvElement {
  diffStatus: DiffStatus;
  differences?: {
    field: string;
    leftValue: string;
    rightValue: string;
  }[];
}

// Result of comparing two TLV structures
interface TlvComparisonResult {
  leftOnly: TlvElementWithDiff[];
  rightOnly: TlvElementWithDiff[];
  modified: TlvElementWithDiff[];
  unchanged: TlvElementWithDiff[];
  differencesCount: number;
  totalElementsCompared: number;
}

/**
 * Compare two TLV parsing results and return the differences
 */
function compareTlvResults(
  left: TlvParsingResult | null, 
  right: TlvParsingResult | null
): TlvComparisonResult {
  // Initialize comparison result
  const result: TlvComparisonResult = {
    leftOnly: [],
    rightOnly: [],
    modified: [],
    unchanged: [],
    differencesCount: 0,
    totalElementsCompared: 0
  };
  
  if (!left || !right) {
    return result;
  }

  // Create maps for quicker lookups
  const leftMap = new Map<string, TlvElement>();
  const rightMap = new Map<string, TlvElement>();
  
  // Populate maps
  left.elements.forEach(element => {
    leftMap.set(element.tag, element);
  });
  
  right.elements.forEach(element => {
    rightMap.set(element.tag, element);
  });
  
  // Find elements in left but not in right (or modified)
  leftMap.forEach((leftElement, tag) => {
    result.totalElementsCompared++;
    
    if (!rightMap.has(tag)) {
      // Element exists only in left
      result.leftOnly.push({
        ...leftElement,
        diffStatus: "removed"
      });
      result.differencesCount++;
    } else {
      // Element exists in both, check if modified
      const rightElement = rightMap.get(tag)!;
      if (leftElement.value !== rightElement.value) {
        // Values are different
        const differences = [{
          field: "value",
          leftValue: leftElement.value,
          rightValue: rightElement.value
        }];
        
        result.modified.push({
          ...leftElement,
          diffStatus: "modified",
          differences
        });
        result.differencesCount++;
      } else {
        // No differences
        result.unchanged.push({
          ...leftElement,
          diffStatus: "unchanged"
        });
      }
    }
  });
  
  // Find elements in right but not in left
  rightMap.forEach((rightElement, tag) => {
    if (!leftMap.has(tag)) {
      result.totalElementsCompared++;
      result.rightOnly.push({
        ...rightElement,
        diffStatus: "added"
      });
      result.differencesCount++;
    }
  });
  
  return result;
}

/**
 * Generate a textual report of the comparison
 */
function generateComparisonReport(
  comparison: TlvComparisonResult,
  leftLabel: string = "Source A",
  rightLabel: string = "Source B"
): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# TLV Comparison Report`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`${leftLabel} vs ${rightLabel}`);
  lines.push(``);
  
  // Summary
  lines.push(`## Summary`);
  lines.push(`- Total elements compared: ${comparison.totalElementsCompared}`);
  lines.push(`- Differences found: ${comparison.differencesCount}`);
  lines.push(`- Elements only in ${leftLabel}: ${comparison.leftOnly.length}`);
  lines.push(`- Elements only in ${rightLabel}: ${comparison.rightOnly.length}`);
  lines.push(`- Modified elements: ${comparison.modified.length}`);
  lines.push(`- Unchanged elements: ${comparison.unchanged.length}`);
  lines.push(``);
  
  // Elements only in left
  if (comparison.leftOnly.length > 0) {
    lines.push(`## Elements only in ${leftLabel}`);
    comparison.leftOnly.forEach(element => {
      const tagInfo = getTagInfo(element.tag);
      lines.push(`- Tag: ${element.tag} (${tagInfo?.name || "Unknown Tag"})`);
      lines.push(`  Value: ${element.value}`);
      if (tagInfo) {
        lines.push(`  Description: ${tagInfo.description || "No description"}`);
      }
      lines.push(``);
    });
  }
  
  // Elements only in right
  if (comparison.rightOnly.length > 0) {
    lines.push(`## Elements only in ${rightLabel}`);
    comparison.rightOnly.forEach(element => {
      const tagInfo = getTagInfo(element.tag);
      lines.push(`- Tag: ${element.tag} (${tagInfo?.name || "Unknown Tag"})`);
      lines.push(`  Value: ${element.value}`);
      if (tagInfo) {
        lines.push(`  Description: ${tagInfo.description || "No description"}`);
      }
      lines.push(``);
    });
  }
  
  // Modified elements
  if (comparison.modified.length > 0) {
    lines.push(`## Modified Elements`);
    comparison.modified.forEach(element => {
      const tagInfo = getTagInfo(element.tag);
      lines.push(`- Tag: ${element.tag} (${tagInfo?.name || "Unknown Tag"})`);
      if (element.differences) {
        element.differences.forEach(diff => {
          lines.push(`  ${diff.field}:`);
          lines.push(`    ${leftLabel}: ${diff.leftValue}`);
          lines.push(`    ${rightLabel}: ${diff.rightValue}`);
        });
      }
      if (tagInfo) {
        lines.push(`  Description: ${tagInfo.description || "No description"}`);
      }
      lines.push(``);
    });
  }
  
  return lines.join('\n');
}

/**
 * Download text as a file
 */
function downloadTextAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Component for displaying a single TLV element with diff highlighting
 */
function TlvDiffElement({ 
  element 
}: { 
  element: TlvElementWithDiff 
}): JSX.Element {
  const tagInfo = getTagInfo(element.tag);
  
  // Determine badge styling based on diff status
  const badgeVariant = (() => {
    switch (element.diffStatus) {
      case "added": return "secondary";
      case "removed": return "destructive";
      case "modified": return "outline";
      default: return "secondary";
    }
  })();
  
  // Determine label based on diff status
  const statusLabel = (() => {
    switch (element.diffStatus) {
      case "added": return "Added";
      case "removed": return "Removed";
      case "modified": return "Modified";
      default: return "Unchanged";
    }
  })();
  
  return (
    <div className={`rounded-md border p-4 mb-2 ${
      element.diffStatus === "unchanged" ? "opacity-70" : "border-2"
    } ${
      element.diffStatus === "added" ? "border-green-500" :
      element.diffStatus === "removed" ? "border-red-500" :
      element.diffStatus === "modified" ? "border-amber-500" : ""
    }`}>
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="font-mono font-bold">{element.tag}</span>
          {tagInfo && <span className="ml-2 text-sm">{tagInfo.name}</span>}
        </div>
        <Badge variant={badgeVariant}>{statusLabel}</Badge>
      </div>
      
      <div className="mt-2">
        <div className="text-sm font-semibold text-muted-foreground">Value:</div>
        <div className="font-mono text-xs overflow-auto break-all">
          {element.value}
        </div>
      </div>
      
      {element.differences && (
        <div className="mt-2 border-t pt-2">
          <div className="text-sm font-semibold text-warning">Differences:</div>
          {element.differences.map((diff, idx) => (
            <div key={idx} className="text-xs mt-1">
              <div className="font-semibold">{diff.field}:</div>
              <div className="pl-2 border-l-2 border-red-300">- {diff.leftValue}</div>
              <div className="pl-2 border-l-2 border-green-300">+ {diff.rightValue}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main TLV Comparison Tool component
 */
export function TlvComparison(): JSX.Element {
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [leftLabel, setLeftLabel] = useState("Source A");
  const [rightLabel, setRightLabel] = useState("Source B");
  const [activeTab, setActiveTab] = useState("comparison");
  const [showUnchanged, setShowUnchanged] = useState(false);
  
  // Parse TLV data
  const leftResult = useMemo(() => {
    try {
      return leftInput ? parseTlv(leftInput, { ignoreUnknownTags: true }) : null;
    } catch (error) {
      return null;
    }
  }, [leftInput]);
  
  const rightResult = useMemo(() => {
    try {
      return rightInput ? parseTlv(rightInput, { ignoreUnknownTags: true }) : null;
    } catch (error) {
      return null;
    }
  }, [rightInput]);
  
  // Compare the TLV results
  const comparisonResult = useMemo(() => {
    return compareTlvResults(leftResult, rightResult);
  }, [leftResult, rightResult]);
  
  // Generate comparison report
  const report = useMemo(() => {
    return generateComparisonReport(comparisonResult, leftLabel, rightLabel);
  }, [comparisonResult, leftLabel, rightLabel]);
  
  // Handle copying report to clipboard
  const handleCopyReport = (): void => {
    navigator.clipboard.writeText(report)
      .then(() => toast.success("Report copied to clipboard"))
      .catch(() => toast.error("Failed to copy report"));
  };
  
  // Handle downloading report
  const handleDownloadReport = (): void => {
    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    downloadTextAsFile(report, `tlv-comparison-report-${timestamp}.txt`);
    toast.success("Report downloaded");
  };
  
  // Handle loading TLV data
  const handleLoadLeft = (data: string): void => {
    setLeftInput(data);
  };
  
  const handleLoadRight = (data: string): void => {
    setRightInput(data);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>TLV Comparison Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left input */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="left-label">Label:</Label>
              <Input
                id="left-label"
                value={leftLabel}
                onChange={(e) => setLeftLabel(e.target.value)}
                className="max-w-[200px]"
              />
              <EnhancedTestsDrawer testType="tlv" onLoad={handleLoadLeft}>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  Load
                </Button>
              </EnhancedTestsDrawer>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="left-input">TLV Data:</Label>
              <textarea
                id="left-input"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder="Enter TLV data in hexadecimal format..."
                value={leftInput}
                onChange={(e) => setLeftInput(e.target.value)}
              />
              {leftResult && (
                <div className="text-xs text-muted-foreground mt-1">
                  {leftResult.elements.length} tags found
                </div>
              )}
            </div>
          </div>
          
          {/* Right input */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="right-label">Label:</Label>
              <Input
                id="right-label"
                value={rightLabel}
                onChange={(e) => setRightLabel(e.target.value)}
                className="max-w-[200px]"
              />
              <EnhancedTestsDrawer testType="tlv" onLoad={handleLoadRight}>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  Load
                </Button>
              </EnhancedTestsDrawer>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="right-input">TLV Data:</Label>
              <textarea
                id="right-input"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder="Enter TLV data in hexadecimal format..."
                value={rightInput}
                onChange={(e) => setRightInput(e.target.value)}
              />
              {rightResult && (
                <div className="text-xs text-muted-foreground mt-1">
                  {rightResult.elements.length} tags found
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Comparison results */}
        {leftResult && rightResult && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Comparison Results
                {comparisonResult.differencesCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {comparisonResult.differencesCount} Differences
                  </Badge>
                )}
                {comparisonResult.differencesCount === 0 && (
                  <Badge variant="secondary" className="ml-2">
                    Identical
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnchanged(!showUnchanged)}
                >
                  {showUnchanged ? "Hide" : "Show"} Unchanged Tags
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyReport}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                >
                  <FileDown className="h-4 w-4 mr-1" /> Download Report
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="removed">
                  Removed ({comparisonResult.leftOnly.length})
                </TabsTrigger>
                <TabsTrigger value="added">
                  Added ({comparisonResult.rightOnly.length})
                </TabsTrigger>
                <TabsTrigger value="modified">
                  Modified ({comparisonResult.modified.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comparison">
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  {comparisonResult.leftOnly.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold mb-2 border-b pb-1">
                        Removed from {leftLabel}
                      </h4>
                      {comparisonResult.leftOnly.map((element, idx) => (
                        <TlvDiffElement key={`left-${element.tag}-${idx}`} element={element} />
                      ))}
                    </div>
                  )}
                  
                  {comparisonResult.rightOnly.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold mb-2 border-b pb-1">
                        Added in {rightLabel}
                      </h4>
                      {comparisonResult.rightOnly.map((element, idx) => (
                        <TlvDiffElement key={`right-${element.tag}-${idx}`} element={element} />
                      ))}
                    </div>
                  )}
                  
                  {comparisonResult.modified.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold mb-2 border-b pb-1">
                        Modified Tags
                      </h4>
                      {comparisonResult.modified.map((element, idx) => (
                        <TlvDiffElement key={`mod-${element.tag}-${idx}`} element={element} />
                      ))}
                    </div>
                  )}
                  
                  {showUnchanged && comparisonResult.unchanged.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold mb-2 border-b pb-1">
                        Unchanged Tags
                      </h4>
                      {comparisonResult.unchanged.map((element, idx) => (
                        <TlvDiffElement key={`unchanged-${element.tag}-${idx}`} element={element} />
                      ))}
                    </div>
                  )}
                  
                  {comparisonResult.differencesCount === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-lg text-success">
                        The TLV data is identical in both sources
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="removed">
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  {comparisonResult.leftOnly.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No tags were removed
                      </p>
                    </div>
                  ) : (
                    comparisonResult.leftOnly.map((element, idx) => (
                      <TlvDiffElement key={`left-${element.tag}-${idx}`} element={element} />
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="added">
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  {comparisonResult.rightOnly.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No tags were added
                      </p>
                    </div>
                  ) : (
                    comparisonResult.rightOnly.map((element, idx) => (
                      <TlvDiffElement key={`right-${element.tag}-${idx}`} element={element} />
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="modified">
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  {comparisonResult.modified.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No tags were modified
                      </p>
                    </div>
                  ) : (
                    comparisonResult.modified.map((element, idx) => (
                      <TlvDiffElement key={`mod-${element.tag}-${idx}`} element={element} />
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
