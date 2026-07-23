import { Wind } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * The application header.
 *
 * Sticky, translucent and hairline-bordered rather than a solid bar, so content
 * scrolling beneath it stays faintly readable through the blur. That keeps the
 * header reading as a layer over the document rather than as a lid on top of it
 * — and it is what lets the ambient glow at the top of the page carry through
 * the bar instead of stopping abruptly at its lower edge.
 */
export function SiteHeader() {
  return (
    <header className="border-line bg-background/70 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* next/link rather than a bare anchor: client-side navigation with
            prefetch, and it keeps scroll/focus handling consistent. */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="SkySift — home"
        >
          {/*
           * The mark is a chartreuse fill rather than an outlined tile. It is the
           * one place the brand colour appears at full strength above the fold,
           * and --primary-edge keeps its boundary visible on the light ground
           * where chartreuse is only ~1.5:1 against white.
           */}
          <span
            className="bg-primary border-primary-edge inline-flex h-8 w-8 items-center justify-center rounded-[10px] border"
            aria-hidden="true"
          >
            <Wind className="text-primary-fg h-4 w-4" />
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
