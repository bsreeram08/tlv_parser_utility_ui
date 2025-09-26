import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { loadAndRegisterCustomTags } from "@/utils/tlv/load-custom-tags";

// Load custom tag definitions (from IndexedDB) before mounting the app
loadAndRegisterCustomTags().catch(() => {
  // Ignore errors here; UI components will show messages if needed
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
