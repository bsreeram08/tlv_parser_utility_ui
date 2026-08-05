import { createContext, useContext } from "react";

export type ToolPanelContextValue = {
  instanceId: string;
  active: boolean;
};

export const ToolPanelContext = createContext<ToolPanelContextValue>({
  instanceId: "standalone",
  active: true,
});

export function useToolPanelContext(): ToolPanelContextValue {
  return useContext(ToolPanelContext);
}
