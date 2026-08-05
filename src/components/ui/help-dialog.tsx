/**
 * Help dialog. The tool list is read from the registry so it cannot drift out
 * of step with what the app actually contains.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle } from "lucide-react";
import { TOOLS, groupedTools } from "@/tools/registry";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "⌘K / Ctrl+K", action: "Open the tool search palette" },
  { keys: "⌘B / Ctrl+B", action: "Toggle the tool sidebar" },
  { keys: "[ / ]", action: "Collapse / expand the tool sidebar" },
  { keys: "⌘S / Ctrl+S", action: "Save the current test (TLV parser)" },
  { keys: "⌘O / Ctrl+O", action: "Open saved tests (TLV parser)" },
];

export function HelpDialog() {
  const [open, setOpen] = useState(false);
  const groups = groupedTools();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Card Payment Tools</DialogTitle>
          <DialogDescription>
            {TOOLS.length} tools for reading, editing and checking payment data.
            Everything runs locally in the browser — nothing is uploaded.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
              <div className="space-y-1">
                {SHORTCUTS.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {shortcut.action}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {shortcut.keys}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            {groups.map(({ group, tools }) => (
              <section key={group} className="space-y-2">
                <h3 className="text-sm font-semibold">{group}</h3>
                <div className="space-y-1.5">
                  {tools.map((tool) => (
                    <div key={tool.id} className="rounded-lg border p-2.5">
                      <div className="text-sm font-medium">{tool.name}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                What these tools are and are not
              </h3>
              <p className="text-xs text-muted-foreground">
                The checks here catch structural and plausibility problems:
                wrong lengths, contradictory capability bits, stale checksums, a
                country code sitting in a currency field. The cryptographic
                calculators implement the standard published algorithms and are
                verified against known-answer vectors where those exist, but they
                are development aids — not a certified HSM, and not a substitute
                for kernel or scheme certification. A clean result does not mean
                a configuration is approved.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
