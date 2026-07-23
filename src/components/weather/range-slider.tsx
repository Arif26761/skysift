"use client";

import { useId } from "react";

interface RangeSliderProps {
  readonly label: string;
  /** Inclusive domain of the control itself, not of the data. */
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  /** `undefined` means "no lower bound", not "the lowest value". */
  readonly valueMin: number | undefined;
  readonly valueMax: number | undefined;
  readonly onChange: (next: {
    min: number | undefined;
    max: number | undefined;
  }) => void;
  /** Where the loaded data actually sits, drawn as ticks on the track. */
  readonly marks?: readonly number[];
  readonly format: (value: number) => string;
}

/**
 * A dual-thumb range control.
 *
 * ---------------------------------------------------------------------------
 * THE CENTRAL MAPPING: a thumb parked at the domain edge means *no constraint*.
 * ---------------------------------------------------------------------------
 *
 * `WeatherFilters.minTemp` and `maxTemp` are optional, and an absent bound is
 * deliberately different from a bound that happens to sit at the lowest value —
 * `filterWeatherData` treats the first as "don't constrain" and the second as a
 * real comparison. A slider, though, always has a concrete position for every
 * thumb, so the two states have to be reconciled somewhere.
 *
 * They are reconciled here: a thumb resting on its end of the domain emits
 * `undefined` rather than the number under it. That keeps three things true at
 * once — dragging the handle fully left genuinely clears the lower bound, the
 * Filter Funnel stops listing temperature as an active filter, and the pure core
 * never has to learn what a slider is.
 *
 * The alternative — emitting the edge number — would leave a permanently
 * "active" temperature filter that excludes nothing, which is exactly the kind
 * of phantom control the funnel exists to expose.
 */
export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  marks = [],
  format,
}: RangeSliderProps) {
  const id = useId();

  // An unset bound renders at its domain edge — see the note above.
  const low = valueMin ?? min;
  const high = valueMax ?? max;

  const span = max - min;
  const toPercent = (value: number) => ((value - min) / span) * 100;

  /**
   * Thumbs may meet but never cross.
   *
   * Letting them swap roles mid-drag is a well-known way to make a range control
   * feel broken: the handle under the cursor silently becomes the other bound
   * and the drag inverts. Clamping each thumb against the other keeps the handle
   * you grabbed the handle you are moving.
   */
  const commit = (next: { low?: number; high?: number }) => {
    /*
     * Clamp each thumb against the *other's current position* — never derive
     * both from a min/max of the pair. Doing the latter looks equivalent and is
     * not: dragging the upper thumb past the lower one would resolve to
     * (lower=dragged, upper=old lower), silently swapping which bound the user
     * is holding instead of stopping it where the other thumb sits.
     */
    const nextLow = next.low !== undefined ? Math.min(next.low, high) : low;
    const nextHigh = next.high !== undefined ? Math.max(next.high, low) : high;

    onChange({
      min: nextLow <= min ? undefined : nextLow,
      max: nextHigh >= max ? undefined : nextHigh,
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-muted text-xs font-medium">{label}</span>
        <span className="sky-numeric text-text text-xs font-semibold">
          {valueMin === undefined && valueMax === undefined
            ? "Any"
            : `${format(low)} – ${format(high)}`}
        </span>
      </div>

      <div className="relative h-5">
        {/* Track. */}
        <div className="bg-surface-3 absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />

        {/* Selected span. */}
        <div
          className="bg-primary absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: `${toPercent(low)}%`,
            width: `${toPercent(high) - toPercent(low)}%`,
          }}
        />

        {/*
         * Data extent ticks, drawn *after* the selected span so they stay
         * visible inside it. Painting them first hides every tick that falls
         * within the current selection — which is precisely the region the user
         * is reasoning about when they decide where to drag next.
         *
         * Without them the domain is abstract: nothing tells you whether pulling
         * to 40° removes one city or all of them.
         */}
        {marks.map((mark, index) => (
          <span
            key={`${mark}-${index}`}
            aria-hidden="true"
            className="bg-text absolute top-1/2 h-2 w-px -translate-y-1/2 rounded-full opacity-45"
            style={{ left: `${toPercent(mark)}%` }}
          />
        ))}

        <input
          type="range"
          className="sky-range"
          id={`${id}-min`}
          aria-label={`${label}, lower bound`}
          aria-valuetext={valueMin === undefined ? "No lower bound" : format(low)}
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(event) => commit({ low: Number(event.target.value) })}
        />

        <input
          type="range"
          className="sky-range"
          id={`${id}-max`}
          aria-label={`${label}, upper bound`}
          aria-valuetext={valueMax === undefined ? "No upper bound" : format(high)}
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(event) => commit({ high: Number(event.target.value) })}
        />
      </div>

      <div className="text-subtle mt-1 flex justify-between text-[10px]">
        <span className="sky-numeric">{format(min)}</span>
        <span className="sky-numeric">{format(max)}</span>
      </div>
    </div>
  );
}
