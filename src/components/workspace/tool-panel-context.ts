import { createContext, useContext } from "react";

export type ToolPanelContextValue = {
  instanceId: string;
  active: boolean;
  /** Input a deep link opened this pane with; the tool parses it on mount. */
  initialInput?: string;
};

export const ToolPanelContext = createContext<ToolPanelContextValue>({
  instanceId: "standalone",
  active: true,
});

export function useToolPanelContext(): ToolPanelContextValue {
  return useContext(ToolPanelContext);
}
