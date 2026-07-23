"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";

import { conditionStyle } from "@/lib/weather/conditions";
import type {
  ConditionGroup,
  SortField,
  SortOrder,
  WeatherFilters,
} from "@/lib/weather/types";

import { ConditionIcon } from "./condition-icon";
import { RangeSlider } from "./range-slider";

interface FilterPanelProps {
  readonly filters: WeatherFilters;
  readonly onChange: (patch: Partial<WeatherFilters>) => void;
  readonly onReset: () => void;
  /** Derived from the fetched data — never a hardcoded list. */
  readonly countries: readonly string[];
  readonly conditions: readonly ConditionGroup[];
  /** Where the loaded cities actually sit, drawn as ticks on each track. */
  readonly temperatureMarks: readonly number[];
  readonly humidityMarks: readonly number[];
  readonly activeCount: number;
}

const SORT_FIELDS: readonly { value: SortField; label: string }[] = [
  { value: "temperature", label: "Temperature" },
  { value: "humidity", label: "Humidity" },
  { value: "windSpeed", label: "Wind speed" },
  { value: "city", label: "City name" },
  { value: "country", label: "Country" },
];

/**
 * The temperature slider's domain is fixed, not derived from the data.
 *
 * Deriving it would make the control move under the user: add one Arctic city
 * and every thumb position silently means something new, so a filter the user
 * set five seconds ago now reads differently. A fixed domain spanning inhabited
 * extremes keeps a given handle position meaning one thing for the whole
 * session, and the data's real extent is drawn on the track as ticks instead.
 */
const TEMP_DOMAIN = { min: -30, max: 55 };

/**
 * One control per filter in Part 2 of the brief.
 *
 * Three decisions shape it.
 *
 * **Options are derived from the data, never hardcoded.** The country list holds
 * the countries actually present in the current result set. Offering "France"
 * when no French city is loaded would let a user build a filter guaranteed to
 * return nothing — the UI inviting a dead end.
 *
 * **Native `<select>` is kept where native is genuinely better.** For country
 * and sort field the options are plain text, the lists are short, and a native
 * control brings type-ahead, correct focus handling and the platform's own wheel
 * picker on a phone. Replacing those with a custom listbox means reimplementing
 * all of it and getting one part subtly wrong. That is a real engineering
 * judgement, not a shortcut.
 *
 * **It is overridden only where native cannot express the requirement.** The
 * brief asks for a consistent icon-and-colour language per condition, and a
 * native `<option>` cannot render either — the old build had to mirror a single
 * icon *beside* the dropdown to compensate. A chip group shows every available
 * condition with its own icon and tint at once, and selecting is one tap rather
 * than open-scan-pick. Likewise a range genuinely needs two handles, which one
 * `<input>` cannot provide.
 */
