"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { WeatherApiResponse } from "./api-contract";
import type { WeatherError } from "./errors";
import type { WeatherRecord } from "./types";

/**
 * Client-side data access for the weather batch.
 *
 * Deliberately hand-rolled rather than reaching for TanStack Query. There is
 * exactly one endpoint, one cache key and no mutations; a query library would be
 * ~13kB and a layer of indirection to solve problems this app does not have.
 * The two things that genuinely matter — cancelling superseded requests and
 * ignoring out-of-order responses — are twenty lines, and writing them makes the
 * behaviour inspectable rather than magical.
 *
 * Note what this hook does *not* do: filtering. Cities are fetched once, and
 * every filter change is a synchronous pure-function call over the cached
 * records. That is why filters feel instant, and why there is no debounce, no
 * spinner flash, and no race between a slider drag and a network response.
 */

export type WeatherStatus = "idle" | "loading" | "ready";

export interface WeatherMeta {
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly demoMode: boolean;
  readonly fetchedAt: string;
  readonly durationMs: number;
}

export interface UseWeatherResult {
  readonly status: WeatherStatus;
  readonly records: readonly WeatherRecord[];
  readonly errors: readonly WeatherError[];
  readonly meta: WeatherMeta | null;
  /**
   * Set only when the request itself could not be made — the browser is offline,
   * or our own API is unreachable. Distinct from `errors`, which are per-city
   * failures the server successfully reported.
   */
  readonly requestError: string | null;
  readonly refetch: () => void;
}

/** Stable identities, so an empty result does not retrigger memos downstream. */
const NO_RECORDS: readonly WeatherRecord[] = [];
const NO_ERRORS: readonly WeatherError[] = [];

export function useWeather(cities: readonly string[]): UseWeatherResult {
  const [status, setStatus] = useState<WeatherStatus>("idle");
  const [records, setRecords] = useState<readonly WeatherRecord[]>(NO_RECORDS);
  const [errors, setErrors] = useState<readonly WeatherError[]>(NO_ERRORS);
  const [meta, setMeta] = useState<WeatherMeta | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  /** Bumped to force a refetch without changing the city list. */
  const [nonce, setNonce] = useState(0);

  /**
   * Monotonic request counter. A response is applied only if it belongs to the
   * newest request — without this, a slow first batch can land after a fast
   * second one and overwrite fresh data with stale data.
   */
  const latestRequest = useRef(0);

  /*
   * `cities` is a new array identity on every parent render, so the effect keys
   * off its contents rather than the reference.
   *
   * The delimiter is a newline, not a space: city names contain spaces, and
   * joining on one silently split "New York" into "New" and "York" — two cities
   * that then both failed to resolve. A separator has to be a character the data
   * cannot contain, and a chip input strips newlines by construction.
   */
  const cityKey = cities.join("\n");

  useEffect(() => {
    const list = cityKey === "" ? [] : cityKey.split("\n");

    /*
     * An empty city list is not a state to *store*, it is a state to *derive* —
     * see the return value below. Writing "idle" into state here would mean the
     * same fact lived in two places and could disagree, and it is what React's
     * set-state-in-effect rule is warning about. Returning early keeps the last
     * successful response in state, ready if the user re-adds a city.
     */
    if (list.length === 0) return;

    const requestId = ++latestRequest.current;
    const controller = new AbortController();

    async function run() {
      setStatus("loading");
      setRequestError(null);

      try {
        // POST rather than GET: a city list can be long, and names may contain
        // commas ("Washington, D.C.") that a comma-separated query cannot carry.
        const response = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cities: list }),
          signal: controller.signal,
        });

        if (!response.ok)
          throw new Error(`Request failed with status ${response.status}`);

        const payload = (await response.json()) as WeatherApiResponse;
        if (requestId !== latestRequest.current) return;

        setRecords(payload.records);
        setErrors(payload.errors);
        setMeta(payload.meta);
        setStatus("ready");
      } catch {
        // An abort is not a failure — it means the user changed the city list
        // and we deliberately cancelled. Surfacing it would flash an error on
        // every keystroke.
        if (controller.signal.aborted) return;
        if (requestId !== latestRequest.current) return;

        setRequestError(
          "Couldn't reach the weather service. Check your connection and try again.",
        );
        setStatus("ready");
      }
    }

    void run();

    return () => controller.abort();
  }, [cityKey, nonce]);

  /**
   * Refetch the whole batch.
   *
   * Retrying one failed city refetches everything, which sounds wasteful and is
   * not: the server caches successes for ten minutes but never caches failures,
   * so cities that already worked are served from memory and only the failed
   * ones actually reach the provider. The simple call does the efficient thing
   * because the cache policy was designed for it.
   */
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  // Derived, not stored: with no cities there is nothing to show, regardless of
  // what the last response happened to contain.
  const isEmpty = cities.length === 0;

  return {
    status: isEmpty ? "idle" : status,
    records: isEmpty ? NO_RECORDS : records,
    errors: isEmpty ? NO_ERRORS : errors,
    meta: isEmpty ? null : meta,
    requestError: isEmpty ? null : requestError,
    refetch,
  };
}
