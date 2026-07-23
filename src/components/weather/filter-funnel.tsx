"use client";

import { ChevronRight, RotateCcw, X } from "lucide-react";

import type { FilterKey, FilterLedger as Ledger } from "@/lib/weather/filter-insights";

interface FilterFunnelProps {
  readonly ledger: Ledger;
  readonly onClear: (key: FilterKey) => void;
  readonly onReset: () => void;
}

/**
 * The Filter Funnel — this project's signature interaction.
 *
 * Every filter UI shares one blind spot: you narrow the data, rows vanish, and
 * nothing tells you *which control* removed them. Users respond by resetting
 * things at random. That is exactly the failure the brief points at when it asks
 * whether a non-technical person could actually operate the thing — the question
 * a user has is never "how many results are there", it is "why did my city
 * disappear?"
 *
 * So the reduction is drawn as a pipeline:
 *
 *     12 loaded  ›  Country · BD −5  ›  Temp 20–30° −3  ›  3 shown
 *
 * Each stage is a button that clears that one filter, so the explanation and the
 * fix are the same object. The numbers come from a leave-one-out analysis in
 * `filter-insights.ts`, which is only affordable because `filterWeatherData` is
 * pure: it can be run once per active filter over the same data with no I/O and
 * no risk of the calls interfering with each other.
 *
 * ---------------------------------------------------------------------------
 * A DELIBERATE HONESTY CONSTRAINT — why this is not a tapering funnel shape.
 * ---------------------------------------------------------------------------
 *
 * `excluded` is a *marginal* contribution: how many extra records would appear
 * if that one filter were relaxed, with all the others left in place. When two
 * filters both reject the same city, neither gets credit for it — so the stage
 * numbers do NOT sum to `total - shown`.
 *
 * That makes the obvious visual — segments that each shave a proportional slice
 * off a narrowing bar — a lie. It would draw sequential subtraction over numbers
 * that are not sequential, and the widths would not reconcile with the endpoints.
 *
 * So each stage instead carries a *blame bar* scaled against the largest
 * exclusion in the current set. It encodes "which filter is costing you most",
 * which is a true statement about marginal contributions and is the actual
 * question a user is asking. The endpoints (`total`, `shown`) are exact counts
 * and are stated as numbers, never inferred from a width.
 */
export function FilterFunnel({ ledger, onClear, onReset }: FilterFunnelProps) {
  const { total, shown, active } = ledger;

  /*
   * Scale blame bars against the worst offender rather than against `total`.
   * Against `total` a set of small-but-unequal exclusions would render as a row
   * of near-identical slivers, which is precisely when the comparison matters
   * most. Relative scaling keeps the ranking legible at any magnitude.
   */
  const worst = active.reduce((max, entry) => Math.max(max, entry.excluded), 0);

  return (
    <div className="min-w-0">
      {/*
       * One concise announcement rather than making the whole rail live. A live
       * region spanning every stage would re-read the entire pipeline on each
       * keystroke of a slider drag; this reads the outcome, which is the part
       * that changed. "polite" waits for a pause instead of interrupting.
       */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {shown} of {total} {total === 1 ? "city" : "cities"} shown
        {active.length > 0 ? `, ${active.length} filters active` : ""}
      </p>

      {active.length === 0 ? (
        /*
         * No filters: collapse to a single quiet line. An empty rail with one
         * lonely endpoint would be chrome describing the absence of an
         * explanation — worse than saying nothing.
         */
        <p className="text-muted text-sm">
          <span className="sky-numeric text-text font-semibold">{total}</span>{" "}
          {total === 1 ? "city" : "cities"} loaded
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          <Endpoint value={total} label="loaded" />

          <ul className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-2">
            {active.map((entry) => (
              <li key={entry.key} className="flex items-center gap-x-1.5">
                <Chevron />
                <Stage
                  entry={entry}
                  worst={worst}
                  /*
                   * The bar is a comparison device, so it needs something to
                   * compare against. With a single active filter it is always
                   * the worst offender and always renders full width, which
                   * carries no information and reads as a stray underline on
                   * the chip. Below two filters it is simply not drawn.
                   */
                  showBlame={active.length > 1}
                  onClear={onClear}
                />
              </li>
            ))}
          </ul>

          <Chevron />
          <Endpoint value={shown} label="shown" terminal />

          <button
            type="button"
            onClick={onReset}
            className="text-subtle hover:text-primary-text ml-1 inline-flex items-center gap-1 text-xs font-medium transition-colors"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset all
          </button>
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <ChevronRight className="text-subtle h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  );
}

/**
 * A pipeline endpoint — the exact count entering or leaving the funnel.
 *
 * The terminal endpoint is the only chartreuse fill in the results area, so the
 * eye lands on the answer. It carries a `--primary-edge` border because
 * chartreuse on a light surface is ~1.5:1 and the shape's boundary would
 * otherwise be invisible (WCAG 1.4.11 asks for 3:1 on a component's edge, not
 * just on its text).
 */
function Endpoint({
  value,
  label,
  terminal = false,
}: {
  value: number;
  label: string;
  terminal?: boolean;
}) {
  return (
    <span
      className={
        terminal
          ? "bg-primary text-primary-fg border-primary-edge inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
          : "border-line bg-surface text-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
      }
    >
      <span className="sky-numeric font-bold">{value}</span>
      {label}
    </span>
  );
}

/**
 * One filter's stage in the pipeline.
 *
 * The whole chip is the clear-this-filter control rather than a chip with a
 * small × inside it. At 375px a 20px dismiss target inside a chip is a miss
 * waiting to happen, and there is no second action competing for the chip — so
 * the entire surface can be the button.
 */
function Stage({
  entry,
  worst,
  showBlame,
  onClear,
}: {
  entry: Ledger["active"][number];
  worst: number;
  showBlame: boolean;
  onClear: (key: FilterKey) => void;
}) {
  const { key, label, excluded } = entry;
  const blame = worst > 0 ? (excluded / worst) * 100 : 0;

  /*
   * The count reads as a consequence, not a statistic: "clearing this brings
   * back 5 cities". A filter excluding nothing is still worth showing — it tells
   * the user not to waste time relaxing that one — so it renders as −0 in muted
   * type rather than being hidden.
   */
  const consequence =
    excluded > 0
      ? `Clear ${label}, currently hiding ${excluded} ${excluded === 1 ? "city" : "cities"}`
      : `Clear ${label}, currently hiding no cities`;

  return (
    <button
      type="button"
      onClick={() => onClear(key)}
      aria-label={consequence}
      title={consequence}
      className="group border-line bg-surface hover:border-border-strong hover:bg-surface-2 relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border py-1 pr-2 pl-2.5 text-xs transition-colors"
    >
      <span className="text-text font-medium">{label}</span>

      <span
        className={`sky-numeric font-semibold ${
          excluded > 0 ? "text-danger" : "text-subtle"
        }`}
      >
        −{excluded}
      </span>

      <X
        className="text-subtle group-hover:text-danger h-3 w-3 shrink-0 transition-colors"
        aria-hidden="true"
      />

      {/*
       * The blame bar. Hairline, seated on the chip's bottom edge, width scaled
       * against the worst offender. It transitions rather than snapping so that
       * dragging a slider reads as one filter's cost growing relative to the
       * others — the comparison is the information. Reduced-motion users get the
       * width without the travel, handled globally in globals.css.
       */}
      {showBlame && (
        <span
          aria-hidden="true"
          className="bg-danger/70 absolute bottom-0 left-0 h-0.5 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${blame}%` }}
        />
      )}
    </button>
  );
}
