/**
 * A TTL cache expressed as a *decorator over the provider port*, rather than as
 * a feature inside the orchestrator.
 *
 * `withCache(provider)` returns another `WeatherProvider`, so caching composes:
 * the orchestrator is unaware it exists, tests can inject an uncached provider,
 * and the caching policy can be changed or removed without touching batching,
 * timeout or error-handling logic. This is the port/adapter abstraction paying
 * off a second time.
 *
 * Why cache at all: current weather does not meaningfully change inside ten
 * minutes, the free tier allows 60 calls/minute, and a demo page that is
 * refreshed repeatedly would otherwise burn quota on identical answers.
 */

import type { CityResult } from "../errors";
import type { WeatherProvider } from "./types";

/** Ten minutes. Long enough to protect the quota, short enough to stay current. */
export const DEFAULT_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  readonly result: CityResult;
  readonly expiresAt: number;
}

export interface CacheOptions {
  readonly ttlMs?: number;
  /** Injectable clock so expiry is testable without waiting in real time. */
  readonly now?: () => number;
  /** Hard cap on entries, so a long-running instance cannot grow unboundedly. */
  readonly maxEntries?: number;
}

export interface CachedProvider {
  readonly provider: WeatherProvider;
  /** Exposed for diagnostics and tests, not used by application code. */
  readonly size: () => number;
  readonly clear: () => void;
}

export function withCache(
  inner: WeatherProvider,
  options: CacheOptions = {},
): CachedProvider {
  const { ttlMs = DEFAULT_TTL_MS, now = Date.now, maxEntries = 500 } = options;
  const entries = new Map<string, CacheEntry>();

  const provider: WeatherProvider = async (city, signal) => {
    const key = city.trim().toLowerCase();
    const hit = entries.get(key);

    if (hit !== undefined && hit.expiresAt > now()) {
      return hit.result;
    }
    // Expired entries are dropped on read rather than swept on a timer: there is
    // no background loop to leak in a serverless function that may be frozen
    // between invocations.
    if (hit !== undefined) entries.delete(key);

    const result = await inner(city, signal);

    /*
     * Only successes are cached.
     *
     * Caching failures would mean a transient blip (a timeout, a rate limit)
     * pins a city into a broken state for ten minutes, and the Retry button the
     * error card offers would do nothing — which is exactly the kind of lying
     * UI the error model was designed to avoid.
     */
    if (result.status === "ok") {
      if (entries.size >= maxEntries) evictOldest(entries);
      entries.set(key, { result, expiresAt: now() + ttlMs });
    }

    return result;
  };

  return {
    provider,
    size: () => entries.size,
    clear: () => entries.clear(),
  };
}

/**
 * Map preserves insertion order, so the first key is the oldest write. That is
 * enough for a bounded cache of this size; an LRU would need access-time
 * bookkeeping this workload does not justify.
 */
function evictOldest(entries: Map<string, CacheEntry>): void {
  const oldest = entries.keys().next();
  if (!oldest.done) entries.delete(oldest.value);
}
