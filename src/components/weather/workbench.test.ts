import { describe, expect, it } from "vitest";

import { resolveFiltersOpen } from "./workbench";

/**
 * Regression cover for a real bug.
 *
 * The original rule was `override ?? isDesktop`, which let a toggle made on a
 * narrow screen survive a resize. Because the panel's `<summary>` is hidden on
 * desktop, a collapsed panel there had no control that could reopen it — the
 * filters became unreachable rather than merely mis-defaulted.
 */
describe("resolveFiltersOpen", () => {
  it("collapses by default on a narrow screen", () => {
    // At 375px the results, not the controls, own the first screenful.
    expect(resolveFiltersOpen(false, null)).toBe(false);
  });

  it("expands by default on a wide screen", () => {
    expect(resolveFiltersOpen(true, null)).toBe(true);
  });

  it("honours a toggle made on a narrow screen", () => {
    expect(resolveFiltersOpen(false, true)).toBe(true);
    expect(resolveFiltersOpen(false, false)).toBe(false);
  });

  it("never lets a narrow-screen toggle hide the panel on a wide screen", () => {
    /*
     * The bug. Closing the panel on mobile then widening the window left
     * `override === false` in force, and with no visible summary on desktop
     * there was nothing left to reopen it with.
     */
    expect(resolveFiltersOpen(true, false)).toBe(true);
  });

  it("keeps the wide-screen panel open whatever the override says", () => {
    expect(resolveFiltersOpen(true, true)).toBe(true);
    expect(resolveFiltersOpen(true, null)).toBe(true);
  });

  it("restores the narrow-screen preference after a round trip through desktop", () => {
    // Closed on mobile -> widened (forced open) -> back to mobile: still closed.
    const override = false;

    expect(resolveFiltersOpen(false, override)).toBe(false);
    expect(resolveFiltersOpen(true, override)).toBe(true);
    expect(resolveFiltersOpen(false, override)).toBe(false);
  });
});
