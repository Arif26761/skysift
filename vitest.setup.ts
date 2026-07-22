/**
 * Global test setup.
 *
 * jest-dom's matchers (`toBeInTheDocument`, `toHaveAccessibleName`, …) are only
 * meaningful in a DOM environment, so they are registered lazily: files running
 * in the default `node` environment skip the import entirely and start faster,
 * while component tests that opt into happy-dom get the matchers automatically.
 */
export {};

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}
