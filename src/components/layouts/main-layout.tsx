import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  FileCode,
  KeyRound,
  Settings,
  Menu,
  X,
  Tag,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState, useEffect } from "react";
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

// Define the available modules
type ActiveModule =
  | "tlv"
  | "iso8583"
  | "crypto"
  | "settings"
  | "custom-tags"
  | "tlv-comparison";

interface MainLayoutProps {
  children: ReactNode;
  activeModule: ActiveModule;
  onNavigate: (module: ActiveModule) => void;
}

export function MainLayout({
  children,
  activeModule,
  onNavigate,
}: MainLayoutProps): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get module title
  const getModuleTitle = () => {
    switch (activeModule) {
      case "tlv":
        return "TLV Parser";
      case "custom-tags":
        return "Custom Tag Management";
      case "tlv-comparison":
        return "TLV Comparison Tool";
      case "iso8583":
        return "ISO 8583 Message Parser";
      case "crypto":
        return "Cryptography Tools";
      case "settings":
        return "Settings";
      default:
        return "Payment Utilities";
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {isMobile ? (
        /* Mobile sidebar using Sheet component */
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed top-4 left-4 z-50 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent
              activeModule={activeModule}
              onNavigate={(module) => {
                onNavigate(module);
                setOpen(false);
              }}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop sidebar */
        <aside
          className={cn(
            "h-screen sticky top-0 border-r z-40 transition-all duration-300 ease-in-out bg-background",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <SidebarContent
            activeModule={activeModule}
            onNavigate={onNavigate}
            collapsed={sidebarCollapsed}
          />

          {/* Collapse toggle button integrated into sidebar */}
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-4"
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
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b sticky top-0 bg-background z-30 flex items-center px-4 lg:px-6">
          <div className="w-full flex justify-between items-center">
            {/* Title aligned to left with space for mobile menu button */}
            <h1 className="font-semibold text-lg ml-10 lg:ml-0">
              {getModuleTitle()}
            </h1>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                Documentation
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}

// Extracted Sidebar Content component
function SidebarContent({
  activeModule,
  onNavigate,
  collapsed,
}: {
  activeModule: ActiveModule;
  onNavigate: (module: ActiveModule) => void;
  collapsed: boolean;
}) {
  return (
    <div className={cn("p-4 py-6 h-full flex flex-col", collapsed && "px-2")}>
      <h2
        className={cn(
          "font-semibold text-xl mb-6",
          collapsed && "text-center text-base mb-4"
        )}
      >
        {collapsed ? "Menu" : "Payment Utilities"}
      </h2>

      <nav className="space-y-2 flex-1">
        <Collapsible defaultOpen className="group">
          <CollapsibleTrigger
            className={cn(
              "flex items-center w-full rounded-md p-2",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-all duration-200",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            {!collapsed && <span>TLV Utilities</span>}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform group-data-[state=open]:rotate-180",
                collapsed ? "mx-auto" : "ml-auto"
              )}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-1 space-y-1">
            <SidebarItem
              icon={<FileCode size={18} />}
              current={activeModule === "tlv"}
              onClick={() => onNavigate("tlv")}
              collapsed={collapsed}
            >
              TLV Parser
            </SidebarItem>
            <SidebarItem
              icon={<Tag size={18} />}
              current={activeModule === "custom-tags"}
              onClick={() => onNavigate("custom-tags")}
              collapsed={collapsed}
            >
              Custom Tags
            </SidebarItem>
            <SidebarItem
              icon={<GitCompare size={18} />}
              current={activeModule === "tlv-comparison"}
              onClick={() => onNavigate("tlv-comparison")}
              collapsed={collapsed}
            >
              TLV Compare
            </SidebarItem>
          </CollapsibleContent>
        </Collapsible>

        <SidebarItem
          icon={<CreditCard size={18} />}
          current={activeModule === "iso8583"}
          onClick={() => onNavigate("iso8583")}
          collapsed={collapsed}
        >
          ISO 8583
        </SidebarItem>
        <SidebarItem
          icon={<KeyRound size={18} />}
          current={activeModule === "crypto"}
          onClick={() => onNavigate("crypto")}
          collapsed={collapsed}
        >
          Crypto Utils
        </SidebarItem>
        <SidebarItem
          icon={<Settings size={18} />}
          current={activeModule === "settings"}
          onClick={() => onNavigate("settings")}
          collapsed={collapsed}
        >
          Settings
        </SidebarItem>
      </nav>
    </div>
  );
}

// Modified SidebarItem with Tooltip for collapsed state
function SidebarItem({
  children,
  icon,
  current = false,
  onClick,
  collapsed = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  current?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}): JSX.Element {
  const button = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-md text-sm w-full",
        collapsed ? "justify-center py-2 px-2" : "text-left py-2 px-3",
        "transition-all duration-200",
        current
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className={cn("flex-shrink-0", !collapsed && "mr-2")}>{icon}</span>
      {!collapsed && <span className="truncate">{children}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{children}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
