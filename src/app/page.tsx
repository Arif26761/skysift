import { ConditionLegend } from "@/components/weather/condition-legend";

/**
 * TEMPORARY — design-system preview.
 *
 * This page exists so the token system, typography and condition language can be
 * reviewed on their own, before a dozen components are built on top of them. It
 * is replaced by the real application shell in the UI PR that follows.
 */

const SWATCHES = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "surface-2", className: "bg-surface-2" },
  { name: "surface-3", className: "bg-surface-3" },
  { name: "primary", className: "bg-primary" },
  { name: "accent", className: "bg-accent" },
  { name: "danger", className: "bg-danger" },
  { name: "warning", className: "bg-warning" },
] as const;

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Weather data, <span className="sky-brand-text">filtered</span>.
        </h1>
        <p className="text-muted mt-3 text-[15px] leading-relaxed">
          Add any list of cities, then slice the results by country, temperature,
          condition and humidity — and see exactly what each filter removed.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-subtle text-xs font-semibold tracking-wider uppercase">
          Condition key
        </h2>
        <div className="mt-3">
          <ConditionLegend />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-subtle text-xs font-semibold tracking-wider uppercase">
          Surfaces
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {SWATCHES.map((swatch) => (
            <div key={swatch.name} className="w-24">
              <div
                className={`border-line h-12 w-full rounded-lg border ${swatch.className}`}
              />
              <p className="text-subtle mt-1.5 font-mono text-[10px]">{swatch.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-subtle text-xs font-semibold tracking-wider uppercase">
          Type scale
        </h2>
        <div className="border-line bg-surface shadow-card mt-3 space-y-3 rounded-[14px] border p-5">
          <p className="font-display text-2xl font-bold">Space Grotesk — display</p>
          <p className="text-[15px]">Inter — interface copy at fifteen pixels.</p>
          <p className="sky-numeric text-2xl font-semibold">
            32.4°C <span className="text-muted text-base">74% · 3.1 m/s</span>
          </p>
          <p className="text-subtle text-xs">
            Numerals use JetBrains Mono with tabular figures, so values never shift
            horizontally as they update.
          </p>
        </div>
      </section>
    </div>
  );
}
