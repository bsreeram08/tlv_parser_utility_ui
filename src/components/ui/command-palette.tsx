/**
 * ⌘K command palette over the tool registry.
 *
 * With this many tools, search beats scrolling a sidebar — the palette is the
 * primary way to move around once you know what you want.
 */

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { groupedTools } from "@/tools/registry";

interface CommandPaletteProps {
  onSelect: (toolId: string) => void;
}

export function CommandPalette({ onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const groups = groupedTools();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenRequest = () => setOpen(true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("open-tool-palette", onOpenRequest);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("open-tool-palette", onOpenRequest);
    };
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Add a tool"
      description="Open another independent tool pane on this canvas"
    >
      <CommandInput placeholder="Search tools — try 'TLV', 'PIN block', 'SHA'…" />
      <CommandList>
        <CommandEmpty>No tool matches that.</CommandEmpty>
        {groups.map(({ group, tools }) => (
          <CommandGroup key={group} heading={group}>
            {tools.map((tool) => (
              <CommandItem
                key={tool.id}
                // Include keywords so the fuzzy match sees them too.
                value={`${tool.name} ${tool.group} ${(tool.keywords ?? []).join(
                  " "
                )}`}
                onSelect={() => {
                  onSelect(tool.id);
                  setOpen(false);
                }}
              >
                <span className="flex-1 truncate">{tool.name}</span>
                {tool.kind === "calculator" && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    calc
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
