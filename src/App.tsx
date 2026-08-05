import { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layouts/main-layout";
import {
  ToolCanvas,
  type ToolPanel,
} from "@/components/workspace/tool-canvas";
import {
  DEFAULT_TOOL_ID,
  getTool,
  getToolOrDefault,
} from "@/tools/registry";
import { toast } from "sonner";

const WORKSPACE_STORAGE_KEY = "payment-utilities-tool-canvas-v1";
const ACTIVE_PANEL_STORAGE_KEY = "payment-utilities-active-panel-v1";

function requestedToolId(): string {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("tool");
  if (requested && getTool(requested)) return requested;
  if (params.has("config")) return "emv-config";
  return DEFAULT_TOOL_ID;
}

function createPanel(toolId: string): ToolPanel {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    toolId,
    collapsed: false,
    archived: false,
    wide: false,
  };
}

function isStoredPanel(value: unknown): value is ToolPanel {
  if (!value || typeof value !== "object") return false;
  const panel = value as Partial<ToolPanel>;
  return (
    typeof panel.id === "string" &&
    typeof panel.toolId === "string" &&
    Boolean(getTool(panel.toolId)) &&
    typeof panel.collapsed === "boolean" &&
    typeof panel.archived === "boolean" &&
    typeof panel.wide === "boolean"
  );
}

function initialPanels(): ToolPanel[] {
  const requested = requestedToolId();
  try {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const panels = parsed.filter(isStoredPanel);
        if (panels.length > 0) {
          const hasRequested = panels.some((panel) => panel.toolId === requested);
          return hasRequested ? panels : [...panels, createPanel(requested)];
        }
      }
    }
  } catch {
    // A corrupt saved canvas should not prevent the utilities from opening.
  }
  return [createPanel(requested)];
}

function initialActivePanelId(panels: ToolPanel[]): string | null {
  try {
    const stored = localStorage.getItem(ACTIVE_PANEL_STORAGE_KEY);
    if (stored && panels.some((panel) => panel.id === stored && !panel.archived)) {
      return stored;
    }
  } catch {
    // Focus persistence is optional.
  }
  return panels.find((panel) => !panel.archived)?.id ?? null;
}

