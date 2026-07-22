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

interface FilterPanelProps {
  readonly filters: WeatherFilters;
  readonly onChange: (patch: Partial<WeatherFilters>) => void;
  readonly onReset: () => void;
  /** Derived from the fetched data — never a hardcoded list. */
  readonly countries: readonly string[];
  readonly conditions: readonly ConditionGroup[];
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
 * One control per filter in Part 2 of the brief.
 *
 * Two decisions shape it.
 *
 * **Options are derived from the data, never hardcoded.** The country dropdown
 * lists the countries actually present in the current result set. Offering
 * "France" when no French city has been added would let a user build a filter
 * that is guaranteed to return nothing — the UI would be inviting a dead end.
 *
 * **Native `<select>` rather than a custom listbox.** A custom dropdown means
 * reimplementing type-ahead, focus trapping, escape handling and the mobile
 * wheel picker, and getting one of them subtly wrong. The one thing native
 * selects cannot do is render an icon per option, so the selected condition's
 * icon is mirrored *beside* the control instead — the visual language survives
 * without giving up correct behaviour on a phone or with a screen reader.
 */
export function FilterPanel({
  filters,
  onChange,
  onReset,
  countries,
  conditions,
  activeCount,
}: FilterPanelProps) {
  const selectedCondition = filters.condition as ConditionGroup | undefined;

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
          className="text-subtle hover:text-primary ml-auto inline-flex items-center gap-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
      <fieldset>
        <legend className="text-muted mb-2 block text-xs font-medium">
          Temperature (°C)
        </legend>
        <div className="flex items-center gap-2">
          <NumberInput
            id="filter-min-temp"
            label="Minimum temperature"
            placeholder="Min"
            value={filters.minTemp}
            onChange={(value) => onChange({ minTemp: value })}
          />
          <span className="text-subtle text-xs" aria-hidden="true">
            to
          </span>
          <NumberInput
            id="filter-max-temp"
            label="Maximum temperature"
            placeholder="Max"
            value={filters.maxTemp}
            onChange={(value) => onChange({ maxTemp: value })}
          />
        </div>
      </fieldset>

      {/* -------------------------------------------------------------- Condition */}
      <Field label="Condition" htmlFor="filter-condition">
        <div className="flex items-center gap-2">
          <Select
            id="filter-condition"
            value={filters.condition ?? ""}
            onChange={(value) =>
              onChange({ condition: value === "" ? undefined : value })
            }
          >
            <option value="">All conditions</option>
            {conditions.map((group) => (
              <option key={group} value={group}>
                {conditionStyle(group).label}
              </option>
            ))}
          </Select>

          {/* Mirrors the visual language a native <option> cannot carry. */}
          {selectedCondition !== undefined && (
            <span
              className="border-line inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border"
              style={{ backgroundColor: conditionStyle(selectedCondition).tint }}
            >
              <ConditionIcon group={selectedCondition} className="h-4 w-4" />
            </span>
          )}
        </div>
      </Field>

      {/* --------------------------------------------------------------- Humidity */}
      <Field label="Minimum humidity (%)" htmlFor="filter-humidity">
        <NumberInput
          id="filter-humidity"
          label="Minimum humidity"
          placeholder="e.g. 60"
          min={0}
          max={100}
          value={filters.minHumidity}
          onChange={(value) => onChange({ minHumidity: value })}
        />
      </Field>

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
      className="border-line-strong bg-surface text-text hover:border-primary h-9 w-full rounded-[9px] border px-2.5 text-sm transition-colors"
    >
      {children}
    </select>
  );
}

/**
 * A number field whose empty state is `undefined`, not `0`.
 *
 * This is the UI half of the guard that exists in `filterWeatherData` and in the
 * API contract. An empty `<input type="number">` reports `""`, and `Number("")`
 * is `0` — so a naive handler turns "I cleared this field" into "filter at zero
 * degrees" and the results change for no visible reason. Clearing must mean
 * *no constraint*, at every layer.
 */
function NumberInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      aria-label={label}
      placeholder={placeholder}
      min={min}
      max={max}
      value={value ?? ""}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(raw === "" ? undefined : Number(raw));
      }}
      className="border-line-strong bg-surface text-text hover:border-primary sky-numeric h-9 w-full rounded-[9px] border px-2.5 text-sm transition-colors"
    />
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
      className="border-line inline-flex h-9 shrink-0 overflow-hidden rounded-[9px] border"
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