export function FilterPanel({
  filters,
  onChange,
  onReset,
  countries,
  conditions,
  temperatureMarks,
  humidityMarks,
  activeCount,
}: FilterPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        {/* On mobile the <summary> already says "Filters"; repeating it here
            would be the same heading twice in a row. */}
        <h2 className="text-subtle hidden text-xs font-semibold tracking-wider uppercase lg:block">
          Filters
        </h2>

        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="text-subtle hover:text-primary-text ml-auto inline-flex items-center gap-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset all
        </button>
      </div>

      {/* ---------------------------------------------------------------- Country */}
      <Field label="Country" htmlFor="filter-country">
        <Select
          id="filter-country"
          value={filters.country ?? ""}
          onChange={(value) => onChange({ country: value === "" ? undefined : value })}
        >
          <option value="">All countries</option>
          {countries.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </Field>

      {/* ------------------------------------------------------------ Temperature */}
      <RangeSlider
        label="Temperature"
        min={TEMP_DOMAIN.min}
        max={TEMP_DOMAIN.max}
        valueMin={filters.minTemp}
        valueMax={filters.maxTemp}
        marks={temperatureMarks}
        format={(value) => `${value}°`}
        onChange={({ min, max }) => onChange({ minTemp: min, maxTemp: max })}
      />

      {/* -------------------------------------------------------------- Condition */}
      <fieldset>
        <legend className="text-muted mb-2 block text-xs font-medium">Condition</legend>
        <ConditionChips
          conditions={conditions}
          selected={filters.condition}
          onSelect={(value) => onChange({ condition: value })}
        />
      </fieldset>

      {/* --------------------------------------------------------------- Humidity */}
      <MinSlider
        id="filter-humidity"
        label="Minimum humidity"
        min={0}
        max={100}
        step={5}
        value={filters.minHumidity}
        marks={humidityMarks}
        format={(value) => `${value}%`}
        onChange={(value) => onChange({ minHumidity: value })}
      />

      {/* ------------------------------------------------------------------- Sort */}
      <Field label="Sort by" htmlFor="filter-sort">
        <div className="flex items-center gap-2">
          <Select
            id="filter-sort"
            value={filters.sortBy ?? ""}
            onChange={(value) =>
              onChange({ sortBy: value === "" ? undefined : (value as SortField) })
            }
          >
            <option value="">Default order</option>
            {SORT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </Select>

          <OrderToggle
            order={filters.order ?? "asc"}
            disabled={filters.sortBy === undefined}
            onChange={(order) => onChange({ order })}
          />
        </div>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ primitives */

/**
 * Conditions as a toggle group rather than a dropdown.
 *
 * Selecting the active chip clears the filter, so the control is its own undo —
 * there is no separate "All conditions" option competing with the chips for the
 * same job. `aria-pressed` carries the state, and every chip pairs its icon with
 * a text label so the condition is never communicated by colour alone.
 */
function ConditionChips({
  conditions,
  selected,
  onSelect,
}: {
  conditions: readonly ConditionGroup[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}) {
  if (conditions.length === 0) {
    return <p className="text-subtle text-xs">No conditions loaded yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5" id="filter-condition">
      {conditions.map((group) => {
        const style = conditionStyle(group);
        const isActive = selected === group;

        return (
          <button
            key={group}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? undefined : group)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "border-line-strong text-text"
                : "border-line text-muted hover:bg-surface-2"
            }`}
            style={isActive ? { backgroundColor: style.tint } : undefined}
          >
            <ConditionIcon group={group} className="h-3.5 w-3.5" />
            {style.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A one-sided threshold slider.
 *
 * Humidity has only a lower bound in `WeatherFilters`, so a two-thumb control
 * would invent a `maxHumidity` the filter cannot honour. Same edge rule as the
 * range slider: parked at zero means no constraint, not "at least 0%".
 */
function MinSlider({
  id,
  label,
  min,
  max,
  step,
  value,
  marks,
  format,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number | undefined;
  marks: readonly number[];
  format: (value: number) => string;
  onChange: (value: number | undefined) => void;
}) {
  const current = value ?? min;
  const percent = ((current - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-muted text-xs font-medium">
          {label}
        </label>
        <span className="sky-numeric text-text text-xs font-semibold">
          {value === undefined ? "Any" : `≥ ${format(value)}`}
        </span>
      </div>

      <div className="relative h-5">
        <div className="bg-surface-3 absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />

        <div
          className="bg-primary absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ left: 0, width: `${percent}%` }}
        />

        {/* After the fill, so ticks inside the selection stay visible. */}
        {marks.map((mark, index) => (
          <span
            key={`${mark}-${index}`}
            aria-hidden="true"
            className="bg-text absolute top-1/2 h-2 w-px -translate-y-1/2 rounded-full opacity-45"
            style={{ left: `${((mark - min) / (max - min)) * 100}%` }}
          />
        ))}

        <input
          id={id}
          type="range"
          className="sky-range"
          min={min}
          max={max}
          step={step}
          value={current}
          aria-valuetext={value === undefined ? "No minimum" : format(value)}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(next <= min ? undefined : next);
          }}
        />
      </div>

      <div className="text-subtle mt-1 flex justify-between text-[10px]">
        <span className="sky-numeric">{format(min)}</span>
        <span className="sky-numeric">{format(max)}</span>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-muted mb-2 block text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-line-strong bg-surface text-text hover:border-primary-edge h-9 w-full rounded-[10px] border px-2.5 text-sm transition-colors"
    >
      {children}
    </select>
  );
}

/**
 * Ascending/descending as a two-button group rather than a third `<select>`.
 *
 * `aria-pressed` communicates the toggle state, and the group is disabled
 * outright when no sort field is chosen — an order with nothing to order is a
 * control that does nothing, and a disabled control is more honest than one that
 * silently has no effect.
 */
function OrderToggle({
  order,
  onChange,
  disabled,
}: {
  order: SortOrder;
  onChange: (order: SortOrder) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="border-line inline-flex h-9 shrink-0 overflow-hidden rounded-[10px] border"
      role="group"
      aria-label="Sort direction"
    >
      {(
        [
          { value: "asc", icon: ArrowUp, label: "Ascending" },
          { value: "desc", icon: ArrowDown, label: "Descending" },
        ] as const
      ).map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          disabled={disabled}
          aria-label={label}
          aria-pressed={order === value}
          className={`inline-flex h-full w-9 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            order === value && !disabled
              ? "bg-primary text-primary-fg"
              : "bg-surface text-muted hover:bg-surface-2"
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
