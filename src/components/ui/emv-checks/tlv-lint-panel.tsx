/**
 * Renders the EMV sanity-check findings for a parsed payload.
 */

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  XCircle,
} from "lucide-react";
import { lintTlv, type LintSeverity } from "@/utils/emv/tlv-lint";
import type { TlvParsingResult } from "@/types/tlv";

const SEVERITY_ORDER: LintSeverity[] = ["error", "warning", "info"];

const SEVERITY_ICON: Record<LintSeverity, typeof Info> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_CLASS: Record<LintSeverity, string> = {
  error: "text-destructive",
  warning: "text-amber-500",
  info: "text-muted-foreground",
};

interface TlvLintPanelProps {
  result: TlvParsingResult | null;
}

export function TlvLintPanel({ result }: TlvLintPanelProps) {
  const findings = useMemo(() => lintTlv(result), [result]);

  if (!result || result.elements.length === 0) return null;

  const counts = SEVERITY_ORDER.map((severity) => ({
    severity,
    count: findings.filter((f) => f.severity === severity).length,
  })).filter((entry) => entry.count > 0);

  const sorted = [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  const hasProblems = findings.some((f) => f.severity !== "info");

  return (
    <Card className="mb-4">
      <Collapsible defaultOpen={hasProblems} className="group">
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {findings.length === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : hasProblems ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground" />
              )}
              EMV Sanity Checks
              {counts.map(({ severity, count }) => (
                <Badge
                  key={severity}
                  variant={severity === "error" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {count} {severity}
                  {count === 1 ? "" : "s"}
                </Badge>
              ))}
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CardTitle>
            <CardDescription>
              {findings.length === 0
                ? "No issues found in the checks this tool performs."
                : "Plausibility checks — a clean result is not a substitute for kernel certification."}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="tlv-lint-disclosure">
          {sorted.length > 0 && (
            <CardContent className="space-y-2 pt-0">
              {sorted.map((finding) => {
                const Icon = SEVERITY_ICON[finding.severity];
                return (
                  <div
                    key={finding.id}
                    className="flex items-start gap-2 rounded-lg border p-3"
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        SEVERITY_CLASS[finding.severity]
                      }`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">
                          {finding.title}
                        </span>
                        {finding.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {finding.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
