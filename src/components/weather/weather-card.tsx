import { Droplets, Wind } from "lucide-react";

import { conditionStyle } from "@/lib/weather/conditions";
import type { WeatherRecord } from "@/lib/weather/types";

import { ConditionIcon } from "./condition-icon";

interface WeatherCardProps {
  readonly record: WeatherRecord;
  /** The temperature span of the whole result set, for the spectrum bar. */
  readonly domain: { readonly min: number; readonly max: number };
}

/**
 * One city.
 *
 * The condition is encoded three times over — a colour wash behind the card, the
 * icon, and the text label. That redundancy is not indecision: it is what makes
 * the card readable when colour is unavailable (colour-blindness, greyscale
 * printing) or invisible (screen readers). "Don't rely on colour alone" is a
 * requirement, and only the last of those three survives losing colour, which is
 * exactly why the label is never dropped for a tidier layout.
 *
 * Temperature is the hero because it is the value people scan for. Humidity and
 * wind sit below in mono, where they can be compared down a column without the
 * eye having to re-find them on each card.
 */
export function WeatherCard({ record, domain }: WeatherCardProps) {
  const style = conditionStyle(record.conditionGroup);

  return (
    <article className="sky-enter border-line bg-surface shadow-card hover:shadow-raised hover:border-line-strong rounded-card relative overflow-hidden border p-4 transition-all duration-200">
      {/*
       * The condition's colour as a soft bloom in the corner, replacing the hard
       * rail that used to run down the left edge.
       *
       * The rail meant the card carried three competing treatments at once —
       * border, shadow and a 4px block of saturated colour — and the colour won,
       * which made a grid of cards read as a stack of coloured tabs rather than
       * as data. A blurred wash tints the card with the same hue at a fraction of
       * the visual weight, so the eye lands on the temperature first and picks up
       * the condition second, which is the order they are actually read in.
       *
       * Still decorative: the icon and the text label below carry the meaning.
       */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-14 -right-12 h-36 w-36 rounded-full opacity-[0.16] blur-3xl dark:opacity-[0.26]"
        style={{ backgroundColor: style.color }}
      />

      <div className="relative">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-text truncate text-[15px] font-semibold">
              {record.city}
            </h3>
            <p className="text-subtle sky-numeric mt-0.5 text-[11px] tracking-wide">
              {record.countryCode}
            </p>
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-xs"
            style={{ backgroundColor: style.tint }}
          >
            <ConditionIcon group={record.conditionGroup} className="h-3.5 w-3.5" />
            <span className="text-text font-medium">{style.label}</span>
          </span>
        </header>

        {/*
         * The temperature is the hero and now reads like it. At the old 3xl it
         * competed with the city name for first look; the jump to 4xl with the
         * unit dropped to muted makes the scan order unambiguous.
         */}
        <div className="mt-4 flex items-baseline gap-2">
          <p className="sky-numeric text-text text-4xl leading-none font-semibold">
            {record.temperature.toFixed(1)}
            <span className="text-muted ml-0.5 text-xl font-medium">°C</span>
          </p>
          <p className="text-subtle text-xs">
            feels <span className="sky-numeric">{record.feelsLike.toFixed(1)}°</span>
          </p>
        </div>

        {/* The description is the only free text on the card, so it is kept small
            and muted — it adds nuance without competing with the numbers. */}
        <p className="text-muted mt-1.5 truncate text-xs capitalize">
          {record.description}
        </p>

        <ThermalBar value={record.temperature} domain={domain} color={style.color} />

        <dl className="text-muted mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Droplets className="text-subtle h-3.5 w-3.5" aria-hidden="true" />
            <dt className="sr-only">Humidity</dt>
            <dd className="sky-numeric">{record.humidity}%</dd>
          </div>

          <div className="flex items-center gap-1.5">
            <Wind className="text-subtle h-3.5 w-3.5" aria-hidden="true" />
            <dt className="sr-only">Wind speed</dt>
            <dd className="sky-numeric">{record.windSpeed.toFixed(1)} m/s</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/**
 * The thermal spectrum bar.
 *
 * A number in isolation is hard to judge — is 24°C warm for this set? The bar
 * places each city on the span of the *currently visible* results, so relative
 * warmth is legible at a glance and the whole grid can be read as a distribution
 * rather than nine unrelated figures.
 *
 * It is `aria-hidden` because it encodes no information the temperature reading
 * above it does not already state; announcing it would be noise.
 */
function ThermalBar({
  value,
  domain,
  color,
}: {
  value: number;
  domain: { min: number; max: number };
  color: string;
}) {
  const span = domain.max - domain.min;
  // When every city is the same temperature the span is zero. Centring the
  // marker is the honest rendering — the alternative is a division by zero.
  const ratio = span === 0 ? 0.5 : (value - domain.min) / span;
  const percent = Math.min(100, Math.max(0, ratio * 100));

  return (
    <div
      className="bg-surface-2 relative mt-3 h-1.5 overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <span
        className="absolute top-0 bottom-0 w-1.5 rounded-full"
        style={{
          backgroundColor: color,
          // translateX(-50%) keeps the marker centred on its value instead of
          // hanging off the end at the extremes.
          left: `${percent}%`,
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}
