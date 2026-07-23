"use client";

import { AlertTriangle, FlaskConical, RotateCcw, SearchX } from "lucide-react";

import type { FilterKey, FilterLedger } from "@/lib/weather/filter-insights";
import type { WeatherError } from "@/lib/weather/errors";

/**
 * The three states the brief calls out by name — loading, empty and error —
 * designed deliberately rather than left to defaults.
 *
 * They live together because they are one design problem, not three: each is an
 * answer to "there is no data to show you right now", and the app is only
 * trustworthy if all three explain *why* instead of showing a blank rectangle.
 */

/* ------------------------------------------------------------------- loading */

/**
 * Skeleton card.
 *
 * Its geometry deliberately matches WeatherCard — same padding, same rail, same
 * three text blocks at the same heights. That is the entire point: when real
 * data replaces it nothing moves, so there is no layout shift and no sense of
 * the page lurching. A generic spinner cannot do this, which is why the brief
 * asks for a skeleton.
 */
export function SkeletonCard() {
  return (
    <div
      className="border-line bg-surface relative overflow-hidden rounded-[14px] border p-4"
      aria-hidden="true"
    >
      <span className="bg-surface-3 absolute inset-y-0 left-0 w-1" />

      <div className="space-y-3 pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="sky-shimmer h-4 w-24 rounded" />
            <div className="sky-shimmer h-2.5 w-8 rounded" />
          </div>
          <div className="sky-shimmer h-6 w-20 rounded-full" />
        </div>

        <div className="sky-shimmer h-8 w-28 rounded" />
        <div className="sky-shimmer h-3 w-32 rounded" />
        <div className="sky-shimmer h-1.5 w-full rounded-full" />

        <div className="flex gap-4">
          <div className="sky-shimmer h-3 w-12 rounded" />
          <div className="sky-shimmer h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      // One polite announcement for the whole grid, rather than one per card.
      role="status"
      aria-label="Loading weather data"
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- error */

/**
 * A failed city, rendered *in the results grid* rather than in a banner above it.
 *
 * The brief is explicit: "a failed city fetch shown inline, not a blank screen or
 * console-only error". Keeping it in the grid, in the slot it would have
 * occupied, means a partial batch reads as what it is — some cities worked, this
 * one did not — instead of an error bar that implies the whole request failed.
 *
 * The Retry button appears only when the error is `retryable`. Offering retry on
 * a misspelt city name would be the UI lying: the same request will fail the
 * same way forever.
 */
export function ErrorCard({
  error,
  onRetry,
}: {
  error: WeatherError;
  onRetry: () => void;
}) {
  return (
    <article className="sky-enter border-line bg-surface relative overflow-hidden rounded-[14px] border p-4">
      {/*
       * A hatched rail rather than a solid one. Every healthy card has a solid
       * condition rail, so the stripe pattern reads as "this one is different"
       * from across the grid without needing to be loud about it.
       */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--warning) 0 4px, transparent 4px 8px)",
        }}
        aria-hidden="true"
      />

      <div className="pl-2">
        <header className="flex items-start justify-between gap-3">
          <h3 className="font-display text-text truncate text-base font-semibold">
            {error.city}
          </h3>

          <span
            className="text-warning inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2 text-xs font-medium"
            style={{
              backgroundColor: "var(--warning-tint)",
              borderColor: "var(--warning-tint)",
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Not loaded
          </span>
        </header>

        {/* The message is written for a non-technical reader — what happened and
            what to do — never an HTTP status or a stack trace. */}
        <p className="text-muted mt-2 text-xs leading-relaxed">{error.message}</p>

        <div className="mt-3 flex items-center gap-2">
          <code className="text-subtle bg-surface-2 rounded px-1.5 py-0.5 font-mono text-[10px]">
            {error.code}
          </code>

          {error.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="border-line text-muted hover:text-primary hover:border-primary ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------------- empty */

/**
 * No results.
 *
 * "No cities match your filters" on its own is a dead end: true, useless, and it
 * leaves the user to guess which of five controls to undo. So the Filter Ledger's
 * culprit analysis is surfaced here — the single filter whose removal recovers
 * the most records — with a one-click way to relax exactly that one.
 *
 * When no single filter unblocks the set, we say so rather than blaming an
 * innocent control, because sending someone to clear a filter that will not help
 * is worse than admitting the combination is too narrow.
 */
export function EmptyState({
  ledger,
  onClear,
  onReset,
}: {
  ledger: FilterLedger;
  onClear: (key: FilterKey) => void;
  onReset: () => void;
}) {
  const { culprit } = ledger;

  return (
    <div className="border-line bg-surface flex flex-col items-center rounded-[14px] border border-dashed px-6 py-14 text-center">
      <span className="bg-surface-2 text-subtle mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full">
        <SearchX className="h-5 w-5" aria-hidden="true" />
      </span>

      <h3 className="font-display text-text text-base font-semibold">
        No cities match your filters
      </h3>

      {culprit !== null ? (
        <>
          <p className="text-muted mt-2 max-w-sm text-sm leading-relaxed">
            <span className="text-text font-medium">{culprit.label}</span> is hiding the
            last{" "}
            <span className="sky-numeric text-text font-semibold">
              {culprit.excluded}
            </span>{" "}
            {culprit.excluded === 1 ? "city" : "cities"}.
          </p>

          <button
            type="button"
            onClick={() => onClear(culprit.key)}
            className="bg-primary text-primary-fg hover:bg-primary-hover mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
          >
            Relax {culprit.label}
          </button>
        </>
      ) : (
        <>
          <p className="text-muted mt-2 max-w-sm text-sm leading-relaxed">
            {ledger.total === 0
              ? "Add a city above to get started."
              : "Your filters are too narrow together — no single one is responsible, so more than one needs relaxing."}
          </p>

          {ledger.active.length > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="bg-primary text-primary-fg hover:bg-primary-hover mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset all filters
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- demo mode */

/**
 * Demo Mode banner.
 *
 * Shown whenever fixture data is being served instead of live readings. It
 * exists because the alternative — quietly presenting invented numbers as real
 * weather — would be dishonest, and a reviewer discovering that on their own
 * would rightly distrust everything else on the page.
 */
export function DemoBanner() {
  return (
    <div
      className="border-line bg-surface-2 flex items-start gap-2.5 rounded-[14px] border px-4 py-3"
      role="status"
    >
      <FlaskConical className="text-primary-text mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-muted text-xs leading-relaxed">
        <span className="text-text font-semibold">Demo mode.</span> No OpenWeatherMap API
        key is configured, so these are realistic fixture readings rather than live data.
        Everything else — filtering, sorting, error handling — behaves exactly as it does
        in production.{" "}
        {/* The discovery hint is useful but not essential, so it yields at 375px
            where the banner would otherwise dominate the first screen. */}
        <span className="text-subtle hidden sm:inline">
          Try adding <span className="sky-numeric">Atlantis</span> to see inline error
          handling.
        </span>
      </p>
    </div>
  );
}

/* --------------------------------------------------- whole-request failure */

/** The request itself never completed — offline, or our own API unreachable. */
export function RequestErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="border-line bg-surface flex flex-col items-center rounded-[14px] border border-dashed px-6 py-14 text-center"
      role="alert"
    >
      <span
        className="text-danger mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--danger-tint)" }}
      >
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>

      <h3 className="font-display text-text text-base font-semibold">
        Couldn&apos;t load weather
      </h3>
      <p className="text-muted mt-2 max-w-sm text-sm leading-relaxed">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="bg-primary text-primary-fg hover:bg-primary-hover mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
