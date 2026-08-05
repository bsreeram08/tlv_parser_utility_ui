/**
 * Tool registry types.
 *
 * Most tools in this app are "put values in, get values out". Those are
 * declared as data (a `CalculatorSpec`) and rendered by one generic component,
 * so adding a calculator means adding a spec — not another screen. Tools with
 * a real UI of their own (the TLV parser, the config viewer) are registered as
 * components instead.
 */

import type {
  ComponentType,
  LazyExoticComponent,
  ReactNode,
} from "react";

export type FieldType = "text" | "textarea" | "select" | "number";

export type ToolField = {
  readonly name: string;
  readonly label: string;
  readonly type: FieldType;
  readonly placeholder?: string;
  readonly defaultValue?: string;
  readonly options?: readonly { value: string; label: string }[];
  /** Render in a monospace font — use for hex and card data. */
  readonly mono?: boolean;
  readonly help?: string;
  /** Hide the field unless this predicate passes. */
  readonly showIf?: (values: Record<string, string>) => boolean;
};

export type ToolResult = {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
  /** Shown under the value in smaller text. */
  readonly note?: string;
};

export type CalculatorSpec = {
  readonly kind: "calculator";
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly description: string;
  readonly keywords?: readonly string[];
  readonly fields: readonly ToolField[];
  /**
   * Compute the outputs. Throw an `Error` with a readable message for invalid
   * input — the renderer shows it inline rather than as a crash.
   */
  readonly compute: (values: Record<string, string>) => ToolResult[];
  /** Optional extra guidance rendered above the fields. */
  readonly note?: string;
  /** Example values, offered as a one-click fill. */
  readonly example?: Record<string, string>;
};

export type ComponentToolSpec = {
  readonly kind: "component";
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly description: string;
  readonly keywords?: readonly string[];
  readonly component: ComponentType | LazyExoticComponent<ComponentType>;
  /** Render at full page width. */
  readonly fullWidth?: boolean;
};

export type ToolSpec = CalculatorSpec | ComponentToolSpec;

export type ToolGroup = {
  readonly name: string;
  readonly icon?: ReactNode;
};
