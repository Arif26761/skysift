/**
 * Part 2 — `filterWeatherData(data, filters)`.
 *
 * This is the heart of the assessment and the most deliberately constrained file
 * in the project. It has:
 *
 *   - no I/O
 *   - no async
 *   - no runtime imports (the two imports below are `import type`, erased at build)
 *   - no mutation of its input
 *   - no dependence on anything outside its arguments
 *
 * That discipline buys three concrete things:
 *
 *   1. It runs unchanged on the server (inside the route handler) and in the
 *      browser (for live filtering). One implementation, one test suite, two
 *      runtimes — no risk of the two drifting apart.
 *   2. Its tests need no mocks, no setup and no teardown: pass an array, assert
 *      on an array.
 *   3. It is safe and cheap to call repeatedly, which is what makes the Filter
 *      Ledger (see filter-insights.ts) possible at all.
 */

import type { SortField, WeatherFilters, WeatherRecord } from "./types";

/**
 * Apply every supplied filter (AND semantics), then optionally sort.
 *
 * @param data    Records to filter. Never mutated.
 * @param filters Any combination of constraints. Omitted fields do not constrain.
 * @returns A new array. Safe to sort, splice or hand to React as fresh state.
 */
export function filterWeatherData(
  data: readonly WeatherRecord[],
  filters: WeatherFilters = {},
): WeatherRecord[] {
  const {
    country,
    minTemp,
    maxTemp,
    condition,
    minHumidity,
    sortBy,
    order = "asc",
  } = filters;

  // `.filter()` allocates a new array, so the `.sort()` below cannot reach the
  // caller's data. This is the whole reason the function can claim purity while
  // still using an in-place sort.
  const matched = data.filter((record) => {
    if (!matchesCountry(record, country)) return false;
    if (!matchesCondition(record, condition)) return false;
    if (isBound(minTemp) && record.temperature < minTemp) return false;
    if (isBound(maxTemp) && record.temperature > maxTemp) return false;
    if (isBound(minHumidity) && record.humidity < minHumidity) return false;
    return true;
  });

  if (sortBy === undefined) return matched;

  const direction = order === "desc" ? -1 : 1;
  // Array.prototype.sort has been required to be stable since ES2019, so records
  // that compare equal keep their original relative order and the grid does not
  // reshuffle arbitrarily between renders.
  return matched.sort((a, b) => direction * compare(sortBy, a, b));
}

/**
 * A numeric bound only constrains when it is a real, finite number.
 *
 * Empty number inputs in the UI produce `NaN`, and `NaN` comparisons are always
 * false — which would silently drop *every* record. Treating a non-finite bound
 * as "no bound" makes a half-typed input a no-op instead of a wipe-out.
 */
function isBound(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

/** Blank strings mean "no constraint", so clearing a dropdown behaves as expected. */
function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

function matchesCountry(record: WeatherRecord, country: string | undefined): boolean {
  if (!isSet(country)) return true;
  return record.countryCode.toUpperCase() === country.trim().toUpperCase();
}

/**
 * Matches against either the raw provider label or the normalised group.
 *
 * The brief's example is `condition: "Rain"`, which is the raw label. But our UI
 * offers grouped conditions, so a user picking "Mist" expects to also catch the
 * cities the provider labelled "Haze" or "Fog". Accepting both keeps the literal
 * API contract from the brief while making the UI behave the way a user reads it.
 */
function matchesCondition(record: WeatherRecord, condition: string | undefined): boolean {
  if (!isSet(condition)) return true;
  const wanted = condition.trim().toLowerCase();
  return (
    record.condition.toLowerCase() === wanted ||
    record.conditionGroup.toLowerCase() === wanted
  );
}

/**
 * Ascending comparator per sort field. The switch is exhaustive over `SortField`,
 * so adding a new sortable column becomes a compile error here rather than a
 * silently unsorted column at runtime.
 */
function compare(field: SortField, a: WeatherRecord, b: WeatherRecord): number {
  switch (field) {
    case "temperature":
      return a.temperature - b.temperature;
    case "humidity":
      return a.humidity - b.humidity;
    case "windSpeed":
      return a.windSpeed - b.windSpeed;
    case "city":
      return a.city.localeCompare(b.city);
    case "country":
      // Group by country, then read alphabetically inside each country — sorting
      // by country alone would leave cities in arbitrary order within a group.
      return a.countryCode.localeCompare(b.countryCode) || a.city.localeCompare(b.city);
  }
}
