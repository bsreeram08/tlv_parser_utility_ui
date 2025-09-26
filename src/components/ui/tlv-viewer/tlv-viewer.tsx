/**
 * TLV Viewer Component
 *
 * A component that combines TLV input and display functionality
 * to provide a complete TLV parsing and viewing experience.
 */

import { useState, type JSX, useCallback, useEffect } from "react";
import { sanitizeSelectValues } from "@/utils/select-helpers";
import { TlvInput } from "./tlv-input";
import { CompactTlvDisplay } from "./compact-tlv-display";
import { type TlvParsingResult, parseTlv, formatTlvAsJson } from "@/utils/tlv";
import { editTlvValue } from "@/utils/tlv/tlv-edit";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingActionButton } from "@/components/ui/fab";
import { SaveDialog } from "@/components/ui/save-dialog";
import { EnhancedTestsDrawer } from "@/components/ui/enhanced-tests-drawer";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { db } from "@/utils/db/db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, FolderOpen, HelpCircle } from "lucide-react";
import { base64ToBase16 } from "@/utils/base64-hex";
import { runTlvEditTests } from "@/tests/tlv-edit.test";

// Example TLV data for demonstration
const EXAMPLE_TLV_DATA =
  "9F2608C1C2C3C4C5C6C7C89F2701009F360200019F10120110A0000F040000000000000000000000FF9F3303E0F8C89505008000E0009A031905139C0100";

