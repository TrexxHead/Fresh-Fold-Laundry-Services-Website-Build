import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  cacheDir: ".vitest-cache",
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    globals: true,
    coverage: { reporter: ["text", "html"] }
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } }
});
