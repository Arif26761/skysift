"use client";

import { conditionStyle } from "@/lib/weather/conditions";
import type { WeatherRecord } from "@/lib/weather/types";

interface PlotViewProps {
  /** Everything loaded, including records the filters currently reject. */
  readonly records: readonly WeatherRecord[];
  /** The records that survive the current filters. */
  readonly visible: readonly WeatherRecord[];
}

/*
 * Geometry of the SVG coordinate space, scaled to fit by the viewBox.
 *
 * Roughly 2:1 on purpose. The plot spans the full results column, so a squarer
 * viewBox renders several hundred pixels taller than the card grid it replaces
 * and pushes the axis off the fold.
 */
const WIDTH = 560;
const HEIGHT = 270;
const PAD = { top: 18, right: 20, bottom: 32, left: 40 };

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Below this separation two labels are treated as colliding. */
const LABEL_GAP = { x: 52, y: 13 };

interface PlacedPoint {
  readonly record: WeatherRecord;
  readonly cx: number;
  readonly cy: number;
  readonly shown: boolean;
  /** Label above the dot, or below it when placing above would collide. */
  readonly labelY: number;
}

/**
 * Cities plotted on a temperature × humidity plane.
 *
 * The card grid and the table both answer "what survived?". This view answers
 * the question the funnel raises but cannot place: **where did the excluded
 * cities go?**
 *
 * Filtered-out records are not removed — they are drawn hollow and dimmed, in
 * position, and still labelled. So narrowing a range visibly pushes cities
 * outside the band rather than making them vanish, and "why did my city
 * disappear?" is answered by pointing at it. That is the same honesty principle
 * the funnel is built on, expressed spatially instead of numerically.
 *
 * Hand-drawn SVG rather than a charting library: this is one scatter with two
 * linear scales, and Recharts or Chart.js would add tens of kilobytes plus a
 * theming layer to restyle, to draw about forty elements.
 */
export function PlotView({ records, visible }: PlotViewProps) {
  if (records.length === 0) return null;

  const shown = new Set(visible.map((record) => record.city));

  const temps = records.map((record) => record.temperature);
  const rawMin = Math.min(...temps);
  const rawMax = Math.max(...temps);

  /*
   * Temperature has no natural bounds, so it is scaled to the data with padding.
   * The degenerate case matters: one city, or several at an identical
   * temperature, gives a zero-width domain and every x would divide by zero.
   */
  const pad = rawMax - rawMin < 1 ? 5 : (rawMax - rawMin) * 0.15;
  const minTemp = rawMin - pad;
  const maxTemp = rawMax + pad;

  const x = (temp: number) =>
    PAD.left + ((temp - minTemp) / (maxTemp - minTemp)) * PLOT_W;

  /*
   * Humidity keeps its true 0–100 domain rather than being scaled to the data.
   * It is a percentage, so absolute position carries meaning — fitting it to the
   * extent would make 70% and 75% look like opposite ends of the scale.
   */
  const y = (humidity: number) => PAD.top + (1 - humidity / 100) * PLOT_H;

  /*
   * Place labels, flipping one below its dot when it would collide with a label
   * already placed. Cities at similar temperature and humidity are exactly the
   * interesting case — a cluster — and two names printed on top of each other
   * is where a scatter plot stops being readable.
   *
   * O(n²) over a set capped at 25 cities: ~300 comparisons, far below anything
   * worth indexing.
   */
  const placed: PlacedPoint[] = [];

  for (const record of records) {
    const cx = x(record.temperature);
    const cy = y(record.humidity);
    const above = cy - 10;

    const collides = placed.some(
      (other) =>
        Math.abs(other.cx - cx) < LABEL_GAP.x &&
        Math.abs(other.labelY - above) < LABEL_GAP.y,
    );

    placed.push({
      record,
      cx,
      cy,
      shown: shown.has(record.city),
      labelY: collides ? cy + 16 : above,
    });
  }

  const humidityTicks = [0, 25, 50, 75, 100];
  const tempTicks = [minTemp, (minTemp + maxTemp) / 2, maxTemp];

  return (
    <div className="border-line bg-surface shadow-card rounded-[16px] border p-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Scatter plot of ${records.length} cities by temperature and humidity. ${visible.length} match the current filters. Switch to table view for the same data as text.`}
      >
        {humidityTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(tick) + 3}
              textAnchor="end"
              className="fill-subtle text-[8px]"
            >
              {tick}%
            </text>
          </g>
        ))}

        {tempTicks.map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={HEIGHT - PAD.bottom + 14}
            textAnchor="middle"
            className="fill-subtle text-[8px]"
          >
            {Math.round(tick)}°
          </text>
        ))}

        <text
          x={PAD.left + PLOT_W / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          className="fill-muted text-[8px] font-medium"
        >
          Temperature (°C)
        </text>

        {/*
         * Excluded cities are painted first, so a matching dot is never hidden
         * behind a dimmed one. Painting order is the only z-index SVG has.
         */}
        {placed
          .filter((point) => !point.shown)
          .map((point) => (
            <Point key={point.record.city} point={point} />
          ))}

        {placed
          .filter((point) => point.shown)
          .map((point) => (
            <Point key={point.record.city} point={point} />
          ))}
      </svg>

      <p className="text-subtle mt-2 text-xs">
        Filled dots match your filters. Hollow dots are excluded — still drawn in place,
        so you can see exactly what a range is cutting off.
      </p>
    </div>
  );
}

function Point({ point }: { point: PlacedPoint }) {
  const { record, cx, cy, shown, labelY } = point;
  const colour = conditionStyle(record.conditionGroup).color;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={shown ? 5.5 : 4}
        fill={shown ? colour : "none"}
        stroke={shown ? undefined : colour}
        strokeWidth={shown ? undefined : 1.5}
        opacity={shown ? 1 : 0.4}
      />

      {/*
       * `paint-order: stroke` draws a halo of the page colour behind the glyphs,
       * so a label stays readable where it crosses a gridline or another point.
       * Excluded names are dimmed but never hidden — a city you cannot find is
       * the problem this view exists to solve.
       */}
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        className={shown ? "fill-text font-semibold" : "fill-muted"}
        style={{
          fontSize: "8px",
          paintOrder: "stroke",
          stroke: "var(--surface)",
          strokeWidth: "2.5px",
          strokeLinejoin: "round",
        }}
      >
        {record.city}
      </text>
    </g>
  );
}
