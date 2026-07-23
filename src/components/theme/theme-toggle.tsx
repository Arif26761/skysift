"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_STORAGE_KEY } from "./theme-script";

/**
 * Light/dark switch.
 *
 * Deliberately holds **no React state at all.**
 *
 * The `.dark` class on <html> is already the single source of truth — the inline
 * script in layout.tsx sets it before first paint, and every token in the design
 * system resolves through it. Mirroring that into `useState` would create a
 * second copy of the same fact, which is a bug waiting to happen and, because
 * the server cannot know which theme the client picked, guarantees either a
 * hydration mismatch or an effect that patches one up afterwards.
 *
 * So the button reads the class when clicked and writes the class back. Which
 * icon shows is decided by CSS from that same class (`hidden dark:block`), so
 * the correct glyph is painted on the very first frame with no JavaScript
 * involved and no flicker as React hydrates.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");

    /*
     * Bracket the swap so it lands in one frame instead of easing.
     *
     * Flipping `.dark` changes a colour on ~26 elements at once, and each one
     * carries `transition-colors`, so each animates to its new value
     * independently while the compositor is also rebuilding five blurred card
     * blooms and two backdrop-filter panes. That staggered fade reads as lag,
     * and a theme toggle is one of the few interactions where users expect
     * *instant*.
     *
     * Two nested rAFs, not one: the first fires before the browser has painted
     * the new theme, so removing the class there would let the transitions catch
     * the tail of the change and reintroduce the fade. The second runs after
     * that paint, which is the earliest point it is safe to restore them.
     */
    root.classList.add("sky-theme-switching");
    root.classList.toggle("dark", next);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove("sky-theme-switching");
      });
    });

    try {
      // Persisting the explicit choice is what makes it outrank the OS setting
      // on the next visit — see the precedence rule in theme-script.ts.
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing can refuse writes. The toggle still works for this
      // session; it simply will not be remembered.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      /*
       * A static label, because the button's state is not knowable at render
       * time on the server. "Toggle" is honest in both directions, whereas a
       * label like "Switch to dark theme" would be wrong half the time — worse
       * for a screen-reader user than a slightly less specific one.
       */
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
      className="border-line text-muted hover:text-text hover:bg-surface-2 hover:border-line-strong inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
    >
      <Moon className="h-4 w-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
    </button>
  );
}
