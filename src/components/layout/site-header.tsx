"use client";

import { Wind } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * The application header.
 *
 * Sticky, translucent and hairline-bordered rather than a solid bar: the
 * graticule behind it stays faintly visible as the page scrolls, which keeps the
 * "instrument panel" reading rather than "website with a nav". The footer uses
 * the same blur, tinted with `--surface` instead — see `site-footer.tsx` for why
 * the two differ.
 *
 * It gains a shadow only once the page has scrolled, so it lies flat when there
 * is nothing beneath it and lifts when there is. A bar that is permanently
 * raised is casting a shadow onto nothing.
 *
 * Driven by an `IntersectionObserver` on a sentinel at the top of the document
 * rather than a scroll listener. A scroll handler runs on every frame of every
 * scroll for a boolean that changes twice; the observer is passive, fires only
 * when the sentinel actually crosses the boundary, and never touches the main
 * thread in between. Reading layout in a scroll handler is also the classic way
 * to cause forced reflow, which this sidesteps entirely.
 */
export function SiteHeader() {
  const [lifted, setLifted] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (element === null) return;

    const observer = new IntersectionObserver(([entry]) => {
      // The sentinel sits above the header, so "no longer visible" means the
      // document has scrolled and there is now content passing underneath.
      setLifted(entry !== undefined && !entry.isIntersecting);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/*
       * 1px rather than zero-height: a zero-size box has no area to intersect
       * with, and browsers do not reliably report intersection for one.
       */}
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />

      <header
        className={`border-line bg-background/70 sticky top-0 z-30 border-b backdrop-blur-xl transition-shadow duration-300 ${
          lifted ? "shadow-card" : "shadow-none"
        }`}
      >
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
    </>
  );
}
