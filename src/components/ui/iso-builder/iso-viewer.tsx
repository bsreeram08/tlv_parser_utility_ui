/**
 * ISO 8583 Viewer Component
 *
 * A component that combines ISO 8583 input and display functionality
 * to provide a complete ISO 8583 parsing and viewing experience.
 */

import { useState, type JSX, useCallback } from "react";
import { IsoInput } from "./iso-input";
import { IsoDisplay } from "./iso-display";
import {
  type Iso8583ParseResult,
  parseIso8583,
  formatIso8583AsJson,
  Iso8583Version,
} from "@/utils/iso8583";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingActionButton } from "@/components/ui/fab";
import { toast } from "sonner";

// Example ISO 8583 message for demonstration
const EXAMPLE_ISO_MESSAGE =
  "0100722000000000000004000000000000012345678901234567890610000000000001234567890123456789012345678901234567";

export function IsoViewer(): JSX.Element {
  const [parseResult, setParseResult] = useState<Iso8583ParseResult | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("input");
  const [inputMessage, setInputMessage] = useState<string>("");

  /**
   * Handle parsing of ISO 8583 message
   */
  const handleParse = (
    message: string,
    options: {
      version: Iso8583Version;
      binaryBitmap: boolean;
      validateFields: boolean;
    }
  ): void => {
    setInputMessage(message);

    try {
      // Parse the input message
      const result = parseIso8583(message, {
        version: options.version,
        binaryBitmap: options.binaryBitmap,
        validateFields: options.validateFields,
      });

      // Update the state with the parse result
      setParseResult(result);

      // Show toast notifications
      if (result.errors.length > 0) {
        toast.error(
          `Parsing completed with ${result.errors.length} error${
            result.errors.length === 1 ? "" : "s"
          }`
        );
      } else {
        const fieldCount = Object.keys(result.fields).length;
        toast.success(
          `Successfully parsed ISO 8583 message with ${fieldCount} field${
            fieldCount === 1 ? "" : "s"
          }`
        );
      }

      // Switch to the results tab
      setActiveTab("results");
    } catch (error) {
      toast.error(
        "Failed to parse ISO 8583 message: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  /**
   * Load example ISO 8583 message
   */
  const handleLoadExample = useCallback(() => {
    setInputMessage(EXAMPLE_ISO_MESSAGE);
    handleParse(EXAMPLE_ISO_MESSAGE, {
      version: Iso8583Version.V1987,
      binaryBitmap: false,
      validateFields: true,
    });
  }, []);

  /**
   * Copy results to clipboard
   */
  const handleCopyResults = useCallback(() => {
    if (parseResult) {
      navigator.clipboard
        .writeText(JSON.stringify(formatIso8583AsJson(parseResult), null, 2))
        .then(() => toast.success("Results copied to clipboard"))
        .catch(() => toast.error("Failed to copy results"));
    }
  }, [parseResult]);

  /**
   * Export results as JSON
   */
  const handleExportJson = useCallback(() => {
    if (parseResult) {
      const jsonData = JSON.stringify(
        formatIso8583AsJson(parseResult),
        null,
        2
      );
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "iso8583-message.json";
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  }, [parseResult]);

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>ISO 8583 Message Parser</CardTitle>
          <CardDescription>
            Parse and analyze ISO 8583 financial transaction messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="mt-0">
              <IsoInput onParse={handleParse} initialValue={inputMessage} />
            </TabsContent>

            <TabsContent value="results" className="mt-0">
              <IsoDisplay result={parseResult} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <FloatingActionButton
        errors={parseResult?.errors || []}
        hasResults={!!parseResult}
        onShowExample={handleLoadExample}
        onCopyResults={handleCopyResults}
        onExportJson={handleExportJson}
      />
    </>
  );
}
