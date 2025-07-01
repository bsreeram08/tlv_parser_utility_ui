import { TlvViewer } from "@/components/ui/tlv-viewer/tlv-viewer";
import { IsoViewer } from "@/components/ui/iso-builder/iso-viewer";
import { CustomTagManager } from "@/components/ui/custom-tags/custom-tag-manager";
import { TlvComparison } from "@/components/ui/tlv-comparison/tlv-comparison";
import { MainLayout } from "@/components/layouts/main-layout";
import { Toaster } from "sonner";
import { useState } from "react";

// Define the available modules
type ActiveModule =
  | "tlv"
  | "iso8583"
  | "crypto"
  | "settings"
  | "custom-tags"
  | "tlv-comparison";

function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("tlv");

  // Handler for sidebar navigation
  const handleNavigation = (module: ActiveModule) => {
    setActiveModule(module);
  };

  // Render the active module content
  const renderModule = () => {
    switch (activeModule) {
      case "tlv":
        return <TlvViewer />;
      case "custom-tags":
        return <CustomTagManager />;
      case "tlv-comparison":
        return <TlvComparison />;
      case "iso8583":
        return <IsoViewer />;
      case "crypto":
        return (
          <div className="p-6 bg-muted/40 rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-2">Cryptography Tools</h2>
            <p className="text-muted-foreground">Coming soon</p>
          </div>
        );
      case "settings":
        return (
          <div className="p-6 bg-muted/40 rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-2">Settings</h2>
            <p className="text-muted-foreground">Coming soon</p>
          </div>
        );
      default:
        return <TlvViewer />;
    }
  };

  // Determine if current module needs full width
  const needsFullWidth = activeModule === "tlv-comparison";

  return (
    <>
      <MainLayout onNavigate={handleNavigation} activeModule={activeModule}>
        <div className={`w-full mx-auto ${
          needsFullWidth ? "max-w-none px-4" : "max-w-5xl"
        }`}>
          {renderModule()}
        </div>
      </MainLayout>

      {/* Global toast notifications */}
      <Toaster position="top-right" />
    </>
  );
}

export default App;
