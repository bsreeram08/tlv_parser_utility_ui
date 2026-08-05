import type { ReactNode } from "react";
import {
  ToolPanelContext,
  type ToolPanelContextValue,
} from "./tool-panel-context";

export function ToolPanelProvider({
  instanceId,
  active,
  children,
}: ToolPanelContextValue & { children: ReactNode }) {
  return (
    <ToolPanelContext.Provider value={{ instanceId, active }}>
      {children}
    </ToolPanelContext.Provider>
  );
}
