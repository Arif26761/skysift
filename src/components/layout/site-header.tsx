import { Wind } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * The application header.
 *
 * Sticky, translucent and hairline-bordered rather than a solid bar: the
 * graticule behind it stays faintly visible as the page scrolls, which keeps the
 * "instrument panel" reading rather than "website with a nav".
 */
export function SiteHeader() {
  return (
    <header className="border-line bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* next/link rather than a bare anchor: client-side navigation with
            prefetch, and it keeps scroll/focus handling consistent. */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="SkySift — home"
        >
          <span
            className="border-line bg-surface inline-flex h-8 w-8 items-center justify-center rounded-lg border"
            aria-hidden="true"
          >
            <Wind className="text-primary h-4 w-4" />
          </span>

          <span className="flex flex-col leading-none">
            <span className="sky-brand-text font-display text-[15px] font-bold tracking-tight">
              SkySift
            </span>
            {/* Hidden on the narrowest screens: at 375px the tagline would push
                the theme toggle off the row, and it is decorative, not load-bearing. */}
            <span className="text-subtle mt-0.5 hidden text-[10px] font-medium tracking-wide sm:block">
              WEATHER DATA, FILTERED
            </span>
          </span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
