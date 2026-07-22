/**
 * Runtime validation of the OpenWeatherMap "current weather" response.
 *
 * TypeScript types are erased at build time, so `await response.json()` gives us
 * `any` dressed as `OpenWeatherResponse` — a promise the compiler cannot keep.
 * If upstream ever renames a field, omits `sys.country`, or returns an error
 * envelope with HTTP 200 (which OpenWeatherMap has historically done), a typed
 * cast produces `undefined is not an object` deep inside a React render.
 *
 * Parsing instead of casting converts that class of surprise into a typed,
 * handled `INVALID_RESPONSE` error that renders as one inline card. This is the
 * difference between "typed" and "type-safe at the edges".
 */

import { z } from "zod";

import { toConditionGroup } from "../conditions";
import type { WeatherRecord } from "../types";

/**
 * Only the fields we actually consume are declared. Zod ignores unknown keys by
 * default, so upstream is free to add fields without breaking us — we validate
 * what we depend on, not the entire payload.
 */
export const openWeatherResponseSchema = z.object({
  name: z.string().min(1),
  sys: z
    .object({
      // Absent for a few ocean/territory results, so optional rather than a
      // parse failure — a missing country code should not discard usable data.
      country: z.string().optional(),
    })
    .optional(),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
  }),
  // `weather` is an array; the first entry is the primary condition. Requiring
  // at least one element means the normaliser never has to index defensively.
  weather: z
    .array(
      z.object({
        main: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
  wind: z.object({
    speed: z.number(),
  }),
});

export type OpenWeatherResponse = z.infer<typeof openWeatherResponseSchema>;

/**
 * Map a validated upstream payload onto our provider-agnostic record.
 *
 * This is the seam that keeps OpenWeatherMap's vocabulary (`main.temp`,
 * `sys.country`, `weather[0].main`) from leaking into the rest of the app.
 */
export function toWeatherRecord(
  response: OpenWeatherResponse,
  fetchedAt: string,
): WeatherRecord {
  // Safe: the schema guarantees at least one element, but `noUncheckedIndexedAccess`
  // still types this as possibly undefined, so we narrow explicitly rather than
  // reaching for a non-null assertion.
  const primary = response.weather[0] ?? { main: "Unknown", description: "" };

  return {
    city: response.name,
    // "??" rather than an empty string so the country filter and the UI have a
    // concrete value to display and group by.
    countryCode: (response.sys?.country ?? "??").toUpperCase(),
    temperature: round1(response.main.temp),
    feelsLike: round1(response.main.feels_like),
    humidity: Math.round(response.main.humidity),
    condition: primary.main,
    conditionGroup: toConditionGroup(primary.main),
    description: primary.description,
    windSpeed: round1(response.wind.speed),
    fetchedAt,
  };
}

/**
 * One decimal place. OpenWeatherMap returns values like `32.43000000000001`;
 * displaying that verbatim looks like a bug and makes the mono readouts jitter.
 */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
