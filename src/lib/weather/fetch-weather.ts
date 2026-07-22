/**
 * Part 1 + Part 3 — the batch orchestrator.
 *
 * Its single guarantee, stated by the brief: **one bad city must not crash the
 * whole batch.** Everything here exists to make that true even when the provider
 * misbehaves.
 *
 * Four independent defences, because the failure modes are independent:
 *
 *   1. `Promise.allSettled`, never `Promise.all`. `all` rejects on the first
 *      failure and throws away the results that already succeeded — the exact
 *      behaviour the brief prohibits.
 *   2. A try/catch around every provider call. The port's contract says a
 *      provider never rejects, but a contract is not an enforcement mechanism.
 *   3. A deadline enforced by the orchestrator rather than by the provider, so a
 *      provider that ignores its abort signal still cannot hang the batch.
 *   4. A concurrency limiter, so a large list cannot trip the provider's rate
 *      limit and convert one slow request into fifty failed ones.
 *
 * This module is the imperative shell: it is the part that can fail. It returns
 * a `WeatherBatch`, which has no way to express "the batch failed" — only how
 * much of it succeeded.
 */

import { createWeatherError, toWeatherError } from "./errors";
import type { CityResult, WeatherBatch, WeatherError } from "./errors";
import type { WeatherProvider } from "./provider/types";
import type { WeatherRecord } from "./types";

/** Per-request deadline. Long enough for a slow mobile network, short enough that a hung city is not felt as a hang. */
export const DEFAULT_TIMEOUT_MS = 8_000;

/** Comfortably under OpenWeatherMap's 60 calls/minute free-tier ceiling. */
export const DEFAULT_CONCURRENCY = 5;

/** Guards against a pasted list turning one request into hundreds of upstream calls. */
export const MAX_CITIES = 25;

export interface FetchWeatherOptions {
  readonly provider: WeatherProvider;
  readonly concurrency?: number;
  readonly timeoutMs?: number;
  /** Recorded in `meta` so the UI can label fixture data honestly. */
  readonly demoMode?: boolean;
}

/**
 * Fetch current weather for a list of cities.
 *
 * Never rejects. Never throws. Always resolves to a `WeatherBatch` in which
 * `records` and `errors` together account for every requested city.
 *
 * Results are returned in the order the cities were requested, not the order
 * they happened to arrive — a stable output makes the UI predictable and the
 * tests deterministic.
 */
export async function fetchWeatherForCities(
  cities: readonly string[],
  options: FetchWeatherOptions,
): Promise<WeatherBatch> {
  const {
    provider,
    concurrency = DEFAULT_CONCURRENCY,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    demoMode = false,
  } = options;

  const startedAt = Date.now();
  const { valid, invalid } = normaliseCities(cities);

  const settled = await runWithConcurrency(valid, concurrency, (city) =>
    fetchOne(provider, city, timeoutMs),
  );

  const records: WeatherRecord[] = [];
  const errors: WeatherError[] = [...invalid];

  settled.forEach((result, index) => {
    // `valid[index]` is defined by construction; the fallback exists only to
    // satisfy noUncheckedIndexedAccess without an assertion.
    const city = valid[index] ?? "";

    if (result.status === "fulfilled") {
      if (result.value.status === "ok") records.push(result.value.record);
      else errors.push(result.value.error);
      return;
    }
    // Defence in depth: reaching here means a provider broke the port contract
    // by rejecting. The batch still completes; that city just reports an error.
    errors.push(toWeatherError(city, result.reason));
  });

  return {
    records,
    errors,
    meta: {
      requested: valid.length + invalid.length,
      succeeded: records.length,
      failed: errors.length,
      demoMode,
      fetchedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    },
  };
}

/**
 * Call one city under a deadline the orchestrator owns.
 *
 * `AbortSignal.timeout` is passed to the provider so a well-behaved one cancels
 * its socket, but we also race the call against the same deadline. A provider
 * that ignores the signal — a stub, a buggy adapter, a library that swallows
 * aborts — therefore still cannot stall the batch past `timeoutMs`.
 */
async function fetchOne(
  provider: WeatherProvider,
  city: string,
  timeoutMs: number,
): Promise<CityResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<CityResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ status: "error", error: createWeatherError(city, "TIMEOUT") });
    }, timeoutMs);
  });

  try {
    return await Promise.race([safeCall(provider, city, controller.signal), deadline]);
  } finally {
    // Always cleared, including on the winning path — a stray timer keeps the
    // Node event loop alive and would hold a serverless function open.
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Converts a contract-breaking rejection into the error shape the caller expects. */
async function safeCall(
  provider: WeatherProvider,
  city: string,
  signal: AbortSignal,
): Promise<CityResult> {
  try {
    return await provider(city, signal);
  } catch (cause) {
    return { status: "error", error: toWeatherError(city, cause) };
  }
}

/**
 * Trim, drop blanks, de-duplicate case-insensitively, and cap the list.
 *
 * De-duplication happens before any request is made: asking for "London",
 * "london" and " London " should cost one upstream call, not three. The first
 * spelling wins so the UI echoes back what the user actually typed.
 */
function normaliseCities(cities: readonly string[]): {
  valid: string[];
  invalid: WeatherError[];
} {
  const valid: string[] = [];
  const invalid: WeatherError[] = [];
  const seen = new Set<string>();

  for (const raw of cities) {
    const city = raw.trim();

    if (city === "") continue;

    if (city.length > 80) {
      invalid.push(createWeatherError(city.slice(0, 40), "INVALID_INPUT"));
      continue;
    }

    const key = city.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (valid.length >= MAX_CITIES) {
      invalid.push(
        createWeatherError(
          city,
          "INVALID_INPUT",
          `Only ${MAX_CITIES} cities can be fetched at once.`,
        ),
      );
      continue;
    }

    valid.push(city);
  }

  return { valid, invalid };
}

/**
 * A fixed-size worker pool over the input, preserving input order in the output.
 *
 * `Promise.allSettled` is applied to the workers rather than to the individual
 * city promises, because the workers are what could theoretically reject; the
 * per-city promises are already made safe by `safeCall`. Either way the batch
 * completes.
 */
async function runWithConcurrency(
  cities: readonly string[],
  limit: number,
  worker: (city: string) => Promise<CityResult>,
): Promise<PromiseSettledResult<CityResult>[]> {
  const results = new Array<PromiseSettledResult<CityResult>>(cities.length);
  const workers = Math.max(1, Math.min(limit, cities.length));
  let cursor = 0;

  const runners = Array.from({ length: workers }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= cities.length) return;

      const city = cities[index];
      if (city === undefined) return;

      try {
        results[index] = { status: "fulfilled", value: await worker(city) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });

  await Promise.allSettled(runners);
  return results;
}
