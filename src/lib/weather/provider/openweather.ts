/**
 * The OpenWeatherMap adapter — the only module in the codebase that knows this
 * provider exists. Everything else talks to the `WeatherProvider` port.
 *
 * Runs server-side only. The API key is read from `process.env` by the caller
 * and never crosses the network boundary to the browser, which is the reason
 * this project uses a Next.js Route Handler rather than fetching from React.
 */

import { createWeatherError, toWeatherError } from "../errors";
import type { CityResult, WeatherErrorCode } from "../errors";
import { openWeatherResponseSchema, toWeatherRecord } from "./schema";
import type { WeatherProvider } from "./types";

const ENDPOINT = "https://api.openweathermap.org/data/2.5/weather";

/**
 * Build a provider bound to an API key.
 *
 * A factory rather than a module-level singleton so the key is an explicit
 * dependency: nothing here reaches into `process.env` on its own, which keeps
 * the module importable and testable without any environment set up.
 */
export function createOpenWeatherProvider(apiKey: string): WeatherProvider {
  return async function fetchCity(
    city: string,
    signal: AbortSignal,
  ): Promise<CityResult> {
    const trimmed = city.trim();
    if (trimmed === "") {
      return { status: "error", error: createWeatherError(city, "INVALID_INPUT") };
    }

    // URL/searchParams handles encoding, so a city like "Washington, D.C."
    // cannot break the query string or smuggle extra parameters in.
    const url = new URL(ENDPOINT);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("units", "metric");
    url.searchParams.set("appid", apiKey);

    try {
      const response = await fetch(url, {
        signal,
        headers: { Accept: "application/json" },
        // Caching is handled by our own TTL layer, which we can reason about
        // and invalidate; deferring to fetch's heuristics would make staleness
        // invisible.
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          status: "error",
          error: createWeatherError(trimmed, codeForStatus(response.status)),
        };
      }

      const payload: unknown = await response.json();
      const parsed = openWeatherResponseSchema.safeParse(payload);

      if (!parsed.success) {
        // Deliberately does not surface Zod's issue list. It would mean nothing
        // to a non-technical user and could echo upstream content into the UI.
        return {
          status: "error",
          error: createWeatherError(trimmed, "INVALID_RESPONSE"),
        };
      }

      return {
        status: "ok",
        record: toWeatherRecord(parsed.data, new Date().toISOString()),
      };
    } catch (cause) {
      // `fetch` rejects rather than resolving for aborts and transport failures.
      // This is the single boundary in the app where an exception becomes data;
      // nothing downstream of here throws.
      return { status: "error", error: toWeatherError(trimmed, cause) };
    }
  };
}

/**
 * Translate an HTTP status into our own vocabulary.
 *
 * The mapping matters because it decides whether the UI offers a Retry button:
 * 404 and 401 are permanent for the same input, while 429 and 5xx are worth
 * trying again.
 *
 * Note that OpenWeatherMap returns 401 both for a genuinely wrong key and for a
 * newly created one that has not propagated yet — which is why the copy for
 * INVALID_API_KEY mentions the activation delay rather than just saying the key
 * is wrong.
 */
function codeForStatus(status: number): WeatherErrorCode {
  if (status === 401 || status === 403) return "INVALID_API_KEY";
  if (status === 404) return "CITY_NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  return "UPSTREAM";
}
