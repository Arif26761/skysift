/**
 * Errors as data, not as exceptions.
 *
 * Part 3 of the brief asks for "a clear error structure instead of throwing raw
 * exceptions to the caller". Throwing is the wrong shape for this problem: a
 * batch of five cities where one 404s is not a failure, it is four successes and
 * one explained gap. An exception can only express "the whole thing died".
 *
 * So nothing in the fetch layer throws. Every city resolves to a `CityResult`,
 * and every failure is a `WeatherError` the UI can render inline next to the
 * cities that worked.
 */

import type { WeatherRecord } from "./types";

/**
 * The complete set of things that can go wrong. A closed union rather than a
 * string means `switch` statements over it are exhaustively checked, so adding
 * a new failure mode later surfaces every place that needs to handle it.
 */
export type WeatherErrorCode =
  /** The provider has no such city. Almost always a typo. */
  | "CITY_NOT_FOUND"
  /** Missing, malformed, or not-yet-activated API key (HTTP 401). */
  | "INVALID_API_KEY"
  /** Provider quota exceeded (HTTP 429). */
  | "RATE_LIMITED"
  /** Our own deadline elapsed before the provider answered. */
  | "TIMEOUT"
  /** DNS failure, connection refused, offline. */
  | "NETWORK"
  /** We got a response, but it did not match the expected schema. */
  | "INVALID_RESPONSE"
  /** Provider returned an unexpected non-2xx status. */
  | "UPSTREAM"
  /** The caller asked for something nonsensical (e.g. an empty city name). */
  | "INVALID_INPUT";

export interface WeatherError {
  /** The city this failure belongs to, so the UI can place it in the grid. */
  readonly city: string;
  readonly code: WeatherErrorCode;
  /** Safe to show a non-technical user verbatim. Never contains the API key. */
  readonly message: string;
  /** Whether offering a "Retry" button would be honest. Derived, never set by hand. */
  readonly retryable: boolean;
}

/**
 * `retryable` is a property of the error *code*, not of the call site.
 *
 * Retrying a misspelt city name or a revoked key will fail identically forever,
 * so offering a Retry button in those cases is a lie the UI tells the user.
 * Deriving it centrally means that judgement lives in exactly one place.
 */
const RETRYABLE_CODES: ReadonlySet<WeatherErrorCode> = new Set([
  "RATE_LIMITED",
  "TIMEOUT",
  "NETWORK",
  "UPSTREAM",
]);

/**
 * Default user-facing copy per code. Written for a non-technical operator:
 * it says what happened and what they can do, not what the HTTP status was.
 */
const DEFAULT_MESSAGES: Record<WeatherErrorCode, string> = {
  CITY_NOT_FOUND: "We couldn't find that city. Check the spelling and try again.",
  INVALID_API_KEY:
    "The weather service rejected our API key. A newly created key can take up to two hours to activate.",
  RATE_LIMITED:
    "Too many requests to the weather service. Please wait a moment and retry.",
  TIMEOUT: "The weather service took too long to respond.",
  NETWORK: "Couldn't reach the weather service. Check your connection.",
  INVALID_RESPONSE: "The weather service returned data we didn't understand.",
  UPSTREAM: "The weather service is having trouble right now.",
  INVALID_INPUT: "That doesn't look like a valid city name.",
};

/**
 * The only sanctioned way to build a `WeatherError`.
 *
 * Constructing them through a factory guarantees `retryable` always agrees with
 * `code`, and gives every error sensible copy even when a call site has nothing
 * specific to add.
 */
export function createWeatherError(
  city: string,
  code: WeatherErrorCode,
  message?: string,
): WeatherError {
  return {
    city,
    code,
    message: message ?? DEFAULT_MESSAGES[code],
    retryable: RETRYABLE_CODES.has(code),
  };
}

/**
 * Convert an unknown thrown value into a typed error.
 *
 * `fetch` rejects rather than resolving for aborts and transport failures, and
 * `catch` gives us `unknown`. This is the single boundary where an exception is
 * converted into data; past this point nothing in the app throws.
 */
export function toWeatherError(city: string, cause: unknown): WeatherError {
  if (cause instanceof DOMException && cause.name === "TimeoutError") {
    return createWeatherError(city, "TIMEOUT");
  }
  if (cause instanceof DOMException && cause.name === "AbortError") {
    return createWeatherError(
      city,
      "TIMEOUT",
      "The request was cancelled before it completed.",
    );
  }
  if (cause instanceof TypeError) {
    // Undici/whatwg-fetch surface transport-level problems as TypeError.
    return createWeatherError(city, "NETWORK");
  }
  return createWeatherError(city, "UPSTREAM");
}

/**
 * The outcome of asking for one city. A discriminated union rather than
 * `WeatherRecord | null` so the failure carries its own explanation.
 */
export type CityResult =
  | { readonly status: "ok"; readonly record: WeatherRecord }
  | { readonly status: "error"; readonly error: WeatherError };

export interface WeatherBatchMeta {
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  /** True when fixture data was served instead of live provider data. */
  readonly demoMode: boolean;
  readonly fetchedAt: string;
  readonly durationMs: number;
}

/**
 * The result of a whole batch. Note that this type cannot express "the batch
 * failed" — only how much of it succeeded. That is intentional: partial success
 * is the normal case, and the shape of the type enforces that the caller has to
 * deal with both lists.
 */
export interface WeatherBatch {
  readonly records: readonly WeatherRecord[];
  readonly errors: readonly WeatherError[];
  readonly meta: WeatherBatchMeta;
}
