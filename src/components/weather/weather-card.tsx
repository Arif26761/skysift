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
 * The condition is encoded three times over — a coloured rail down the left
 * edge, the icon, and the text label. That redundancy is not indecision: it is
 * what makes the card readable when colour is unavailable (colour-blindness,
 * greyscale printing) or invisible (screen readers). "Don't rely on colour
 * alone" is a requirement, and three encodings is how it is met.
 *
 * Temperature is the hero because it is the value people scan for. Humidity and
 * wind sit below in mono, where they can be compared down a column without the
 * eye having to re-find them on each card.
 */
export function WeatherCard({ record, domain }: WeatherCardProps) {
  const style = conditionStyle(record.conditionGroup);

  return (
    <article className="sky-enter border-line bg-surface shadow-card hover:shadow-raised hover:border-line-strong relative overflow-hidden rounded-[14px] border p-4 transition-all">
      {/* The condition rail. Decorative — the label below carries the meaning. */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: style.color }}
        aria-hidden="true"
      />

      <div className="pl-2">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-text truncate text-base font-semibold">
              {record.city}
            </h3>
            <p className="text-subtle sky-numeric mt-0.5 text-[11px] tracking-wide">
              {record.countryCode}
            </p>
          </div>

          <span
            className="border-line inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2 text-xs"
            style={{ backgroundColor: style.tint }}
          >
            <ConditionIcon group={record.conditionGroup} className="h-3.5 w-3.5" />
            <span className="text-text font-medium">{style.label}</span>
          </span>
        </header>

        <div className="mt-3 flex items-baseline gap-2">
          <p className="sky-numeric text-text text-3xl leading-none font-semibold">
            {record.temperature.toFixed(1)}
            <span className="text-muted text-xl">°C</span>
          </p>
          <p className="text-subtle text-xs">
            feels <span className="sky-numeric">{record.feelsLike.toFixed(1)}°</span>
          </p>
        </div>

        {/* The description is the only free text on the card, so it is kept small
            and muted — it adds nuance without competing with the numbers. */}
        <p className="text-muted mt-1 truncate text-xs capitalize">
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
