/**
 * TLV Viewer Component
 *
 * A component that combines TLV input and display functionality
 * to provide a complete TLV parsing and viewing experience.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
} from "react";
import { sanitizeSelectValues } from "@/utils/select-helpers";
import { TlvInput } from "./tlv-input";
import { CompactTlvDisplay } from "./compact-tlv-display";
import { TlvByteMap } from "./tlv-byte-map";
import { AddTagDialog } from "./add-tag-dialog";
import { TlvLintPanel } from "@/components/ui/emv-checks/tlv-lint-panel";
import { type TlvParsingResult, parseTlv, formatTlvAsJson } from "@/utils/tlv";
import {
  deleteTlvElement,
  editTlvValue,
  insertTlvElement,
} from "@/utils/tlv/tlv-edit";
import {
  Card,
  CardContent,
  CardHeader,
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
import {
  Save,
  FolderOpen,
  HelpCircle,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { base64ToBase16 } from "@/utils/base64-hex";
import { runTlvEditTests } from "@/tests/tlv-edit.test";
import { runCryptoTests, runTagBuilderTests } from "@/tests/crypto.test";
import { useToolPanelContext } from "@/components/workspace/tool-panel-context";

// Example TLV data for demonstration
const EXAMPLE_TLV_DATA =
  "9F2608C1C2C3C4C5C6C7C89F2701009F360200019F10120110A0000F040000000000000000000000FF9F3303E0F8C89505008000E0009A031905139C0100";

function AnimatedParseErrors({
  errors,
}: {
  errors: TlvParsingResult["errors"];
}): JSX.Element | null {
  const [retainedErrors, setRetainedErrors] = useState(errors);
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }

    if (errors.length > 0) {
      setRetainedErrors(errors);
      setExiting(false);
      return;
    }

    if (retainedErrors.length === 0) {
      setExiting(false);
      return;
    }

    setExiting(true);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setRetainedErrors([]);
      setExiting(false);
    }, reducedMotion ? 100 : 90);

    return () => {
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
  }, [errors, retainedErrors.length]);

  const visibleErrors = errors.length > 0 ? errors : retainedErrors;
  if (visibleErrors.length === 0) return null;

  return (
    <div
      className="tlv-parse-errors mb-2 space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2"
      data-exiting={errors.length === 0 && exiting}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {visibleErrors.length} parsing error
        {visibleErrors.length === 1 ? "" : "s"}
      </div>
      {visibleErrors.map((error, index) => (
        <div
          key={`${error.message}-${index}`}
          className="text-xs text-muted-foreground"
        >
          {error.offset !== undefined && (
            <span className="font-mono">
              byte {Math.floor(error.offset / 2)}:{" "}
            </span>
          )}
          {error.message}
        </div>
      ))}
    </div>
  );
}

export function TlvViewer(): JSX.Element {
  const { instanceId, active: panelActive } = useToolPanelContext();
  const loadButtonId = `${instanceId}-load-tlv`;
  const showUnknownId = `${instanceId}-show-unknown-tags`;
  const [parseResult, setParseResult] = useState<TlvParsingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("viewer");
  const [inputHex, setInputHex] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addTagOpen, setAddTagOpen] = useState(false);
  const [showUnknownTags, setShowUnknownTags] = useState(true);
  const [undoStack, setUndoStack] = useState<string[]>([]); // previous raw hex values
  const [lastEditedPath, setLastEditedPath] = useState<string | null>(null);
  const mutationFeedbackFrame = useRef<number | null>(null);
  const mutationFeedbackTimer = useRef<number | null>(null);

  const showMutationFeedback = useCallback((path: string) => {
    if (mutationFeedbackFrame.current !== null) {
      window.cancelAnimationFrame(mutationFeedbackFrame.current);
    }
    if (mutationFeedbackTimer.current !== null) {
      window.clearTimeout(mutationFeedbackTimer.current);
    }

    // Clear first so editing the same tag twice still retriggers the transition.
    setLastEditedPath(null);
    mutationFeedbackFrame.current = window.requestAnimationFrame(() => {
      setLastEditedPath(path);
      mutationFeedbackTimer.current = window.setTimeout(() => {
        setLastEditedPath((current) => (current === path ? null : current));
      }, 900);
    });
  }, []);

  useEffect(
    () => () => {
      if (mutationFeedbackFrame.current !== null) {
        window.cancelAnimationFrame(mutationFeedbackFrame.current);
      }
      if (mutationFeedbackTimer.current !== null) {
        window.clearTimeout(mutationFeedbackTimer.current);
      }
    },
    []
  );

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
    { enableOnFormTags: true, enabled: panelActive }
  );

  useHotkeys(
    "ctrl+o, command+o",
    (event) => {
      event.preventDefault();
      // The drawer will be opened by clicking the Load button
      document.getElementById(loadButtonId)?.click();
    },
    { enableOnFormTags: true, enabled: panelActive }
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
   * Apply a structural change to the payload: push the previous raw hex onto
   * the undo stack, reparse, and highlight the affected path. Shared by the
   * value editor, the delete action and Add Tag so all three are undoable.
   */
  const applyMutation = useCallback(
    (
      mutate: (rawHex: string) => string,
      successMessage: string,
      highlightPath?: string
    ) => {
      if (!parseResult) {
        toast.error("No parse result available to edit");
        return;
      }
      const originalRaw = parseResult.rawHex;
      let newRaw: string;
      try {
        newRaw = mutate(originalRaw);
      } catch (e) {
        toast.error(
          `Edit failed: ${e instanceof Error ? e.message : String(e)}`
        );
        return;
      }

      setUndoStack((prev) => {
        const next = [...prev, originalRaw];
        // limit stack size
        if (next.length > 20) next.shift();
        return next;
      });
      setInputHex(newRaw);
      handleParse(newRaw);
      toast.success(successMessage);

      if (highlightPath) {
        showMutationFeedback(highlightPath);
      }
    },
    [parseResult, showMutationFeedback]
  );

  /**
   * Edit a specific element's value by path (colon-separated) and reparse
   */
  const handleEditElement = useCallback(
    (path: string, newValueHex: string) => {
      applyMutation(
        (raw) => editTlvValue(raw, path, newValueHex),
        `Updated ${path}`,
        path
      );
    },
    [applyMutation]
  );

  /**
   * Delete an element by path and reparse
   */
  const handleDeleteElement = useCallback(
    (path: string) => {
      applyMutation((raw) => deleteTlvElement(raw, path), `Deleted ${path}`);
    },
    [applyMutation]
  );

  /**
   * Append a new primitive element, optionally inside a constructed tag
   */
  const handleAddElement = useCallback(
    (parentPath: string | undefined, tag: string, valueHex: string) => {
      const fullPath = parentPath ? `${parentPath}:${tag}` : tag;
      // An empty payload has nothing to mutate, so seed it directly.
      if (!parseResult || parseResult.rawHex.length === 0) {
        try {
          const seeded = insertTlvElement("", undefined, tag, valueHex);
          setInputHex(seeded);
          handleParse(seeded);
          toast.success(`Added ${tag}`);
          showMutationFeedback(tag);
        } catch (e) {
          toast.error(
            `Add failed: ${e instanceof Error ? e.message : String(e)}`
          );
        }
        return;
      }
      applyMutation(
        (raw) => insertTlvElement(raw, parentPath, tag, valueHex),
        `Added ${fullPath}`,
        fullPath
      );
    },
    [applyMutation, parseResult, showMutationFeedback]
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
      // Run every suite so the FAB is a real check, not just the TLV one.
      const messages = [runTlvEditTests(), runCryptoTests(), runTagBuilderTests()];
      toast.success(messages.join(" · "));
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
        <CardHeader className="pb-0">
          <div className="flex justify-end gap-1.5">
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
                  id={loadButtonId}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <FolderOpen className="h-4 w-4" /> Load
                </Button>
              </EnhancedTestsDrawer>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-2 grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="viewer">Input</TabsTrigger>
              <TabsTrigger value="results">
                Results
                {parseResult && parseResult.elements.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {parseResult.elements.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="bytes">Byte Map</TabsTrigger>
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
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={showUnknownId}
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
                      <Label htmlFor={showUnknownId}>
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

                  <div className="flex items-center gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setAddTagOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Add Tag
                    </Button>
                  </div>
                </div>

                {/* Parse errors, surfaced inline instead of only as a toast */}
                <AnimatedParseErrors errors={parseResult?.errors || []} />

                {/* EMV plausibility checks over the whole payload */}
                <TlvLintPanel result={parseResult} />

                <CompactTlvDisplay
                  result={
                    showUnknownTags
                      ? parseResult
                      : filterUnknownTags(parseResult)
                  }
                  onRefresh={() => handleParse(inputHex)}
                  onEditElement={handleEditElement}
                  onDeleteElement={handleDeleteElement}
                  highlightPath={lastEditedPath || undefined}
                />
              </>
            </TabsContent>

            <TabsContent value="bytes" className="mt-0">
              <TlvByteMap result={parseResult} />
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

      {/* Add Tag Dialog */}
      <AddTagDialog
        isOpen={addTagOpen}
        onClose={() => setAddTagOpen(false)}
        result={parseResult}
        onAdd={handleAddElement}
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