function App() {
  const [panels, setPanels] = useState<ToolPanel[]>(initialPanels);
  const [activePanelId, setActivePanelId] = useState<string | null>(
    () => initialActivePanelId(panels)
  );
  const [lastToolId, setLastToolId] = useState(
    () =>
      panels.find((panel) => panel.id === activePanelId)?.toolId ??
      requestedToolId()
  );

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(panels));
    } catch {
      // Canvas persistence is a convenience; the tools still work without it.
    }
  }, [panels]);

  useEffect(() => {
    try {
      if (activePanelId) {
        localStorage.setItem(ACTIVE_PANEL_STORAGE_KEY, activePanelId);
      } else {
        localStorage.removeItem(ACTIVE_PANEL_STORAGE_KEY);
      }
    } catch {
      // Focus persistence is optional.
    }
  }, [activePanelId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (lastToolId === DEFAULT_TOOL_ID) params.delete("tool");
    else params.set("tool", lastToolId);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
  }, [lastToolId]);

  const addTool = useCallback((toolId: string) => {
    const tool = getToolOrDefault(toolId);
    const added = createPanel(tool.id);
    setPanels((current) => {
      const activeIndex = current.findIndex(
        (panel) => panel.id === activePanelId
      );
      const next = [...current];
      next.splice(activeIndex >= 0 ? activeIndex + 1 : current.length, 0, added);
      return next;
    });
    setActivePanelId(added.id);
    setLastToolId(tool.id);
    toast.success(`${tool.name} added to the canvas`, {
      description: "The new pane is active and ready to use.",
      id: "canvas-add-tool",
      duration: 1800,
    });
  }, [activePanelId]);

  const updatePanel = useCallback(
    (panelId: string, update: (panel: ToolPanel) => ToolPanel) => {
      setPanels((current) =>
        current.map((panel) => (panel.id === panelId ? update(panel) : panel))
      );
    },
    []
  );

  const duplicatePanel = useCallback(
    (panelId: string) => {
      const source = panels.find((panel) => panel.id === panelId);
      if (!source) return;
      const duplicate = {
        ...createPanel(source.toolId),
        wide: source.wide,
      };
      setPanels((current) => {
        const index = current.findIndex((panel) => panel.id === panelId);
        const next = [...current];
        next.splice(index >= 0 ? index + 1 : current.length, 0, duplicate);
        return next;
      });
      setActivePanelId(duplicate.id);
      setLastToolId(source.toolId);
      toast.success(`${getToolOrDefault(source.toolId).name} duplicated`, {
        id: "canvas-add-tool",
        duration: 1800,
      });
    },
    [panels]
  );

  const focusNearestPanel = useCallback(
    (current: ToolPanel[], panelId: string) => {
      if (activePanelId !== panelId) return;
      const open = current.filter((panel) => !panel.archived);
      const index = open.findIndex((panel) => panel.id === panelId);
      const next = open[index + 1] ?? open[index - 1] ?? null;
      setActivePanelId(next?.id ?? null);
      if (next) setLastToolId(next.toolId);
    },
    [activePanelId]
  );

  const closePanel = useCallback(
    (panelId: string) => {
      focusNearestPanel(panels, panelId);
      setPanels((current) => current.filter((panel) => panel.id !== panelId));
    },
    [focusNearestPanel, panels]
  );

  const archivePanel = useCallback(
    (panelId: string) => {
      const source = panels.find((panel) => panel.id === panelId);
      focusNearestPanel(panels, panelId);
      setPanels((current) =>
        current.map((panel) =>
          panel.id === panelId ? { ...panel, archived: true } : panel
        )
      );
      if (source) {
        toast.success(`${getToolOrDefault(source.toolId).name} archived`, {
          description: "Restore it from Archived with its current state intact.",
          id: "canvas-archive-tool",
          duration: 1800,
        });
      }
    },
    [focusNearestPanel, panels]
  );

  const restorePanel = useCallback(
    (panelId: string) => {
      const source = panels.find((panel) => panel.id === panelId);
      if (!source) return;
      updatePanel(panelId, (panel) => ({
        ...panel,
        archived: false,
        collapsed: false,
      }));
      setActivePanelId(panelId);
      setLastToolId(source.toolId);
      toast.success(`${getToolOrDefault(source.toolId).name} restored`, {
        description: "The restored pane is active and back on the canvas.",
        id: "canvas-restore-tool",
        duration: 1800,
      });
    },
    [panels, updatePanel]
  );

  const reorderPanels = useCallback((sourceId: string, targetId: string) => {
    setPanels((current) => {
      const sourceIndex = current.findIndex((panel) => panel.id === sourceId);
      const targetIndex = current.findIndex((panel) => panel.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const openToolIds = useMemo(
    () => panels.filter((panel) => !panel.archived).map((panel) => panel.toolId),
    [panels]
  );

  return (
    <MainLayout
      activeToolId={lastToolId}
      openToolIds={openToolIds}
      onNavigate={addTool}
    >
      <ToolCanvas
        panels={panels}
        activePanelId={activePanelId}
        onActivePanelChange={setActivePanelId}
        onAdd={addTool}
        onDuplicate={duplicatePanel}
        onToggleCollapsed={(panelId) =>
          updatePanel(panelId, (panel) => ({
            ...panel,
            collapsed: !panel.collapsed,
          }))
        }
        onArchive={archivePanel}
        onRestore={restorePanel}
        onClose={closePanel}
        onReorder={reorderPanels}
        onSetAllCollapsed={(collapsed) =>
          setPanels((current) =>
            current.map((panel) =>
              panel.archived ? panel : { ...panel, collapsed }
            )
          )
        }
      />
    </MainLayout>
  );
}

export default App;
