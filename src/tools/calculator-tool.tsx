/**
 * Generic renderer for any `CalculatorSpec`.
 *
 * One component drives every calculator in the app: it lays out the declared
 * fields, runs `compute` on change, and shows either the results or the
 * validation message the spec threw.
 */

import { useId, useMemo, useState, type JSX } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Copy, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { CalculatorSpec, ToolResult } from "./types";

function initialValues(spec: CalculatorSpec): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of spec.fields) {
    values[field.name] = field.defaultValue ?? "";
  }
  return values;
}

export function CalculatorTool({
  spec,
}: {
  spec: CalculatorSpec;
}): JSX.Element {
  const [values, setValues] = useState(() => initialValues(spec));
  const instanceId = useId();

  const visibleFields = spec.fields.filter(
    (field) => !field.showIf || field.showIf(values)
  );

  // Every field empty means the user has not started — show nothing rather
  // than a validation complaint about input they were never asked for yet.
  const untouched = visibleFields.every((field) => {
    const value = (values[field.name] ?? "").trim();
    const initial = (field.defaultValue ?? "").trim();
    return value === initial;
  });

  const { results, error } = useMemo((): {
    results: ToolResult[];
    error: string | null;
  } => {
    if (untouched) return { results: [], error: null };
    try {
      return { results: spec.compute(values), error: null };
    } catch (e) {
      return {
        results: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [spec, values, untouched]);

  const set = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <div className="grid gap-2">
      <Card>
        <CardContent className="space-y-3">
          {spec.note && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2 text-xs">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>{spec.note}</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleFields.map((field) => {
              const id = `${instanceId}-${spec.id}-${field.name}`;
              const wide = field.type === "textarea";
              return (
                <div
                  key={field.name}
                  className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}
                >
                  <Label htmlFor={id}>{field.label}</Label>

                  {field.type === "select" ? (
                    <Select
                      value={values[field.name] || undefined}
                      onValueChange={(v) => set(field.name, v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      id={id}
                      value={values[field.name] ?? ""}
                      onChange={(e) => set(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className={`min-h-20 ${field.mono ? "font-mono text-xs" : ""}`}
                    />
                  ) : (
                    <Input
                      id={id}
                      type={field.type === "number" ? "number" : "text"}
                      value={values[field.name] ?? ""}
                      onChange={(e) => set(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className={field.mono ? "font-mono" : undefined}
                    />
                  )}

                  {field.help && (
                    <p className="text-xs text-muted-foreground">{field.help}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {spec.example && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setValues({ ...initialValues(spec), ...spec.example })
                }
              >
                Load example
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setValues(initialValues(spec))}
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-xs">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            {results.map((result) => (
              <div key={result.label} className="rounded-md border p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {result.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(result.value)
                        .then(() => toast.success(`${result.label} copied`))
                        .catch(() => toast.error("Copy failed"))
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div
                  className={`whitespace-pre-line break-words text-sm ${
                    result.mono === false ? "" : "font-mono break-all"
                  }`}
                >
                  {result.value || "—"}
                </div>
                {result.note && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.note}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
