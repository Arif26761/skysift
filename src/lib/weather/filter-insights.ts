/**
 * The Filter Ledger — the feature this project is built around.
 *
 * The problem: every filter UI in the world has the same blind spot. A user
 * narrows the data, the list empties, and the app says "no results". The user
 * has no idea *which* of the five controls they touched caused it, so they start
 * randomly resetting things. That is precisely the failure mode the brief warns
 * about when it asks whether a non-technical person could actually operate this.
 *
 * The fix: for each active filter, report how many extra records would appear if
 * that one filter were switched off. Then the UI can say "Humidity ≥ 80 removed
 * the last 2" and offer to relax exactly that control.
 *
 * How: a leave-one-out sensitivity analysis. Run `filterWeatherData` once with
 * everything applied, then once more per active filter with that filter omitted.
 * The difference in result count is that filter's contribution.
 *
 * Why this is affordable: `filterWeatherData` is pure — no I/O, no side effects,
 * idempotent — so calling it six times is just six passes over an array of ≤30
 * objects, and there is no risk of the repeated calls interfering with each
 * other. The architectural discipline the brief asked for in Part 2 is what
 * makes this feature possible; it would be unthinkable if filtering were a
 * network round-trip or mutated shared state.
 */

import { filterWeatherData } from "./filter";
import type { WeatherFilters, WeatherRecord } from "./types";

/**
 * Ledger granularity is *one entry per user-facing control*, which is why
 * `minTemp` and `maxTemp` collapse into a single "temperature" key. A user
 * thinks of the temperature range as one thing they dragged; splitting it into
 * two ledger chips would be technically accurate and practically confusing.
 *
 * `sortBy`/`order` are deliberately absent: sorting reorders results, it never
 * removes them, so it can have no exclusion count.
 */
export type FilterKey = "country" | "temperature" | "condition" | "humidity";

export interface LedgerEntry {
  readonly key: FilterKey;
  /** Human-readable summary of the constraint, e.g. "Temp 25–35°". */
  readonly label: string;
  /**
   * How many *additional* records would show if this filter alone were removed.
   *
   * This is a marginal contribution, not the size of the set the filter rejects.
   * When two filters exclude the same record, neither gets credit for it — so
   * the entries will not generally sum to `total - shown`. That is the honest
   * number: it answers "what do I gain by relaxing this?", which is the only
   * question the user is actually asking.
   */
  readonly excluded: number;
}

export interface FilterLedger {
  /** Size of the unfiltered dataset. */
  readonly total: number;
  /** Size of the fully filtered result. */
  readonly shown: number;
  /** One entry per active filter, in stable display order. */
  readonly active: readonly LedgerEntry[];
  /**
   * When `shown === 0`, the single filter that — on its own — is responsible.
   * `null` when results are non-empty, or when no single filter unblocks it
   * (i.e. it takes relaxing more than one), which the UI words differently.
   */
  readonly culprit: LedgerEntry | null;
}

/** Display order for ledger chips. Stable so chips never jump around. */
const FILTER_ORDER: readonly FilterKey[] = [
  "country",
  "temperature",
  "condition",
  "humidity",
];

/** A filter is "active" only if it would actually constrain the data. */
function isActive(filters: WeatherFilters, key: FilterKey): boolean {
  switch (key) {
    case "country":
      return filters.country !== undefined && filters.country.trim() !== "";
    case "condition":
      return filters.condition !== undefined && filters.condition.trim() !== "";
    case "temperature":
      return Number.isFinite(filters.minTemp) || Number.isFinite(filters.maxTemp);
    case "humidity":
      return Number.isFinite(filters.minHumidity);
  }
}

/**
 * Return a copy of `filters` with one logical filter switched off.
 *
 * Builds a new object rather than deleting keys so the input is never touched —
 * the ledger must not be able to disturb the caller's filter state.
 */
function without(filters: WeatherFilters, key: FilterKey): WeatherFilters {
  const next = { ...filters };
  switch (key) {
    case "country":
      delete next.country;
      break;
    case "condition":
      delete next.condition;
      break;
    case "temperature":
      delete next.minTemp;
      delete next.maxTemp;
      break;
    case "humidity":
      delete next.minHumidity;
      break;
  }
  return next;
}

/** Copy needs to read naturally in a chip, so each key formats differently. */
function describe(filters: WeatherFilters, key: FilterKey): string {
  switch (key) {
    case "country":
      return `Country · ${(filters.country ?? "").trim().toUpperCase()}`;
    case "condition": {
      const raw = (filters.condition ?? "").trim();
      return `Condition · ${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
    }
    case "temperature": {
      const hasMin = Number.isFinite(filters.minTemp);
      const hasMax = Number.isFinite(filters.maxTemp);
      if (hasMin && hasMax) return `Temp ${filters.minTemp}–${filters.maxTemp}°`;
      if (hasMin) return `Temp ≥ ${filters.minTemp}°`;
      return `Temp ≤ ${filters.maxTemp}°`;
    }
    case "humidity":
      return `Humidity ≥ ${filters.minHumidity}%`;
  }
}

/**
 * Build the ledger for a dataset and filter set.
 *
 * Pure: mutates neither argument, performs no I/O. Cost is O(k·n) for k active
 * filters over n records — at realistic sizes (5 filters, 30 cities) that is
 * ~150 comparisons, far below anything worth memoising.
 */
export function buildFilterLedger(
  data: readonly WeatherRecord[],
  filters: WeatherFilters = {},
): FilterLedger {
  const total = data.length;
  const shown = filterWeatherData(data, filters).length;

  const active: LedgerEntry[] = FILTER_ORDER.filter((key) => isActive(filters, key)).map(
    (key) => ({
      key,
      label: describe(filters, key),
      // Sorting cannot change the count, so we do not bother stripping it here.
      excluded: filterWeatherData(data, without(filters, key)).length - shown,
    }),
  );

  return { total, shown, active, culprit: findCulprit(shown, active) };
}

/**
 * Identify the one filter to blame for an empty result set.
 *
 * Only meaningful when nothing is showing. We pick the filter whose removal
 * recovers the most records — that is the one most worth offering to relax. If
 * removing any single filter still yields nothing, there is no single culprit
 * and we return `null` so the UI can say "your filters are too narrow overall"
 * instead of blaming an innocent control.
 */
function findCulprit(shown: number, active: readonly LedgerEntry[]): LedgerEntry | null {
  if (shown > 0) return null;

  let best: LedgerEntry | null = null;
  for (const entry of active) {
    if (entry.excluded > 0 && (best === null || entry.excluded > best.excluded)) {
      best = entry;
    }
  }
  return best;
}
