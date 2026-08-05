import { StrictMode, useEffect, type JSX } from "react";
import { ThemeProvider } from "next-themes";
import App from "@/App";
import { loadAndRegisterCustomBitfields } from "@/utils/tlv/load-custom-bitfields";
import { loadAndRegisterCustomTags } from "@/utils/tlv/load-custom-tags";

let registriesStarted = false;

function startBrowserRegistries(): void {
  if (registriesStarted || typeof document === "undefined") return;
  registriesStarted = true;

  void loadAndRegisterCustomTags().catch(() => {
    // Individual tools surface storage failures where the user can act on them.
  });
  void loadAndRegisterCustomBitfields();
}

/**
 * The one client-owned application seam.
 *
 * Astro and Bearnie own the document, route, global styles and static shell.
 * React owns only the stateful multi-pane payment-tool workspace until each
 * tool can be moved across this seam without duplicating browser state.
 */
export default function WorkspaceIsland(): JSX.Element {
  useEffect(() => {
    startBrowserRegistries();
  }, []);

  return (
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
}
