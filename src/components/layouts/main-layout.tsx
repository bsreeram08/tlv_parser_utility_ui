import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  BadgeCheck,
  Binary,
  Blocks,
  BookOpen,
  ChevronDown,
  CreditCard,
  Hammer,
  Hash,
  KeyRound,
  LockKeyhole,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Search,
  ShieldCheck,
  Tags,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/ui/command-palette";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { groupedTools, searchTools } from "@/tools/registry";

interface MainLayoutProps {
  children: ReactNode;
  activeToolId: string;
  openToolIds: string[];
  onNavigate: (toolId: string) => void;
}

const GROUP_ICONS: Record<string, LucideIcon> = {
  EMV: CreditCard,
  "EMV tag decoders": Tags,
  "ISO 8583": Binary,
  Ciphers: LockKeyhole,
  Hashes: Hash,
  "PIN blocks": Blocks,
  "PIN verification": BadgeCheck,
  "Card security values": ShieldCheck,
  "Card numbers": ScanLine,
  Converters: ArrowLeftRight,
  Build: Hammer,
  Reference: BookOpen,
};

function groupIcon(group: string): LucideIcon {
  return GROUP_ICONS[group] ?? KeyRound;
}

export function MainLayout({
  children,
  activeToolId,
  openToolIds,
  onNavigate,
}: MainLayoutProps): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("payment-utilities-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "payment-utilities-sidebar-collapsed",
        String(sidebarCollapsed)
      );
    } catch {
      // Persistence is optional.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.matches("input, textarea, select") || target?.isContentEditable;

      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSidebarCollapsed((current) => !current);
        return;
      }

      if (isEditing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "[") {
        event.preventDefault();
        setSidebarCollapsed(true);
      } else if (event.key === "]") {
        event.preventDefault();
        setSidebarCollapsed(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed left-2 top-2 z-50 md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto p-0">
            <SidebarContent
              activeToolId={activeToolId}
              openToolIds={openToolIds}
              onNavigate={(id) => {
                onNavigate(id);
                setOpen(false);
              }}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <aside
          className={cn(
            "sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r bg-background transition-[width] duration-[220ms] ease-[var(--ease-out)]",
            sidebarCollapsed ? "w-12" : "w-72"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <SidebarContent
              activeToolId={activeToolId}
              openToolIds={openToolIds}
              onNavigate={onNavigate}
              collapsed={sidebarCollapsed}
            />
          </div>

          <div
            className={cn(
              "flex border-t p-1.5",
              sidebarCollapsed ? "justify-center" : "justify-end"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  variant="ghost"
                  size="icon"
                  aria-keyshortcuts="Meta+B Control+B BracketLeft BracketRight"
                  aria-label={
                    sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarCollapsed ? "Expand sidebar · ] or ⌘B" : "Collapse sidebar · [ or ⌘B"}
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">{children}</main>
      </div>

      <CommandPalette onSelect={onNavigate} />
      <Toaster position="bottom-right" visibleToasts={1} />
    </div>
  );
}

function SidebarContent({
  activeToolId,
  openToolIds,
  onNavigate,
  collapsed,
}: {
  activeToolId: string;
  openToolIds: string[];
  onNavigate: (toolId: string) => void;
  collapsed: boolean;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupedTools(), []);

  // While searching, show one flat result list — group headings get in the way
  // when you already know what you are looking for.
  const matches = useMemo(
    () => (query.trim() ? searchTools(query) : null),
    [query]
  );
  const openCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const toolId of openToolIds) {
      counts.set(toolId, (counts.get(toolId) ?? 0) + 1);
    }
    return counts;
  }, [openToolIds]);

  return (
    <div className={cn("flex h-full flex-col p-2", collapsed && "px-1.5")}>
      <h2
        className={cn(
          "flex h-8 items-center font-semibold",
          collapsed ? "mb-1 justify-center" : "mb-2 gap-2 px-1 text-sm"
        )}
      >
        {collapsed ? (
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Wrench className="size-4" aria-label="Card Payment Tools" />
              </TooltipTrigger>
              <TooltipContent side="right">Card Payment Tools</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <Wrench className="size-4 text-primary" />
            Card payment tools
          </>
        )}
      </h2>

      {!collapsed && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter tools"
            aria-label="Filter tools"
            className="h-7 pl-8 pr-8 text-xs"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear filter"
              className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-0.5">
        {matches ? (
          matches.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            matches.map((tool) => (
              <SidebarItem
                key={tool.id}
                current={tool.id === activeToolId}
                count={openCounts.get(tool.id)}
                onClick={() => onNavigate(tool.id)}
                collapsed={collapsed}
                subtitle={tool.group}
              >
                {tool.name}
              </SidebarItem>
            ))
          )
        ) : collapsed ? (
          <TooltipProvider delayDuration={120}>
            <div className="flex flex-col items-center gap-0.5">
              {groups.map(({ group, tools }) => {
                const Icon = groupIcon(group);
                const groupIsActive = tools.some((tool) =>
                  openCounts.has(tool.id)
                );

                return (
                  <DropdownMenu key={group}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={group}
                            aria-current={groupIsActive ? "page" : undefined}
                            className={cn(
                              "flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                              groupIsActive &&
                                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">{group}</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                      <DropdownMenuLabel className="py-1 text-xs text-muted-foreground">
                        {group}
                      </DropdownMenuLabel>
                      {tools.map((tool) => (
                        <DropdownMenuItem
                          key={tool.id}
                          onSelect={() => onNavigate(tool.id)}
                          className={cn(
                            "py-1 text-xs",
                            openCounts.has(tool.id) && "bg-accent font-medium"
                          )}
                        >
                          <span className="min-w-0 flex-1 whitespace-normal leading-tight">
                            {tool.name}
                          </span>
                          {(openCounts.get(tool.id) ?? 0) > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                              {openCounts.get(tool.id)}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </div>
          </TooltipProvider>
        ) : (
          groups.map(({ group, tools }) => (
            <Collapsible
              key={group}
              defaultOpen={tools.some((t) => t.id === activeToolId)}
              className="group"
            >
              <CollapsibleTrigger
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                  "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  collapsed ? "justify-center" : "justify-between"
                )}
              >
                {(() => {
                  const Icon = groupIcon(group);
                  return <Icon className="size-3.5 shrink-0" />;
                })()}
                {!collapsed && <span className="truncate">{group}</span>}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 transition-transform group-data-[state=open]:rotate-180",
                    collapsed ? "mx-auto" : "ml-auto"
                  )}
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-px pl-1">
                {tools.map((tool) => (
                  <SidebarItem
                    key={tool.id}
                    current={tool.id === activeToolId}
                    count={openCounts.get(tool.id)}
                    onClick={() => onNavigate(tool.id)}
                    collapsed={collapsed}
                    tooltip={tool.name}
                  >
                    {tool.name}
                  </SidebarItem>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </nav>
    </div>
  );
}

function SidebarItem({
  children,
  current = false,
  onClick,
  collapsed = false,
  subtitle,
  tooltip,
  count,
}: {
  children: ReactNode;
  current?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  subtitle?: string;
  tooltip?: string;
  count?: number;
}): JSX.Element {
  const button = (
    <button
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={cn(
        "w-full rounded-md text-sm transition-colors",
        collapsed ? "px-1 py-1 text-center text-[10px]" : "px-2 py-1 text-left text-xs",
        current
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="flex items-start gap-1.5">
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
          {children}
        </span>
        {count !== undefined && count > 0 && !collapsed && (
          <Badge
            variant={current ? "outline" : "secondary"}
            className="mt-px h-4 shrink-0 px-1 text-[9px]"
          >
            {count}
          </Badge>
        )}
      </span>
      {subtitle && !collapsed && (
        <span
          className={cn(
            "block truncate text-[10px]",
            current ? "text-primary-foreground/70" : "text-muted-foreground/70"
          )}
        >
          {subtitle}
        </span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{tooltip ?? children}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
