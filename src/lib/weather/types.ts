/**
 * The shared vocabulary of the application.
 *
 * Everything in this file is a *type*, so this module disappears at build time.
 * The functional core (filter.ts, filter-insights.ts, conditions.ts) imports only
 * from here, which is what keeps it free of runtime dependencies.
 */

/**
 * Normalised weather condition families.
 *
 * OpenWeatherMap reports ~15 distinct `weather[0].main` values, several of which
 * are visually indistinguishable to a user (Mist / Smoke / Haze / Fog / Dust /
 * Sand / Ash). We collapse them into a small set so the UI can guarantee one
 * icon and one colour per family — the "consistent visual language" the brief
 * asks for. `Unknown` exists so an unexpected upstream value degrades to a
 * neutral style instead of crashing a render.
 */
export type ConditionGroup =
  "Clear" | "Clouds" | "Rain" | "Drizzle" | "Thunderstorm" | "Snow" | "Mist" | "Unknown";

/**
 * One city's current weather, normalised away from any specific provider.
 *
 * The assessment requires city, country code, temperature, humidity, condition
 * and wind speed "at minimum"; the extra fields are what make the UI readable
 * rather than a data dump.
 *
 * Every field is `readonly`: records flow through pure functions that must never
 * mutate them, and the compiler is a cheaper guard than a code review.
 */
export interface WeatherRecord {
  /** Display name as resolved by the provider, e.g. "Dhaka". */
  readonly city: string;
  /** ISO 3166-1 alpha-2, always upper-case, e.g. "BD". */
  readonly countryCode: string;
  /** Degrees Celsius. */
  readonly temperature: number;
  /** Degrees Celsius, "feels like". */
  readonly feelsLike: number;
  /** Relative humidity, 0–100. */
  readonly humidity: number;
  /** Raw provider condition label, e.g. "Rain", "Haze". */
  readonly condition: string;
  /** Condition collapsed into a visual family. Drives icon + colour. */
  readonly conditionGroup: ConditionGroup;
  /** Human-readable detail, e.g. "light intensity drizzle". */
  readonly description: string;
  /** Metres per second. */
  readonly windSpeed: number;
  /** ISO-8601 timestamp of when this record was retrieved. */
  readonly fetchedAt: string;
}

/** Fields a result set can be ordered by. */
export type SortField = "temperature" | "humidity" | "windSpeed" | "city" | "country";

export type SortOrder = "asc" | "desc";

/**
 * Every field is optional and every field combines with every other (AND).
 *
 * An absent field means "do not constrain on this", which is deliberately
 * different from a present-but-empty value — it lets the UI clear a single
 * filter without having to know a sentinel.
 */
export interface WeatherFilters {
  /** ISO alpha-2 country code. Matched case-insensitively. */
  readonly country?: string;
  /** Inclusive lower bound, °C. */
  readonly minTemp?: number;
  /** Inclusive upper bound, °C. */
  readonly maxTemp?: number;
  /** Matches either the raw condition or its group, case-insensitively. */
  readonly condition?: string;
  /** Inclusive lower bound, %. */
  readonly minHumidity?: number;
  readonly sortBy?: SortField;
  /** Defaults to "asc" when `sortBy` is set. */
  readonly order?: SortOrder;
}