export function TlvViewer(): JSX.Element {
  const [parseResult, setParseResult] = useState<TlvParsingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("viewer");
  const [inputHex, setInputHex] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showUnknownTags, setShowUnknownTags] = useState(true);
  const [undoStack, setUndoStack] = useState<string[]>([]); // previous raw hex values
  const [lastEditedPath, setLastEditedPath] = useState<string | null>(null);

  // Load last input & prefs on mount
  useEffect(() => {
    // Initialization only
    if (!parseResult && !inputHex) {
      try {
        const last = localStorage.getItem("lastTlvInput");
        if (last) {
          setInputHex(last);
          handleParse(last);
        }
        const pref = localStorage.getItem("showUnknownTags");
        if (pref) setShowUnknownTags(pref === "true");
      } catch {
        /* ignore */
      }
    }
  }, [parseResult, inputHex]);

  useEffect(() => {
    const listener = () => {
      if (inputHex) {
        handleParse(inputHex);
        toast.info("Custom tag registry updated; view refreshed");
      }
    };
    document.addEventListener("CustomTagRegistryUpdated", listener);
    return () =>
      document.removeEventListener("CustomTagRegistryUpdated", listener);
  }, [inputHex]);

  /**
   * Handle parsing of TLV data
   */
  function handleParse(hexString: string): void {
    setInputHex(hexString);

    try {
      // Parse the input hex string
      const result = parseTlv(hexString);

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
        toast.success(
          `Successfully parsed ${result.elements.length} TLV element${
            result.elements.length === 1 ? "" : "s"
          }`
        );
      }

      // Switch to the results tab
      setActiveTab("results");
      // persist last input
      try {
        localStorage.setItem("lastTlvInput", hexString);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      toast.error(
        "Failed to parse TLV data: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Save the current TLV test to the database
   */
  const handleSave = async (
    name: string,
    description: string,
    tags: string[]
  ) => {
    if (!inputHex) {
      toast.error("Nothing to save. Please enter TLV data first.");
      return;
    }

    try {
      await db.saveTlvTest({
        name,
        description,
        tags,
        tlvData: inputHex,
        date: new Date(),
        category: "Manual", // Default category
        source: "Manual",
        lastAccessed: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error saving TLV test:", error);
      throw error;
    }
  };

  /**
   * Load a saved TLV test
   */
  const handleLoad = (tlvData: string, options?: Record<string, unknown>) => {
    // Sanitize any options that might contain empty strings
    const safeOptions = options ? sanitizeSelectValues(options) : undefined;

    setInputHex(tlvData);
    handleParse(tlvData);

    // We don't need to update lastAccessed timestamp here
    // as it's already handled in the TestsDrawer component

    console.log("Loaded TLV data with safe options:", safeOptions);
  };

  // Register keyboard shortcuts
  useHotkeys(
    "ctrl+s, command+s",
    (event) => {
      event.preventDefault();
      setSaveDialogOpen(true);
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "ctrl+o, command+o",
    (event) => {
      event.preventDefault();
      // The drawer will be opened by clicking the Load button
      document.getElementById("load-tlv-button")?.click();
    },
    { enableOnFormTags: true }
  );

  /**
   * Load example TLV data
   */
  const handleLoadExample = useCallback(() => {
    setInputHex(EXAMPLE_TLV_DATA);
    handleParse(EXAMPLE_TLV_DATA);
  }, []);

  /**
   * Copy results to clipboard
   */
  const handleCopyResults = useCallback(() => {
    if (parseResult) {
      navigator.clipboard
        .writeText(formatTlvAsJson(parseResult) as unknown as string)
        .then(() => toast.success("Results copied to clipboard"))
        .catch(() => toast.error("Failed to copy results"));
    }
  }, [parseResult]);

  /**
   * Edit a specific element's value by path (colon-separated) and reparse
   */
  const handleEditElement = useCallback(
    (path: string, newValueHex: string) => {
      if (!parseResult) {
        toast.error("No parse result available to edit");
        return;
      }
      const originalRaw = parseResult.rawHex;
      let newRaw: string;
      try {
        newRaw = editTlvValue(parseResult.rawHex, path, newValueHex);
      } catch (e) {
        toast.error(
          `Edit failed: ${e instanceof Error ? e.message : String(e)}`
        );
        return;
      }

      // Update input and reparse
      setUndoStack((prev) => {
        const next = [...prev, originalRaw];
        // limit stack size
        if (next.length > 20) next.shift();
        return next;
      });
      setInputHex(newRaw);
      handleParse(newRaw);
      toast.success(`Updated ${path}`);
      setLastEditedPath(path);
      // auto-clear highlight after 4s
      setTimeout(() => setLastEditedPath((p) => (p === path ? null : p)), 4000);
    },
    [parseResult]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy.pop() as string;
      setInputHex(last);
      handleParse(last);
      toast.success("Reverted last edit");
      return copy;
    });
  }, []);

  const handleRunInternalTests = useCallback(() => {
    try {
      const msg = runTlvEditTests();
      toast.success(msg);
    } catch (e) {
      toast.error(
        "Internal tests failed: " + (e instanceof Error ? e.message : String(e))
      );
      console.error(e);
    }
  }, []);

  /**
   * Export results as JSON
   */
  const handleExportJson = useCallback(() => {
    if (parseResult) {
      const jsonData = JSON.stringify(formatTlvAsJson(parseResult), null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "tlv-data.json";
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  }, [parseResult]);

  /**
   * Get the count of known tags in the result
   */
  const getKnownTagsCount = (elements: TlvParsingResult["elements"]) => {
    return elements.filter((element) => !element.isUnknown).length;
  };

  /**
   * Filter out unknown tags from the parsing result
   */
  const filterUnknownTags = (
    result: TlvParsingResult | null
  ): TlvParsingResult | null => {
    if (!result) return null;

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
      <Card className="w-full mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>EMV Tag Parser</CardTitle>
              <CardDescription>
                Parse and analyze Tag-Length-Value (TLV) data structures used in
                EMV payment applications
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Keyboard shortcuts:</span>{" "}
                  Ctrl+S/⌘+S to save, Ctrl+O/⌘+O to load
                </div>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Save className="h-4 w-4" /> Save
              </Button>

              <EnhancedTestsDrawer testType="tlv" onLoad={handleLoad}>
                <Button
                  id="load-tlv-button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <FolderOpen className="h-4 w-4" /> Load
                </Button>
              </EnhancedTestsDrawer>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="viewer">Input</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="viewer" className="mt-0">
              <TlvInput
                onParse={(v) => {
                  if (v.format === "base64") {
                    const hex = base64ToBase16(v.value);
                    handleParse(hex);
                  } else {
                    handleParse(v.value);
                  }
                }}
                initialValue={inputHex}
              />
            </TabsContent>

            <TabsContent value="results" className="mt-0">
              <>
                {/* Controls for filtering tags */}
                <div className="mb-4 flex items-center justify-between bg-muted/30 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-unknown-tags"
                        checked={showUnknownTags}
                        onCheckedChange={(v) => {
                          setShowUnknownTags(v);
                          try {
                            localStorage.setItem(
                              "showUnknownTags",
                              v ? "true" : "false"
                            );
                          } catch (e) {
                            /* ignore */
                          }
                        }}
                      />
                      <Label htmlFor="show-unknown-tags">
                        Show Unknown Tags
                      </Label>
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <HelpCircle className="h-3 w-3" />
                      <span>
                        {showUnknownTags
                          ? "Displaying all tags, including unknown ones"
                          : "Hidden unknown tags"}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {parseResult && (
                      <span>
                        {parseResult.elements.length} tag
                        {parseResult.elements.length !== 1 ? "s" : ""} found
                        {!showUnknownTags && (
                          <>
                            {" "}
                            ({getKnownTagsCount(parseResult.elements)} known)
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <CompactTlvDisplay
                  result={
                    showUnknownTags
                      ? parseResult
                      : filterUnknownTags(parseResult)
                  }
                  onRefresh={() => handleParse(inputHex)}
                  onEditElement={handleEditElement}
                  highlightPath={lastEditedPath || undefined}
                />
              </>
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
        onSave={() => setSaveDialogOpen(true)}
        onUndo={undoStack.length > 0 ? handleUndo : undefined}
        canUndo={undoStack.length > 0}
        onRunInternalTests={handleRunInternalTests}
      />

      {/* Save Dialog */}
      <SaveDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSave}
        title="Save TLV Test"
        description="Save your current TLV test for future reference"
      />
    </>
  );
}
