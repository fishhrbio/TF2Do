import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    modulePreload: { polyfill: false },
    license: { fileName: "THIRD-PARTY-LICENSES.md" },
  },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
