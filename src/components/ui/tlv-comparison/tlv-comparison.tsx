/**
 * TLV Comparison Component
 *
 * A component that provides side-by-side comparison of two TLV data streams
 */

import { useState, type JSX } from "react";

// Define TLV format type
type TlvFormat = "hex" | "base64" | "unknown";

import { parseTlv, formatTlvAsJson, type TlvParsingResult } from "@/utils/tlv";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight,
  Copy,
  Save,
  RefreshCw,
  ArrowUpFromLine,
} from "lucide-react";
import { CompactTlvDisplay } from "../tlv-viewer/compact-tlv-display";

// Example TLV data for demonstration
const LEFT_EXAMPLE_TLV_DATA =
  "9F2608C1C2C3C4C5C6C7C89F2701009F360200019F10120110A0000F040000000000000000000000FF9F3303E0F8C89505008000E000";

const RIGHT_EXAMPLE_TLV_DATA =
  "9F2608A1B2C3D4E5F6A7B89F2701019F360200039F10120110A0000F040000000000000000000000FF9F3303E0F0C89505008004E000";

export function TlvComparison(): JSX.Element {
  // State for left side
  const [leftParseResult, setLeftParseResult] =
    useState<TlvParsingResult | null>(null);
  const [leftInputHex, setLeftInputHex] = useState<string>("");
  const [leftName, setLeftName] = useState<string>("Source TLV");
  const [leftFormat, setLeftFormat] = useState<TlvFormat>("unknown");

  // State for right side
  const [rightParseResult, setRightParseResult] =
    useState<TlvParsingResult | null>(null);
  const [rightInputHex, setRightInputHex] = useState<string>("");
  const [rightName, setRightName] = useState<string>("Target TLV");
  const [rightFormat, setRightFormat] = useState<TlvFormat>("unknown");

  // Shared state
  const [activeTab, setActiveTab] = useState<string>("input");
  const [showUnknownTags, setShowUnknownTags] = useState(true);
  const [highlightDifferences, setHighlightDifferences] = useState(true);
  const [expandAll, setExpandAll] = useState(false);

  /**
   * Check if a string is a non-empty string
   */
  const isNonEmptyString = (value: unknown): boolean => {
    return typeof value === "string" && value.length > 0;
  };

  /**
   * Check if a string is valid hex (even length and only hex characters)
   */
  const isValidHex = (value: string): boolean => {
    return (
      /^[0-9A-Fa-f]*$/.test(value) && value.length % 2 === 0 && value.length > 0
    );
  };

  /**
   * Check if a string might be Base64
   */
  const mightBeBase64 = (value: string): boolean => {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length > 0;
  };

  /**
   * Convert Base64 to Hex
   */
  const convertBase64ToHex = (base64: string): string => {
    try {
      if (!isNonEmptyString(base64)) {
        throw new Error("Invalid Base64 input");
      }

      // Get binary string from base64
      const binaryString = window.atob(base64);

      // Convert to hex
      let hex = "";
      for (let i = 0; i < binaryString.length; i++) {
        const byte = binaryString.charCodeAt(i);
        hex += byte.toString(16).padStart(2, "0").toUpperCase();
      }

      return hex;
    } catch (e) {
      console.error("Base64 to hex conversion failed:", e);
      return "";
    }
  };

  /**
   * Detect format without setting error
   */
  const detectFormat = (value: string): TlvFormat => {
    // Safety check for non-string values
    if (!isNonEmptyString(value)) {
      return "unknown";
    }

    // Now that we know it's a string, we can safely use string methods
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return "unknown";
    }

    // Check for hex format
    if (isValidHex(trimmedValue)) {
      return "hex";
    }

    // Check for Base64 format
    if (mightBeBase64(trimmedValue)) {
      try {
        // Attempt to decode to verify it's valid Base64
        window.atob(trimmedValue);
        return "base64";
      } catch (e) {
        // Not valid Base64
      }
    }

    return "unknown";
  };

  /**
   * Handle parsing of left TLV data
   */
  const handleLeftParse = (data: {
    value: string;
    format: TlvFormat;
  }): void => {
    let hexString = data.value;
    const format = data.format !== "unknown" ? data.format : detectFormat(data.value);
    
    // Convert base64 to hex if needed
    if (format === "base64") {
      hexString = convertBase64ToHex(data.value);
    }
    
    setLeftInputHex(data.value);
    setLeftFormat(format);

    try {
      // Parse the input hex string
      const result = parseTlv(hexString);

      // Update the state with the parse result
      setLeftParseResult(result);

      // Show toast notifications
      if (result.errors.length > 0) {
        toast.error(
          `Parsing completed with ${result.errors.length} error${
            result.errors.length === 1 ? "" : "s"
          }`
        );
      } else {
        toast.success(
          `Successfully parsed ${result.elements.length} TLV element${
            result.elements.length === 1 ? "" : "s"
          }`
        );
      }

      // If we have both sides parsed, switch to results tab
      if (rightParseResult) {
        setActiveTab("results");
      }
    } catch (error) {
      toast.error(
        "Failed to parse left TLV data: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  /**
   * Handle parsing of right TLV data
   */
  const handleRightParse = (data: {
    value: string;
    format: TlvFormat;
  }): void => {
    let hexString = data.value;
    const format = data.format !== "unknown" ? data.format : detectFormat(data.value);
    
    // Convert base64 to hex if needed
    if (format === "base64") {
      hexString = convertBase64ToHex(data.value);
    }
    
    setRightInputHex(data.value);
    setRightFormat(format);

    try {
      // Parse the input hex string
      const result = parseTlv(hexString);

      // Update the state with the parse result
      setRightParseResult(result);

      // Show toast notifications
      if (result.errors.length > 0) {
        toast.error(
          `Parsing completed with ${result.errors.length} error${
            result.errors.length === 1 ? "" : "s"
          }`
        );
      } else {
        toast.success(
          `Successfully parsed ${result.elements.length} TLV element${
            result.elements.length === 1 ? "" : "s"
          }`
        );
      }

      // If we have both sides parsed, switch to results tab
      if (leftParseResult) {
        setActiveTab("results");
      }
    } catch (error) {
      toast.error(
        "Failed to parse right TLV data: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  /**
   * Load example data for both sides
   */
  const handleLoadExamples = (): void => {
    setLeftInputHex(LEFT_EXAMPLE_TLV_DATA);
    setRightInputHex(RIGHT_EXAMPLE_TLV_DATA);
    setLeftFormat("hex");
    setRightFormat("hex");
    handleLeftParse({ value: LEFT_EXAMPLE_TLV_DATA, format: "hex" });
    handleRightParse({ value: RIGHT_EXAMPLE_TLV_DATA, format: "hex" });
  };

  /**
   * Swap left and right data
   */
  const handleSwapSides = (): void => {
    const tempResult = leftParseResult;
    const tempInput = leftInputHex;
    const tempName = leftName;
    const tempFormat = leftFormat;

    setLeftParseResult(rightParseResult);
    setLeftInputHex(rightInputHex);
    setLeftName(rightName);
    setLeftFormat(rightFormat);

    setRightParseResult(tempResult);
    setRightInputHex(tempInput);
    setRightName(tempName);
    setRightFormat(tempFormat);
  };

  /**
   * Filter out unknown tags if option is disabled
   */
  const filterUnknownTags = (
    result: TlvParsingResult | null
  ): TlvParsingResult | null => {
    if (!result || showUnknownTags) return result;

    // Function to filter elements recursively
    const filterElements = (elements: TlvParsingResult["elements"]) => {
      return elements
        .filter((element) => !element.isUnknown)
        .map((element) => ({
          ...element,
          // Filter children recursively if they exist
          children: element.children
            ? filterElements(element.children)
            : undefined,
        }));
    };

    return {
      ...result,
      elements: filterElements(result.elements),
    };
  };

  return (
    <>
      {/* Main content */}
      <Card className="w-full shadow-md">
        <CardHeader className="pb-2">
          <CardTitle>TLV Comparison</CardTitle>
          <CardDescription>
            Compare two TLV data streams side by side to identify differences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs for input and results */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>

              {/* Options Panel */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-unknown-tags"
                    checked={showUnknownTags}
                    onCheckedChange={setShowUnknownTags}
                  />
                  <Label htmlFor="show-unknown-tags">Show unknown tags</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="highlight-diff"
                    checked={highlightDifferences}
                    onCheckedChange={setHighlightDifferences}
                  />
                  <Label htmlFor="highlight-diff">Highlight differences</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="expand-all"
                    checked={expandAll}
                    onCheckedChange={setExpandAll}
                  />
                  <Label htmlFor="expand-all">Expand all</Label>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSwapSides}
                  title="Swap sides"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadExamples}
                >
                  Load Examples
                </Button>
              </div>
            </div>

            {/* Input Tab Content */}
            <TabsContent value="input" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Left Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Source TLV</Label>
                    {leftFormat !== "unknown" && (
                      <Badge variant="outline" className="font-mono">
                        {leftFormat.toUpperCase()} detected
                      </Badge>
                    )}
                  </div>
                  <textarea
                    className="w-full min-h-[200px] p-2 font-mono text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={leftInputHex}
                    onChange={(e) => {
                      setLeftInputHex(e.target.value);
                      setLeftFormat(detectFormat(e.target.value));
                    }}
                    placeholder="Enter source TLV data (hex or base64)..."
                  />
                </div>

                {/* Right Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Target TLV</Label>
                    {rightFormat !== "unknown" && (
                      <Badge variant="outline" className="font-mono">
                        {rightFormat.toUpperCase()} detected
                      </Badge>
                    )}
                  </div>
                  <textarea
                    className="w-full min-h-[200px] p-2 font-mono text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={rightInputHex}
                    onChange={(e) => {
                      setRightInputHex(e.target.value);
                      setRightFormat(detectFormat(e.target.value));
                    }}
                    placeholder="Enter target TLV data (hex or base64)..."
                  />
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <Button 
                  onClick={() => {
                    // Parse both TLV inputs simultaneously
                    if (leftInputHex) {
                      const leftDetectedFormat = detectFormat(leftInputHex);
                      if (leftDetectedFormat !== "unknown") {
                        handleLeftParse({ value: leftInputHex, format: leftDetectedFormat });
                      } else {
                        toast.error("Invalid format detected in Source TLV");
                      }
                    }
                    
                    if (rightInputHex) {
                      const rightDetectedFormat = detectFormat(rightInputHex);
                      if (rightDetectedFormat !== "unknown") {
                        handleRightParse({ value: rightInputHex, format: rightDetectedFormat });
                      } else {
                        toast.error("Invalid format detected in Target TLV");
                      }
                    }
                  }}
                  className="px-8"
                >
                  Compare TLV Data
                </Button>
              </div>
            </TabsContent>

            {/* Results Tab Content */}
            <TabsContent value="results" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Left Results */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">{leftName}</h3>
                  <CompactTlvDisplay
                    result={filterUnknownTags(leftParseResult)}
                    onRefresh={() =>
                      handleLeftParse({ value: leftInputHex, format: leftFormat })
                    }
                    expandAll={expandAll}
                  />
                </div>

                {/* Right Results */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">{rightName}</h3>
                  <CompactTlvDisplay
                    result={filterUnknownTags(rightParseResult)}
                    onRefresh={() =>
                      handleRightParse({ value: rightInputHex, format: rightFormat })
                    }
                    expandAll={expandAll}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2">
        <Button
          variant="default"
          size="icon"
          className="rounded-full"
          onClick={handleLoadExamples}
          title="Load Example Data"
        >
          <ArrowUpFromLine className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          className="rounded-full"
          onClick={() => {
            if (leftParseResult) handleLeftParse({ value: leftInputHex, format: leftFormat });
            if (rightParseResult) handleRightParse({ value: rightInputHex, format: rightFormat });
          }}
          title="Refresh Both"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          className="rounded-full"
          onClick={() => {
            // Save comparison functionality would go here
            toast.info("Save feature coming soon");
          }}
          title="Save Comparison"
        >
          <Save className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          className="rounded-full"
          onClick={() => {
            // Copy comparison results functionality would go here
            navigator.clipboard.writeText(
              JSON.stringify(
                {
                  left: leftParseResult
                    ? formatTlvAsJson({
                        elements: leftParseResult.elements,
                        errors: leftParseResult.errors,
                        rawHex: leftParseResult.rawHex,
                      })
                    : null,
                  right: rightParseResult
                    ? formatTlvAsJson({
                        elements: rightParseResult.elements,
                        errors: rightParseResult.errors,
                        rawHex: rightParseResult.rawHex,
                      })
                    : null,
                },
                null,
                2
              )
            );
            toast.success("Comparison copied to clipboard as JSON");
          }}
          title="Copy as JSON"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
