"use client";

import { X } from "lucide-react";

import type { FilterKey, FilterLedger as Ledger } from "@/lib/weather/filter-insights";

interface FilterLedgerProps {
  readonly ledger: Ledger;
  readonly onClear: (key: FilterKey) => void;
  readonly onReset: () => void;
}

/**
 * The Filter Ledger — this project's signature feature.
 *
 * Every filter UI shares one blind spot: you narrow the data, rows vanish, and
 * nothing tells you *which control* removed them. Users respond by resetting
 * things at random. That is precisely the failure the brief points at when it
 * asks whether a non-technical person could actually operate the thing.
 *
 * So each active filter gets a chip annotated with its exclusion count — how
 * many records would come back if that one filter were relaxed. The numbers come
 * from a leave-one-out analysis in `filter-insights.ts`, which is only cheap
 * because `filterWeatherData` is pure: it can be run six times over the same
 * data with no I/O and no risk of the calls interfering.
 *
 *     Showing 4 of 9   [Country · BD −5 ×] [Temp ≥ 25° −0 ×]   Reset all
 *
 * Reading a chip: "−5" means relaxing this filter brings five records back. A
 * chip showing "−0" is doing nothing on its own, which is itself useful — it
 * tells the user not to bother touching that one.
 */
export function FilterLedger({ ledger, onClear, onReset }: FilterLedgerProps) {
  const hasFilters = ledger.active.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/*
       * Announced politely: a sighted user watches the count change as they drag
       * a slider, and this is the equivalent signal for a screen-reader user.
       * "polite" rather than "assertive" so it waits for a pause instead of
       * interrupting on every keystroke.
       */}
      <p className="text-muted text-sm" aria-live="polite" aria-atomic="true">
        Showing{" "}
        <span className="sky-numeric text-text font-semibold">{ledger.shown}</span>
        <span className="text-subtle"> of </span>
        <span className="sky-numeric text-text font-semibold">{ledger.total}</span>
        <span className="text-subtle"> {ledger.total === 1 ? "city" : "cities"}</span>
      </p>

      {hasFilters && (
        <>
          <span className="bg-line hidden h-4 w-px sm:block" aria-hidden="true" />

          <ul className="flex flex-wrap items-center gap-1.5">
            {ledger.active.map((entry) => (
              <li key={entry.key}>
                <span className="border-line bg-surface inline-flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-xs">
                  <span className="text-text font-medium">{entry.label}</span>

                  {/*
                   * The count is the whole point of the chip, so it is visually
                   * distinct — muted when the filter is excluding nothing, and
                   * emphasised when it is doing real work.
                   */}
                  <span
                    className={`sky-numeric font-semibold ${
                      entry.excluded > 0 ? "text-danger" : "text-subtle"
                    }`}
                    title={
                      entry.excluded > 0
                        ? `Relaxing this filter would show ${entry.excluded} more ${
                            entry.excluded === 1 ? "city" : "cities"
                          }`
                        : "This filter is not excluding anything on its own"
                    }
                  >
                    −{entry.excluded}
                  </span>

                  <button
                    type="button"
                    onClick={() => onClear(entry.key)}
                    aria-label={`Clear filter: ${entry.label}`}
                    className="text-subtle hover:bg-surface-3 hover:text-danger inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onReset}
            className="text-subtle hover:text-primary text-xs font-medium underline underline-offset-2 transition-colors"
          >
            Reset all
          </button>
        </>
      )}
    </div>
  );
}
