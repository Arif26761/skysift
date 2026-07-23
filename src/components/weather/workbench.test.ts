import { describe, expect, it } from "vitest";

import { resolveFiltersOpen } from "./workbench";

/**
 * Regression cover for two related bugs in the filter panel's open state.
 *
 * `override` means "what the user toggled *during the current visit* to this
 * layout". `Workbench` discards it whenever the breakpoint changes, so `null`
 * here represents having just arrived at a layout — which is why the round-trip
 * cases below pass `null` after a resize rather than the previous value.
 */
describe("resolveFiltersOpen", () => {
  it("collapses by default on a narrow screen", () => {
    // At 375px the results, not the controls, own the first screenful.
    expect(resolveFiltersOpen(false, null)).toBe(false);
  });

  it("expands by default on a wide screen", () => {
    expect(resolveFiltersOpen(true, null)).toBe(true);
  });

  it("honours a toggle made during the current narrow-screen visit", () => {
    expect(resolveFiltersOpen(false, true)).toBe(true);
    expect(resolveFiltersOpen(false, false)).toBe(false);
  });

  it("never lets a narrow-screen toggle hide the panel on a wide screen", () => {
    /*
     * Bug one. Closing the panel on mobile then widening the window left
     * `override === false` in force, and with no visible summary on desktop
     * there was nothing left to reopen it with — unreachable UI, not merely a
     * wrong default.
     */
    expect(resolveFiltersOpen(true, false)).toBe(true);
  });

  it("keeps the wide-screen panel open whatever the override says", () => {
    expect(resolveFiltersOpen(true, true)).toBe(true);
    expect(resolveFiltersOpen(true, null)).toBe(true);
  });

  it("re-collapses on returning to a narrow screen after opening on one", () => {
    /*
     * Bug two. Opening the panel on a phone, widening, and coming back left it
     * expanded — so the narrow layout no longer opened with results in view,
     * which is the entire reason it collapses there.
     *
     * The breakpoint change clears the override, so the return trip is
     * indistinguishable from a first visit.
     */
    expect(resolveFiltersOpen(false, true)).toBe(true); // opened on mobile
    expect(resolveFiltersOpen(true, null)).toBe(true); // widened — override cleared
    expect(resolveFiltersOpen(false, null)).toBe(false); // back to mobile: closed
  });

  it("also re-collapses when the panel was closed before the round trip", () => {
    expect(resolveFiltersOpen(false, false)).toBe(false);
    expect(resolveFiltersOpen(true, null)).toBe(true);
    expect(resolveFiltersOpen(false, null)).toBe(false);
  });
});
