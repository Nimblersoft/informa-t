/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const wranglerConfigPath = fileURLToPath(
  new URL("./wrangler.jsonc", import.meta.url),
);

export default defineConfig({
  root: "src",
  plugins: [react(), cloudflare({ configPath: wranglerConfigPath })],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
  },
});
