import { describe, expect, it } from "vitest";

import { createWeatherError } from "../errors";
import type { CityResult } from "../errors";
import { makeRecord } from "../fixtures";
import { withCache } from "./cache";
import type { WeatherProvider } from "./types";

/** A provider that counts how often it is actually reached. */
function counting(): { provider: WeatherProvider; calls: () => number } {
  let calls = 0;
  return {
    calls: () => calls,
    provider: async (city) => {
      calls += 1;
      return { status: "ok", record: makeRecord({ city }) };
    },
  };
}

const signal = new AbortController().signal;

describe("withCache", () => {
  it("serves a repeat request without reaching the provider", async () => {
    const inner = counting();
    const { provider } = withCache(inner.provider);

    await provider("Dhaka", signal);
    await provider("Dhaka", signal);

    expect(inner.calls()).toBe(1);
  });

  it("treats city names case- and whitespace-insensitively", async () => {
    const inner = counting();
    const { provider } = withCache(inner.provider);

    await provider("London", signal);
    await provider("  london  ", signal);

    expect(inner.calls()).toBe(1);
  });

  it("refetches once the entry has expired", async () => {
    // An injected clock keeps this deterministic — no real waiting, no flakiness.
    let now = 0;
    const inner = counting();
    const { provider } = withCache(inner.provider, { ttlMs: 1000, now: () => now });

    await provider("Dhaka", signal);
    now = 999;
    await provider("Dhaka", signal);
    now = 1001;
    await provider("Dhaka", signal);

    expect(inner.calls()).toBe(2);
  });

  it("does not cache failures", async () => {
    /*
     * Caching a timeout would pin the city into a broken state for the whole TTL
     * and make the Retry button on the error card a no-op — precisely the sort
     * of lying UI the error model exists to prevent.
     */
    let calls = 0;
    const flaky: WeatherProvider = async (city): Promise<CityResult> => {
      calls += 1;
      return calls === 1
        ? { status: "error", error: createWeatherError(city, "TIMEOUT") }
        : { status: "ok", record: makeRecord({ city }) };
    };

    const { provider } = withCache(flaky);

    const first = await provider("Dhaka", signal);
    const second = await provider("Dhaka", signal);

    expect(first.status).toBe("error");
    expect(second.status).toBe("ok");
    expect(calls).toBe(2);
  });

  it("evicts the oldest entry once the cap is reached", async () => {
    const inner = counting();
    const cache = withCache(inner.provider, { maxEntries: 2 });

    await cache.provider("A", signal);
    await cache.provider("B", signal);
    await cache.provider("C", signal);

    expect(cache.size()).toBeLessThanOrEqual(2);
  });

  it("exposes clear() so a caller can drop everything", async () => {
    const inner = counting();
    const cache = withCache(inner.provider);

    await cache.provider("Dhaka", signal);
    cache.clear();
    await cache.provider("Dhaka", signal);

    expect(inner.calls()).toBe(2);
  });
});
