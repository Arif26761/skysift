import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    /*
     * The default environment is plain Node, not a simulated DOM.
     *
     * Almost everything under test here is the functional core — pure functions
     * over arrays — which has no business paying the start-up cost of a DOM.
     * Component tests opt in per file with a `@vitest-environment happy-dom`
     * docblock, so a DOM is only built where it is genuinely needed.
     *
     * happy-dom rather than jsdom: jsdom's dependency chain reaches ESM-only
     * packages that Node cannot `require()` before v20.19, which breaks the
     * suite on the current toolchain. happy-dom is ESM-clean and faster.
     */
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
