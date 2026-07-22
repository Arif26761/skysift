/**
 * The fixture provider — the second implementation of the `WeatherProvider` port.
 *
 * Active whenever no API key is configured, or when `SKYSIFT_FORCE_DEMO=true`.
 *
 * This is not a testing convenience bolted on afterwards; it is a deliberate
 * availability decision. A recruiter opens the demo link exactly once. If the
 * key is missing, rotated, or the free quota is exhausted that day, a
 * key-dependent app shows a broken page and the submission is judged on it.
 * Degrading to labelled fixture data means the worst case is "the numbers are
 * illustrative", not "it doesn't work".
 */

import { createWeatherError } from "../errors";
import type { CityResult, WeatherErrorCode } from "../errors";
import { DEMO_RECORDS_BY_CITY } from "../fixtures";
import type { WeatherProvider } from "./types";

/**
 * Cities that deliberately fail, so the inline-error UI is demonstrable in the
 * live demo without anyone having to sabotage a real API key.
 *
 * "Atlantis" yields a retryable TIMEOUT (so the Retry button appears) while any
 * city simply absent from the fixtures yields a non-retryable CITY_NOT_FOUND —
 * between them, both branches of the error UI are reachable from the demo.
 * Documented in the README so a reviewer can find them.
 */
const DEMO_FAILURES: Readonly<Record<string, WeatherErrorCode>> = {
  atlantis: "TIMEOUT",
  "el dorado": "RATE_LIMITED",
};

export interface MockProviderOptions {
  /**
   * Artificial latency in milliseconds.
   *
   * Non-zero in the running app so the skeleton state is actually visible —
   * fixtures resolve instantly otherwise and the loading design, which the brief
   * explicitly asks for, would never render. Zero in tests to keep them fast.
   */
  readonly latencyMs?: number;
}

export function createMockProvider(options: MockProviderOptions = {}): WeatherProvider {
  const { latencyMs = 0 } = options;

  return async function fetchCity(
    city: string,
    signal: AbortSignal,
  ): Promise<CityResult> {
    const key = city.trim().toLowerCase();

    if (key === "") {
      return { status: "error", error: createWeatherError(city, "INVALID_INPUT") };
    }

    if (latencyMs > 0) await delay(latencyMs, signal);

    const failure = DEMO_FAILURES[key];
    if (failure !== undefined) {
      return { status: "error", error: createWeatherError(city.trim(), failure) };
    }

    const record = DEMO_RECORDS_BY_CITY.get(key);
    if (record === undefined) {
      return {
        status: "error",
        error: createWeatherError(
          city.trim(),
          "CITY_NOT_FOUND",
          `Demo mode only covers a fixed set of cities, and "${city.trim()}" isn't one of them. Add an API key for live data.`,
        ),
      };
    }

    return { status: "ok", record };
  };
}

/**
 * Abort-aware sleep. Without the listener a cancelled batch would still be
 * holding timers open, which in a serverless function means paying for wall
 * time nobody is waiting on.
 */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
