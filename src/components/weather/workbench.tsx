"use client";

import { LayoutGrid, SlidersHorizontal, Table2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { buildFilterLedger, type FilterKey } from "@/lib/weather/filter-insights";
import { filterWeatherData } from "@/lib/weather/filter";
import { useWeather } from "@/lib/weather/use-weather";
import type { ConditionGroup, SortField, WeatherFilters } from "@/lib/weather/types";

import { CityInput } from "./city-input";
import { ConditionLegend } from "./condition-legend";
import { FilterFunnel } from "./filter-funnel";
import { FilterPanel } from "./filter-panel";
import {
  DemoBanner,
  EmptyState,
  ErrorCard,
  RequestErrorState,
  SkeletonGrid,
} from "./states";
import { WeatherCard } from "./weather-card";
import { WeatherTable } from "./weather-table";

/** The example input from the assessment brief, so the app is useful on first load. */
const DEFAULT_CITIES = ["Dhaka", "Chittagong", "London", "Tokyo", "New York"] as const;

type ViewMode = "cards" | "table";

/**
 * The single owner of application state.
 *
 * Three pieces of state live here and nowhere else: the city list, the filters,
 * and the view mode. Everything else on screen is *derived* — the filtered
 * records, the ledger, the dropdown options, the temperature domain. Nothing is
 * cached in a second useState that could fall out of step, which is why the
 * table headers and the sort dropdown can never disagree: they are two views of
 * one value.
 *
 * The data flow is the architectural point of the whole app:
 *
 *     cities change  ->  one network request
 *     filters change ->  zero network requests, a synchronous pure function
 *
 * Because `filterWeatherData` has no I/O, filtering is a sub-millisecond call
 * over an array. That is what makes the results update live as a filter moves,
 * with no debounce, no spinner flash and no chance of a slow response landing
 * after a newer one.
 */
export function Workbench() {
  const [cities, setCities] = useState<readonly string[]>(DEFAULT_CITIES);
  const [filters, setFilters] = useState<WeatherFilters>({});
  const [view, setView] = useState<ViewMode>("cards");

  const { status, records, errors, meta, requestError, refetch } = useWeather(cities);

  const updateFilters = useCallback((patch: Partial<WeatherFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilter = useCallback((key: FilterKey) => {
    setFilters((current) => {
      const next = { ...current };
      // Mirrors the grouping in the ledger: the temperature range is one control
      // to the user, so clearing its chip clears both bounds.
      if (key === "country") delete next.country;
      if (key === "condition") delete next.condition;
      if (key === "humidity") delete next.minHumidity;
      if (key === "temperature") {
        delete next.minTemp;
        delete next.maxTemp;
      }
      return next;
    });
  }, []);

  /** Sort is preserved — resetting *filters* should not also reorder the table. */
  const resetFilters = useCallback(() => {
    setFilters((current) => ({ sortBy: current.sortBy, order: current.order }));
  }, []);

  /** Clicking the active column flips direction; a new column starts ascending. */
  const toggleSort = useCallback((field: SortField) => {
    setFilters((current) => ({
      ...current,
      sortBy: field,
      order: current.sortBy === field && current.order === "asc" ? "desc" : "asc",
    }));
  }, []);

  const visible = useMemo(() => filterWeatherData(records, filters), [records, filters]);
  const ledger = useMemo(() => buildFilterLedger(records, filters), [records, filters]);

  /*
   * Dropdown options come from the data that is actually loaded. Offering
   * "France" when no French city has been added would let a user build a filter
   * guaranteed to return nothing — the UI inviting a dead end.
   */
  const countries = useMemo(
    () => [...new Set(records.map((r) => r.countryCode))].sort(),
    [records],
  );

  const conditions = useMemo(
    () =>
      [
        ...new Set(records.map((r) => r.conditionGroup)),
      ].sort() as readonly ConditionGroup[],
    [records],
  );

  /** Temperature span for the thermal bars, taken from the visible set. */
  const domain = useMemo(() => {
    if (visible.length === 0) return { min: 0, max: 1 };
    const temps = visible.map((r) => r.temperature);
    return { min: Math.min(...temps), max: Math.max(...temps) };
  }, [visible]);

  const isLoading = status === "loading";
  const showEmpty = !isLoading && requestError === null && visible.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Weather data, <span className="sky-brand-text">filtered</span>.
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Add any list of cities, then slice the results by country, temperature,
          condition and humidity — and see exactly what each filter removed.
        </p>
      </header>

      {meta?.demoMode === true && (
        <div className="mt-6">
          <DemoBanner />
        </div>
      )}

      <div className="mt-6">
        <CityInput cities={cities} onChange={setCities} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/*
         * Desktop: a sticky rail beside the results, so filters stay reachable
         * while scrolling a long list.
         * Mobile: a native <details> disclosure. Native because it is keyboard
         * operable, announced correctly and needs no JavaScript — and because at
         * 375px the results, not the controls, must own the screen.
         */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <details
            className="border-line bg-surface shadow-card group rounded-[14px] border p-4 lg:open:p-4"
            // Open by default on desktop; the summary is hidden there anyway.
            open
          >
            <summary className="text-text flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold lg:hidden">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filters
              </span>
              {ledger.active.length > 0 && (
                <span className="bg-primary text-primary-fg sky-numeric rounded-full px-2 py-0.5 text-[11px] font-bold">
                  {ledger.active.length} active
                </span>
              )}
            </summary>

            <div className="mt-4 lg:mt-0">
              <FilterPanel
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                countries={countries}
                conditions={conditions}
                activeCount={ledger.active.length}
              />
            </div>
          </details>

          <div className="mt-4 hidden lg:block">
            <h2 className="text-subtle mb-2 text-xs font-semibold tracking-wider uppercase">
              Condition key
            </h2>
            <ConditionLegend />
          </div>
        </aside>

        <section id="results" aria-label="Results" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <FilterFunnel ledger={ledger} onClear={clearFilter} onReset={resetFilters} />
            <ViewToggle view={view} onChange={setView} />
          </div>

          {requestError !== null ? (
            <RequestErrorState message={requestError} onRetry={refetch} />
          ) : isLoading ? (
            // Skeleton count matches the request, so the page reserves roughly
            // the space the real results will need.
            <SkeletonGrid count={Math.max(cities.length, 3)} />
          ) : (
            <div className="space-y-3">
              {showEmpty ? (
                <EmptyState
                  ledger={ledger}
                  onClear={clearFilter}
                  onReset={resetFilters}
                />
              ) : view === "cards" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((record) => (
                    <WeatherCard key={record.city} record={record} domain={domain} />
                  ))}
                </div>
              ) : (
                <WeatherTable
                  records={visible}
                  sortBy={filters.sortBy}
                  order={filters.order ?? "asc"}
                  onSort={toggleSort}
                />
              )}

              {/*
               * Failed cities render beneath the successful ones, in the same
               * grid, in both views. A partial batch then reads as what it is:
               * some cities worked, these did not.
               */}
              {errors.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {errors.map((error) => (
                    <ErrorCard
                      key={`${error.city}-${error.code}`}
                      error={error}
                      onRetry={refetch}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 lg:hidden">
            <h2 className="text-subtle mb-2 text-xs font-semibold tracking-wider uppercase">
              Condition key
            </h2>
            <ConditionLegend />
          </div>
        </section>
      </div>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div
      className="border-line inline-flex h-9 shrink-0 overflow-hidden rounded-[9px] border"
      role="group"
      aria-label="Result layout"
    >
      {(
        [
          { value: "cards", icon: LayoutGrid, label: "Card view" },
          { value: "table", icon: Table2, label: "Table view" },
        ] as const
      ).map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={label}
          aria-pressed={view === value}
          className={`inline-flex h-full w-9 items-center justify-center transition-colors ${
            view === value
              ? "bg-primary text-primary-fg"
              : "bg-surface text-muted hover:bg-surface-2"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
