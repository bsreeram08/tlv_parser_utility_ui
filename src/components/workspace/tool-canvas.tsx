import {
  Suspense,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type JSX,
  type ReactNode,
} from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns2,
  CopyPlus,
  Fullscreen,
  GripVertical,
  Keyboard,
  LayoutDashboard,
  List,
  Minimize2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalculatorTool } from "@/tools/calculator-tool";
import { getToolOrDefault } from "@/tools/registry";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToolPanelProvider } from "./tool-panel-provider";

export type ToolPanel = {
  id: string;
  toolId: string;
  collapsed: boolean;
  archived: boolean;
  wide: boolean;
};

type ViewMode = "split" | "tabs";

type ToolCanvasProps = {
  panels: ToolPanel[];
  activePanelId: string | null;
  onActivePanelChange: (panelId: string | null) => void;
  onAdd: (toolId: string) => void;
  onDuplicate: (panelId: string) => void;
  onToggleCollapsed: (panelId: string) => void;
  onArchive: (panelId: string) => void;
  onRestore: (panelId: string) => void;
  onClose: (panelId: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onSetAllCollapsed: (collapsed: boolean) => void;
};

const SHORTCUTS = [
  ["⌥← / ⌥→", "Previous / next pane"],
  ["⌥⇧← / ⌥⇧→", "Move pane left / right"],
  ["⌥1…9", "Focus pane by number"],
  ["⌥↩", "Zoom active pane"],
  ["⌥T", "Toggle split / tabs"],
  ["⌥- / =", "Collapse / expand active pane"],
  ["⌥D", "Duplicate active pane"],
  ["⌥A", "Archive active pane"],
  ["⌥W", "Close active pane"],
  ["⌘K", "Add a tool"],
] as const;

export function ToolCanvas({
  panels,
  activePanelId,
  onActivePanelChange,
  onAdd,
  onDuplicate,
  onToggleCollapsed,
  onArchive,
  onRestore,
  onClose,
  onReorder,
  onSetAllCollapsed,
}: ToolCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointerDropSnapshot = useRef<Map<string, number> | null>(null);
  const keyboardPaneActivation = useRef(false);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [dragOverPanelId, setDragOverPanelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem("payment-utilities-canvas-view") === "tabs"
        ? "tabs"
        : "split";
    } catch {
      return "split";
    }
  });
  const [zoomedPanelId, setZoomedPanelId] = useState<string | null>(null);
  const openPanels = useMemo(
    () => panels.filter((panel) => !panel.archived),
    [panels]
  );
  const archivedPanels = useMemo(
    () => panels.filter((panel) => panel.archived),
    [panels]
  );
  const activePanel =
    openPanels.find((panel) => panel.id === activePanelId) ?? openPanels[0];
  const visiblePanelIds = useMemo(() => {
    if (zoomedPanelId) return new Set([zoomedPanelId]);
    if (viewMode === "tabs") {
      return new Set(activePanel ? [activePanel.id] : []);
    }
    return new Set(openPanels.map((panel) => panel.id));
  }, [activePanel, openPanels, viewMode, zoomedPanelId]);
  const [mountedPanelIds, setMountedPanelIds] = useState<Set<string>>(
    () => new Set(visiblePanelIds)
  );

  useEffect(() => {
    try {
      localStorage.setItem("payment-utilities-canvas-view", viewMode);
    } catch {
      // View persistence is optional.
    }
  }, [viewMode]);

  useEffect(() => {
    if (!activePanel && activePanelId !== null) onActivePanelChange(null);
    else if (activePanel && activePanel.id !== activePanelId) {
      onActivePanelChange(activePanel.id);
    }
  }, [activePanel, activePanelId, onActivePanelChange]);

  useEffect(() => {
    if (zoomedPanelId && !openPanels.some((panel) => panel.id === zoomedPanelId)) {
      setZoomedPanelId(null);
    }
  }, [openPanels, zoomedPanelId]);

  useEffect(() => {
    setMountedPanelIds((current) => {
      const validPanelIds = new Set(panels.map((panel) => panel.id));
      const next = new Set(
        [...current].filter((panelId) => validPanelIds.has(panelId))
      );
      for (const panelId of visiblePanelIds) next.add(panelId);

      if (
        next.size === current.size &&
        [...next].every((panelId) => current.has(panelId))
      ) {
        return current;
      }
      return next;
    });
  }, [panels, visiblePanelIds]);

  useEffect(() => {
    if (!activePanelId) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const behavior =
      keyboardPaneActivation.current || reducedMotion ? "auto" : "smooth";
    keyboardPaneActivation.current = false;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`tool-panel-${activePanelId}`)
        ?.scrollIntoView({ behavior, block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePanelId, openPanels.length, viewMode, zoomedPanelId]);

  const activateAt = (index: number) => {
    if (openPanels.length === 0) return;
    const normalized = (index + openPanels.length) % openPanels.length;
    keyboardPaneActivation.current =
      openPanels[normalized].id !== activePanelId;
    onActivePanelChange(openPanels[normalized].id);
  };

  const moveActive = (offset: number) => {
    const index = openPanels.findIndex((panel) => panel.id === activePanel?.id);
    activateAt((index < 0 ? 0 : index) + offset);
  };

  const reorderActive = (offset: number) => {
    const index = openPanels.findIndex((panel) => panel.id === activePanel?.id);
    if (index < 0) return;
    const target = openPanels[index + offset];
    if (target && activePanel) onReorder(activePanel.id, target.id);
  };

  const toggleZoom = () => {
    if (!activePanel) return;
    setZoomedPanelId((current) =>
      current === activePanel.id ? null : activePanel.id
    );
  };

  const onCanvasKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.matches("input, textarea, select") ||
      target?.isContentEditable ||
      !event.altKey
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    if (event.shiftKey && (key === "arrowright" || key === "]")) {
      event.preventDefault();
      reorderActive(1);
    } else if (event.shiftKey && (key === "arrowleft" || key === "[")) {
      event.preventDefault();
      reorderActive(-1);
    } else if (/^[1-9]$/.test(key)) {
      event.preventDefault();
      activateAt(Number(key) - 1);
    } else if (key === "arrowright" || key === "]") {
      event.preventDefault();
      moveActive(1);
    } else if (key === "arrowleft" || key === "[") {
      event.preventDefault();
      moveActive(-1);
    } else if (key === "enter") {
      event.preventDefault();
      toggleZoom();
    } else if (key === "t") {
      event.preventDefault();
      setZoomedPanelId(null);
      setViewMode((current) => (current === "split" ? "tabs" : "split"));
    } else if (key === "-" && activePanel && !activePanel.collapsed) {
      event.preventDefault();
      onToggleCollapsed(activePanel.id);
    } else if (key === "=" && activePanel && activePanel.collapsed) {
      event.preventDefault();
      onToggleCollapsed(activePanel.id);
    } else if (key === "d" && activePanel) {
      event.preventDefault();
      onDuplicate(activePanel.id);
    } else if (key === "a" && activePanel) {
      event.preventDefault();
      onArchive(activePanel.id);
    } else if (key === "w" && activePanel) {
      event.preventDefault();
      onClose(activePanel.id);
    }
  });

  useEffect(() => {
    document.addEventListener("keydown", onCanvasKeyDown);
    return () => document.removeEventListener("keydown", onCanvasKeyDown);
  }, [onCanvasKeyDown]);

  useLayoutEffect(() => {
    const snapshot = pointerDropSnapshot.current;
    if (!snapshot) return;

    // Consume the snapshot before animating so no later state update can reuse it.
    pointerDropSnapshot.current = null;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    canvasRef.current
      ?.querySelectorAll<HTMLElement>("[data-tool-panel]:not([hidden])")
      .forEach((element) => {
        const panelId = element.dataset.panelId;
        const oldLeft = panelId ? snapshot.get(panelId) : undefined;
        if (oldLeft === undefined) return;

        const rawDelta = oldLeft - element.getBoundingClientRect().left;
        const delta = reducedMotion
          ? Math.max(-6, Math.min(6, rawDelta))
          : rawDelta;
        if (Math.abs(delta) < 0.5) return;

        element.animate(
          [
            { transform: `translateX(${delta}px)` },
            { transform: "translateX(0)" },
          ],
          {
            duration: reducedMotion ? 100 : 180,
            easing: reducedMotion
              ? "cubic-bezier(0.23, 1, 0.32, 1)"
              : "cubic-bezier(0.77, 0, 0.175, 1)",
          }
        );
      });
  }, [panels]);

  const handleDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const sourceId =
      draggedPanelId || event.dataTransfer.getData("application/x-tool-panel");
    if (sourceId && sourceId !== targetId) {
      const snapshot = new Map<string, number>();
      canvasRef.current
        ?.querySelectorAll<HTMLElement>("[data-tool-panel]:not([hidden])")
        .forEach((element) => {
          const panelId = element.dataset.panelId;
          if (panelId) snapshot.set(panelId, element.getBoundingClientRect().left);
        });
      pointerDropSnapshot.current = snapshot;
      onReorder(sourceId, targetId);
    }
    setDraggedPanelId(null);
    setDragOverPanelId(null);
  };

  const horizontalSplit =
    viewMode === "split" && !zoomedPanelId && openPanels.length > 1;

  const panelIsVisible = (panel: ToolPanel) => visiblePanelIds.has(panel.id);

  return (
    <div ref={canvasRef} className="mx-auto w-full max-w-[2200px] space-y-2">
      <div className="sticky top-0 z-20 space-y-1 bg-background pb-1">
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-card py-1.5 pl-10 pr-2 shadow-sm md:px-2">
        <LayoutDashboard className="size-4 text-primary" />
        <span className="text-sm font-semibold">Tool canvas</span>
        <Badge variant="secondary" className="text-[10px]">
          {openPanels.length} open
        </Badge>

        <div className="ml-auto flex items-center gap-0.5 rounded border p-0.5">
          <Button
            variant={viewMode === "split" && !zoomedPanelId ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px]"
            aria-keyshortcuts="Alt+T"
            onClick={() => {
              setZoomedPanelId(null);
              setViewMode("split");
            }}
          >
            <Columns2 className="size-3" /> Split
          </Button>
          <Button
            variant={viewMode === "tabs" && !zoomedPanelId ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px]"
            aria-keyshortcuts="Alt+T"
            onClick={() => {
              setZoomedPanelId(null);
              setViewMode("tabs");
            }}
          >
            <List className="size-3" /> Tabs
          </Button>
          <Button
            variant={zoomedPanelId ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px]"
            aria-keyshortcuts="Alt+Enter"
            onClick={toggleZoom}
            disabled={!activePanel}
          >
            <Fullscreen className="size-3" /> Zoom
          </Button>
        </div>

        <PanelAction
          label="Collapse all panes"
          ariaLabel="Collapse all panes"
          onClick={() => onSetAllCollapsed(true)}
        >
          <ChevronsDownUp className="size-3.5" />
        </PanelAction>
        <PanelAction
          label="Expand all panes"
          ariaLabel="Expand all panes"
          onClick={() => onSetAllCollapsed(false)}
        >
          <ChevronsUpDown className="size-3.5" />
        </PanelAction>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              aria-keyshortcuts="Meta+K Control+K"
              onClick={() =>
                document.dispatchEvent(new Event("open-tool-palette"))
              }
            >
              <Plus className="size-3.5" />
              <span>Add tool</span>
              <Badge
                variant="outline"
                className="hidden h-4 px-1 font-mono text-[9px] sm:inline-flex"
              >
                ⌘K
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add another tool pane (⌘K)</TooltipContent>
        </Tooltip>

        <ThemeToggle />

        <ShortcutHelp />
        <ArchiveMenu
          panels={archivedPanels}
          onRestore={onRestore}
          onClose={onClose}
        />
        </div>

        {openPanels.length > 0 && (viewMode === "tabs" || zoomedPanelId) && (
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-md border bg-background p-1 shadow-sm"
            aria-label="Open tool panes"
          >
            {openPanels.map((panel, index) => {
              const tool = getToolOrDefault(panel.toolId);
              const active = panel.id === activePanel?.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => onActivePanelChange(panel.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-pressed={active}
                  aria-keyshortcuts={index < 9 ? `Alt+${index + 1}` : undefined}
                >
                  <span className="font-mono text-[9px] opacity-70">{index + 1}</span>
                  <span className="whitespace-nowrap">{tool.name}</span>
                  {panel.collapsed && <Minimize2 className="size-3 opacity-70" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex min-h-0 items-start gap-2 overflow-x-auto pb-1">
        {openPanels.length === 0 && <EmptyCanvas onAdd={() => onAdd("tlv")} />}
        {panels.map((panel) => (
            <ToolPanelFrame
              key={panel.id}
              panel={panel}
              visible={panelIsVisible(panel)}
              mounted={
                mountedPanelIds.has(panel.id) || panelIsVisible(panel)
              }
              zoomed={zoomedPanelId === panel.id}
              horizontalSplit={horizontalSplit}
              onDuplicate={() => onDuplicate(panel.id)}
              onToggleCollapsed={() => onToggleCollapsed(panel.id)}
              onToggleZoom={toggleZoom}
              onArchive={() => onArchive(panel.id)}
              onClose={() => onClose(panel.id)}
              onDragStart={(event) => {
                const target = event.target as HTMLElement | null;
                if (
                  target?.closest(
                    "button, a, input, textarea, select, [contenteditable='true'], [data-no-drag]"
                  )
                ) {
                  event.preventDefault();
                  return;
                }
                setDraggedPanelId(panel.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-tool-panel", panel.id);
              }}
              onDragEnd={() => {
                setDraggedPanelId(null);
                setDragOverPanelId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (draggedPanelId !== panel.id) setDragOverPanelId(panel.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOverPanelId(null);
                }
              }}
              onDrop={(event) => handleDrop(event, panel.id)}
              dragging={draggedPanelId === panel.id}
              dropTarget={dragOverPanelId === panel.id}
              active={activePanel?.id === panel.id}
              onActivate={() => onActivePanelChange(panel.id)}
            />
        ))}
      </div>
    </div>
  );
}

function ShortcutHelp(): JSX.Element {
  const [open, setOpen] = useState(false);
  const openedByHold = useRef(false);

  useEffect(() => {
    let holdTimer: number | null = null;

    const clearHoldTimer = () => {
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    const releaseHold = () => {
      clearHoldTimer();
      if (openedByHold.current) {
        openedByHold.current = false;
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Alt") {
        if (event.altKey) releaseHold();
        return;
      }
      if (event.repeat || holdTimer !== null || openedByHold.current) return;

      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        openedByHold.current = true;
        setOpen(true);
      }, 420);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") releaseHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseHold);
    return () => {
      clearHoldTimer();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseHold);
    };
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        openedByHold.current = false;
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          aria-label="Open canvas keyboard shortcuts"
          title="Click or hold Option to view shortcuts"
        >
          <Keyboard className="size-3.5" />
          <span className="hidden sm:inline">Shortcuts</span>
          <Badge variant="outline" className="hidden h-4 px-1 font-mono text-[9px] lg:inline-flex">
            hold ⌥
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="mb-1 px-1 text-xs font-medium">Canvas shortcuts</div>
        <div className="space-y-0.5">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between gap-3 rounded px-1 py-1 text-xs">
              <span className="text-muted-foreground">{action}</span>
              <Badge variant="secondary" className="font-mono text-[9px]">
                {keys}
              </Badge>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ArchiveMenu({
  panels,
  onRestore,
  onClose,
}: {
  panels: ToolPanel[];
  onRestore: (panelId: string) => void;
  onClose: (panelId: string) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <Archive className="size-3.5" />
          <span className="hidden sm:inline">Archived</span>
          {panels.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              {panels.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="mb-1 px-1 text-xs font-medium">Archived tools</div>
        {panels.length === 0 ? (
          <p className="px-1 py-3 text-xs text-muted-foreground">
            Archived tools stay here until restored or removed.
          </p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-auto">
            {panels.map((panel) => {
              const tool = getToolOrDefault(panel.toolId);
              return (
                <div key={panel.id} className="flex items-center gap-2 rounded border p-1.5">
                  <div className="min-w-0 flex-1 text-xs font-medium">{tool.name}</div>
                  <PanelAction
                    label="Restore to canvas"
                    ariaLabel={`Restore ${tool.name}`}
                    onClick={() => {
                      onRestore(panel.id);
                      setOpen(false);
                    }}
                  >
                    <ArchiveRestore className="size-3.5" />
                  </PanelAction>
                  <PanelAction
                    label="Remove permanently"
                    ariaLabel={`Remove archived ${tool.name}`}
                    onClick={() => {
                      onClose(panel.id);
                      setOpen(false);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </PanelAction>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function EmptyCanvas({ onAdd }: { onAdd: () => void }): JSX.Element {
  return (
    <div className="grid min-h-[50vh] w-full flex-1 place-items-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <div>
        <LayoutDashboard className="mx-auto mb-2 size-7 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Your canvas is empty</h2>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Choose a tool from the sidebar or press ⌘K. Choose it again for another independent pane.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onAdd}>
          Add TLV Parser
        </Button>
      </div>
    </div>
  );
}

type ToolPanelFrameProps = {
  panel: ToolPanel;
  visible: boolean;
  mounted: boolean;
  zoomed: boolean;
  horizontalSplit: boolean;
  onDuplicate: () => void;
  onToggleCollapsed: () => void;
  onToggleZoom: () => void;
  onArchive: () => void;
  onClose: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  dragging: boolean;
  dropTarget: boolean;
  active: boolean;
  onActivate: () => void;
};

function ToolPanelFrame({
  panel,
  visible,
  mounted,
  zoomed,
  horizontalSplit,
  onDuplicate,
  onToggleCollapsed,
  onToggleZoom,
  onArchive,
  onClose,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  dragging,
  dropTarget,
  active,
  onActivate,
}: ToolPanelFrameProps): JSX.Element {
  const tool = getToolOrDefault(panel.toolId);
  const title = `${tool.name} instance`;

  return (
    <section
      hidden={!visible}
      id={`tool-panel-${panel.id}`}
      data-tool-panel
      data-panel-id={panel.id}
      data-tool-id={panel.toolId}
      data-collapsed={panel.collapsed}
      data-wide={panel.wide}
      data-zoomed={zoomed}
      data-horizontal-split={horizontalSplit}
      data-drop-target={dropTarget}
      aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
      tabIndex={-1}
      className={cn(
        "tool-panel-drop-target relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-background shadow-sm outline-none",
        !visible && "hidden",
        horizontalSplit
          ? panel.collapsed
            ? "w-72 shrink-0"
            : "w-[calc(50%-0.25rem)] min-w-[34rem] shrink-0"
          : "w-full flex-1",
        !panel.collapsed &&
          "h-[calc(100vh-6.5rem)] min-h-[30rem]",
        dragging && "scale-[0.995] opacity-55",
        active && "border-ring/70 ring-1 ring-ring/30"
      )}
      onPointerDownCapture={onActivate}
      onFocusCapture={onActivate}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="group/pane-header flex min-h-9 shrink-0 cursor-grab select-none items-center gap-1 border-b bg-muted/25 px-1.5 py-1 active:cursor-grabbing"
        aria-label={`${title} header. Drag anywhere on the header to reorder.`}
        title="Drag header to reorder · ⌥⇧← / ⌥⇧→"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              tabIndex={0}
              aria-label={`${title}. Drag to move or use Option Shift Left Arrow and Option Shift Right Arrow.`}
              aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
              className="flex min-w-0 flex-1 items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GripVertical
                className="mx-1 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/pane-header:text-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 px-0.5 text-xs font-semibold leading-tight">
                {tool.name}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Drag to move · ⌥⇧← / ⌥⇧→</TooltipContent>
        </Tooltip>
        <div
          className="flex shrink-0 cursor-default items-center gap-0.5"
          data-no-drag
          onDragStart={(event) => event.preventDefault()}
        >
          <PanelAction
            label="Duplicate pane"
            onClick={onDuplicate}
            ariaLabel={`Duplicate ${title}`}
            ariaKeyShortcuts="Alt+D"
            shortcut="⌥D"
          >
            <CopyPlus className="size-3.5" />
          </PanelAction>
          <PanelAction
            label={zoomed ? "Exit full pane" : "Zoom full pane"}
            onClick={onToggleZoom}
            ariaLabel={zoomed ? `Exit full screen for ${title}` : `Show ${title} full screen`}
            ariaKeyShortcuts="Alt+Enter"
            shortcut="⌥↩"
          >
            {zoomed ? <Minimize2 className="size-3.5" /> : <Fullscreen className="size-3.5" />}
          </PanelAction>
          <PanelAction
            label={panel.collapsed ? "Expand pane" : "Collapse pane"}
            onClick={onToggleCollapsed}
            ariaLabel={panel.collapsed ? `Expand ${title}` : `Collapse ${title}`}
            ariaKeyShortcuts={panel.collapsed ? "Alt+=" : "Alt+-"}
            shortcut={panel.collapsed ? "⌥=" : "⌥-"}
          >
            {panel.collapsed ? <ChevronsUpDown className="size-3.5" /> : <ChevronsDownUp className="size-3.5" />}
          </PanelAction>
          <PanelAction
            label="Archive for later"
            onClick={onArchive}
            ariaLabel={`Archive ${title}`}
            ariaKeyShortcuts="Alt+A"
            shortcut="⌥A"
          >
            <Archive className="size-3.5" />
          </PanelAction>
          <PanelAction
            label="Close active pane"
            onClick={onClose}
            ariaLabel={`Close ${title}`}
            ariaKeyShortcuts="Alt+W"
            shortcut="⌥W"
          >
            <X className="size-3.5" />
          </PanelAction>
        </div>
      </header>

      <div
        hidden={panel.collapsed}
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-auto p-2",
          panel.collapsed && "hidden"
        )}
      >
        {mounted && (
          <ToolPanelProvider instanceId={panel.id} active={active && visible}>
            {tool.kind === "component" ? (
              <Suspense fallback={<ToolLoading name={tool.name} />}>
                <tool.component />
              </Suspense>
            ) : (
              <CalculatorTool spec={tool} />
            )}
          </ToolPanelProvider>
        )}
      </div>
    </section>
  );
}

function ToolLoading({ name }: { name: string }): JSX.Element {
  return (
    <div
      className="grid min-h-40 place-items-center rounded-md border border-dashed bg-muted/20 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        Loading {name}…
      </div>
    </div>
  );
}

function PanelAction({
  label,
  ariaLabel,
  ariaKeyShortcuts,
  shortcut,
  className,
  onClick,
  children,
}: {
  label: string;
  ariaLabel: string;
  ariaKeyShortcuts?: string;
  shortcut?: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-7", className)}
          onClick={onClick}
          aria-label={ariaLabel}
          aria-keyshortcuts={ariaKeyShortcuts}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-1.5">
        <span>{label}</span>
        {shortcut && (
          <Badge
            variant="outline"
            className="h-4 border-primary-foreground/30 bg-primary-foreground/10 px-1 font-mono text-[9px] text-primary-foreground"
          >
            {shortcut}
          </Badge>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
