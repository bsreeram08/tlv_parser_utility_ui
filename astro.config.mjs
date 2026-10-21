import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Shown in the toolbar so a release can be checked against the merged commit.
function buildVersion() {
  try {
    return execSync("git rev-parse --short=7 HEAD").toString().trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? "dev";
  }
}

export default defineConfig({
  integrations: [react()],
  output: "static",
  vite: {
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
