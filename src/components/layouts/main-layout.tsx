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
  GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Define the available modules
type ActiveModule = "tlv" | "iso8583" | "crypto" | "settings" | "custom-tags" | "tlv-comparison";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-svh bg-background flex">
      {/* Mobile sidebar toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed z-50 top-4 left-4 lg:hidden"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 bg-muted/40 border-r w-64 transition-transform duration-300 ease-in-out z-40",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6">
          <h2 className="font-semibold text-xl mb-6">Payment Utilities</h2>
          <nav className="space-y-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex flex-row items-center gap-x-16">
                    TLV Utilities
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarItem
                      icon={<FileCode size={18} />}
                      current={activeModule === "tlv"}
                      onClick={() => onNavigate("tlv")}
                    >
                      TLV Parser
                    </SidebarItem>
                    <SidebarItem
                      icon={<Tag size={18} />}
                      current={activeModule === "custom-tags"}
                      onClick={() => onNavigate("custom-tags")}
                    >
                      Custom Tags
                    </SidebarItem>
                    <SidebarItem
                      icon={<GitCompare size={18} />}
                      current={activeModule === "tlv-comparison"}
                      onClick={() => onNavigate("tlv-comparison")}
                    >
                      TLV Compare
                    </SidebarItem>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarItem
              icon={<CreditCard size={18} />}
              current={activeModule === "iso8583"}
              onClick={() => onNavigate("iso8583")}
            >
              ISO 8583
            </SidebarItem>
            <SidebarItem
              icon={<KeyRound size={18} />}
              current={activeModule === "crypto"}
              onClick={() => onNavigate("crypto")}
            >
              Crypto Utils
            </SidebarItem>
            <SidebarItem
              icon={<Settings size={18} />}
              current={activeModule === "settings"}
              onClick={() => onNavigate("settings")}
            >
              Settings
            </SidebarItem>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          !sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        )}
      >
        {/* Header */}
        <header className="h-16 border-b sticky top-0 bg-background z-30 flex items-center px-6">
          <div className="w-full flex justify-between items-center">
            <h1 className="font-semibold text-lg">
              {activeModule === "tlv" && "TLV Parser"}
              {activeModule === "custom-tags" && "Custom Tag Management"}
              {activeModule === "tlv-comparison" && "TLV Comparison Tool"}
              {activeModule === "iso8583" && "ISO 8583 Message Parser"}
              {activeModule === "crypto" && "Cryptography Tools"}
              {activeModule === "settings" && "Settings"}
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
        <main className="p-6">{children}</main>
      </div>

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}

interface SidebarItemProps {
  children: ReactNode;
  icon: ReactNode;
  current?: boolean;
  onClick: () => void;
}

function SidebarItem({
  children,
  icon,
  current = false,
  onClick,
}: SidebarItemProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-x-2 px-3 py-2 rounded-md text-sm w-full text-left",
        current
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
