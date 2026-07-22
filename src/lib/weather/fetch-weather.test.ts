import { describe, expect, it } from "vitest";

import { createWeatherError } from "./errors";
import type { CityResult } from "./errors";
import { MAX_CITIES, fetchWeatherForCities } from "./fetch-weather";
import { makeRecord } from "./fixtures";
import type { WeatherProvider } from "./provider/types";

/** A provider that succeeds for every city. */
const alwaysOk: WeatherProvider = async (city) => ({
  status: "ok",
  record: makeRecord({ city, countryCode: "XX" }),
});

/** A provider that fails for the named cities and succeeds for the rest. */
function failingFor(...cities: string[]): WeatherProvider {
  const failures = new Set(cities.map((c) => c.toLowerCase()));
  return async (city) =>
    failures.has(city.toLowerCase())
      ? { status: "error", error: createWeatherError(city, "CITY_NOT_FOUND") }
      : { status: "ok", record: makeRecord({ city }) };
}

const names = (records: readonly { city: string }[]): string[] =>
  records.map((r) => r.city);

describe("fetchWeatherForCities", () => {
  describe("the batch guarantee", () => {
    it("returns one entry per city across records and errors", async () => {
      const batch = await fetchWeatherForCities(
        ["Dhaka", "Chittagong", "London", "Tokyo", "New York"],
        { provider: alwaysOk },
      );

      expect(batch.records).toHaveLength(5);
      expect(batch.errors).toHaveLength(0);
      expect(batch.meta.requested).toBe(5);
    });

    it("keeps the good cities when one fails — the core Part 3 requirement", async () => {
      // Promise.all would reject here and discard all three successes.
      const batch = await fetchWeatherForCities(
        ["Dhaka", "Nowhereville", "London", "Atlantis", "Tokyo"],
        { provider: failingFor("Nowhereville", "Atlantis") },
      );

      expect(names(batch.records)).toEqual(["Dhaka", "London", "Tokyo"]);
      expect(batch.errors.map((e) => e.city)).toEqual(["Nowhereville", "Atlantis"]);
      expect(batch.meta).toMatchObject({ requested: 5, succeeded: 3, failed: 2 });
    });

    it("survives a provider that breaks the contract and throws", async () => {
      // The port says providers never reject. A contract is not an enforcement
      // mechanism, so the orchestrator catches it anyway.
      const rogue: WeatherProvider = async (city) => {
        if (city === "Boom") throw new Error("kaboom");
        return { status: "ok", record: makeRecord({ city }) };
      };

      const batch = await fetchWeatherForCities(["Dhaka", "Boom", "London"], {
        provider: rogue,
      });

      expect(names(batch.records)).toEqual(["Dhaka", "London"]);
      expect(batch.errors).toHaveLength(1);
      expect(batch.errors[0]?.city).toBe("Boom");
    });

    it("never rejects, even when every city fails", async () => {
      const allFail: WeatherProvider = async (city) => ({
        status: "error",
        error: createWeatherError(city, "UPSTREAM"),
      });

      await expect(
        fetchWeatherForCities(["A", "B"], { provider: allFail }),
      ).resolves.toMatchObject({ meta: { succeeded: 0, failed: 2 } });
    });

    it("returns records in the requested order, not the order they arrived", async () => {
      // Deliberately resolves in reverse: a naive implementation that pushes on
      // completion would return them backwards.
      const staggered: WeatherProvider = async (city) => {
        const delayMs = city === "First" ? 40 : 0;
        await new Promise((r) => setTimeout(r, delayMs));
        return { status: "ok", record: makeRecord({ city }) };
      };

      const batch = await fetchWeatherForCities(["First", "Second", "Third"], {
        provider: staggered,
        concurrency: 3,
      });

      expect(names(batch.records)).toEqual(["First", "Second", "Third"]);
    });
  });

  describe("deadlines", () => {
    it("cuts off a provider that hangs and ignores its abort signal", async () => {
      // The deadline is enforced by the orchestrator, not delegated to the
      // provider, so an uncooperative adapter still cannot stall the batch.
      const hangs: WeatherProvider = (city) =>
        city === "Blackhole"
          ? new Promise<CityResult>(() => {})
          : Promise.resolve({ status: "ok", record: makeRecord({ city }) });

      const batch = await fetchWeatherForCities(["Dhaka", "Blackhole"], {
        provider: hangs,
        timeoutMs: 25,
      });

      expect(names(batch.records)).toEqual(["Dhaka"]);
      expect(batch.errors[0]).toMatchObject({
        city: "Blackhole",
        code: "TIMEOUT",
        retryable: true,
      });
    });
  });

  describe("input normalisation", () => {
    it("de-duplicates case-insensitively and keeps the first spelling", async () => {
      let calls = 0;
      const counting: WeatherProvider = async (city) => {
        calls += 1;
        return { status: "ok", record: makeRecord({ city }) };
      };

      const batch = await fetchWeatherForCities(["London", "london", "  LONDON  "], {
        provider: counting,
      });

      expect(calls).toBe(1);
      expect(names(batch.records)).toEqual(["London"]);
    });

    it("drops blank entries without reporting them as errors", async () => {
      const batch = await fetchWeatherForCities(["Dhaka", "", "   "], {
        provider: alwaysOk,
      });

      expect(batch.records).toHaveLength(1);
      expect(batch.errors).toHaveLength(0);
      expect(batch.meta.requested).toBe(1);
    });

    it("caps the batch and reports the overflow instead of silently dropping it", async () => {
      const cities = Array.from({ length: MAX_CITIES + 3 }, (_, i) => `City ${i}`);

      const batch = await fetchWeatherForCities(cities, { provider: alwaysOk });

      expect(batch.records).toHaveLength(MAX_CITIES);
      expect(batch.errors).toHaveLength(3);
      expect(batch.errors[0]?.code).toBe("INVALID_INPUT");
    });

    it("returns an empty batch for an empty request", async () => {
      const batch = await fetchWeatherForCities([], { provider: alwaysOk });

      expect(batch.records).toEqual([]);
      expect(batch.errors).toEqual([]);
      expect(batch.meta.requested).toBe(0);
    });
  });

  describe("concurrency", () => {
    it("never exceeds the configured limit", async () => {
      // Guards the free tier: an unbounded fan-out over 20 cities would trip
      // OpenWeatherMap's rate limit and turn one slow batch into many failures.
      let inFlight = 0;
      let peak = 0;

      const tracked: WeatherProvider = async (city) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return { status: "ok", record: makeRecord({ city }) };
      };

      const cities = Array.from({ length: 12 }, (_, i) => `City ${i}`);
      await fetchWeatherForCities(cities, { provider: tracked, concurrency: 3 });

      expect(peak).toBeLessThanOrEqual(3);
    });

    it("still completes when the limit exceeds the number of cities", async () => {
      const batch = await fetchWeatherForCities(["Dhaka"], {
        provider: alwaysOk,
        concurrency: 10,
      });

      expect(batch.records).toHaveLength(1);
    });
  });

  describe("metadata", () => {
    it("reports demo mode so the UI can label fixture data honestly", async () => {
      const batch = await fetchWeatherForCities(["Dhaka"], {
        provider: alwaysOk,
        demoMode: true,
      });

      expect(batch.meta.demoMode).toBe(true);
      expect(batch.meta.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(batch.meta.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
