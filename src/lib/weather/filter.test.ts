import { describe, expect, it } from "vitest";

import { filterWeatherData } from "./filter";
import { makeRecord } from "./fixtures";
import type { WeatherRecord } from "./types";

/**
 * A small, hand-checkable dataset. Nine records spread across six countries,
 * five conditions, temperatures from -2 to 36 and humidities from 19 to 90 —
 * enough that every filter has something to bite on, small enough that the
 * expected output of any query can be verified by eye.
 */
const DATA: readonly WeatherRecord[] = [
  makeRecord({
    city: "Dhaka",
    countryCode: "BD",
    temperature: 32,
    humidity: 74,
    condition: "Clear",
    windSpeed: 3.1,
  }),
  makeRecord({
    city: "Chittagong",
    countryCode: "BD",
    temperature: 29,
    humidity: 83,
    condition: "Rain",
    windSpeed: 4.6,
  }),
  makeRecord({
    city: "Sylhet",
    countryCode: "BD",
    temperature: 24,
    humidity: 88,
    condition: "Rain",
    windSpeed: 2.2,
  }),
  makeRecord({
    city: "London",
    countryCode: "GB",
    temperature: 14,
    humidity: 71,
    condition: "Clouds",
    windSpeed: 5.7,
  }),
  makeRecord({
    city: "Manchester",
    countryCode: "GB",
    temperature: 9,
    humidity: 89,
    condition: "Drizzle",
    windSpeed: 6.2,
  }),
  makeRecord({
    city: "Tokyo",
    countryCode: "JP",
    temperature: 21,
    humidity: 64,
    condition: "Clouds",
    windSpeed: 3.3,
  }),
  makeRecord({
    city: "New York",
    countryCode: "US",
    temperature: 18,
    humidity: 55,
    condition: "Clear",
    windSpeed: 4.1,
  }),
  makeRecord({
    city: "Reykjavik",
    countryCode: "IS",
    temperature: -2,
    humidity: 90,
    condition: "Snow",
    windSpeed: 9.4,
  }),
  makeRecord({
    city: "Cairo",
    countryCode: "EG",
    temperature: 36,
    humidity: 19,
    condition: "Clear",
    windSpeed: 2.0,
  }),
];

/** Assertions read better as city names than as whole record objects. */
const names = (records: readonly WeatherRecord[]): string[] => records.map((r) => r.city);

describe("filterWeatherData", () => {
  describe("purity", () => {
    it("returns a new array rather than the input", () => {
      expect(filterWeatherData(DATA)).not.toBe(DATA);
    });

    it("does not mutate the input when sorting", () => {
      // The riskiest case: sorting is in-place, so if the implementation ever
      // sorted the caller's array directly this assertion would catch it.
      const input = [...DATA];
      const before = names(input);

      filterWeatherData(input, { sortBy: "temperature", order: "desc" });

      expect(names(input)).toEqual(before);
    });

    it("is idempotent — the same input always yields the same output", () => {
      const filters = { country: "BD", sortBy: "temperature" } as const;
      expect(filterWeatherData(DATA, filters)).toEqual(filterWeatherData(DATA, filters));
    });
  });

  describe("with no filters", () => {
    it("returns every record in the original order", () => {
      expect(names(filterWeatherData(DATA, {}))).toEqual(names(DATA));
    });

    it("treats an omitted filters argument as no constraint", () => {
      expect(filterWeatherData(DATA)).toHaveLength(DATA.length);
    });

    it("returns an empty array for an empty dataset", () => {
      expect(filterWeatherData([], { country: "BD" })).toEqual([]);
    });
  });

  describe("country filter", () => {
    it("keeps only records from the requested country", () => {
      expect(names(filterWeatherData(DATA, { country: "BD" }))).toEqual([
        "Dhaka",
        "Chittagong",
        "Sylhet",
      ]);
    });

    it("matches case-insensitively", () => {
      expect(filterWeatherData(DATA, { country: "bd" })).toHaveLength(3);
    });

    it("ignores surrounding whitespace", () => {
      expect(filterWeatherData(DATA, { country: "  gb  " })).toHaveLength(2);
    });

    it("treats a blank string as no constraint", () => {
      expect(filterWeatherData(DATA, { country: "   " })).toHaveLength(DATA.length);
    });

    it("returns an empty array when nothing matches", () => {
      expect(filterWeatherData(DATA, { country: "ZZ" })).toEqual([]);
    });
  });

  describe("temperature range", () => {
    it("applies minTemp inclusively", () => {
      // Sylhet is exactly 24 and must be kept.
      expect(names(filterWeatherData(DATA, { minTemp: 24 }))).toEqual([
        "Dhaka",
        "Chittagong",
        "Sylhet",
        "Cairo",
      ]);
    });

    it("applies maxTemp inclusively", () => {
      // Manchester is exactly 9 and must be kept.
      expect(names(filterWeatherData(DATA, { maxTemp: 9 }))).toEqual([
        "Manchester",
        "Reykjavik",
      ]);
    });

    it("combines both bounds into a closed range", () => {
      expect(names(filterWeatherData(DATA, { minTemp: 14, maxTemp: 24 }))).toEqual([
        "Sylhet",
        "London",
        "Tokyo",
        "New York",
      ]);
    });

    it("handles negative temperatures", () => {
      expect(names(filterWeatherData(DATA, { maxTemp: 0 }))).toEqual(["Reykjavik"]);
    });

    it("ignores a NaN bound instead of excluding everything", () => {
      // An empty <input type="number"> yields NaN. Every comparison against NaN
      // is false, so a naive implementation would return zero results and look
      // broken the moment a user clears the field.
      expect(filterWeatherData(DATA, { minTemp: Number.NaN })).toHaveLength(DATA.length);
    });
  });

  describe("condition filter", () => {
    it("matches the raw provider label", () => {
      expect(names(filterWeatherData(DATA, { condition: "Rain" }))).toEqual([
        "Chittagong",
        "Sylhet",
      ]);
    });

    it("matches case-insensitively", () => {
      expect(filterWeatherData(DATA, { condition: "clear" })).toHaveLength(3);
    });

    it("also matches the normalised condition group", () => {
      // The provider labels this "Haze"; the UI offers the "Mist" family. A user
      // picking the Mist icon expects to catch it.
      const hazy = [...DATA, makeRecord({ city: "San Francisco", condition: "Haze" })];

      expect(names(filterWeatherData(hazy, { condition: "Mist" }))).toEqual([
        "San Francisco",
      ]);
      expect(names(filterWeatherData(hazy, { condition: "Haze" }))).toEqual([
        "San Francisco",
      ]);
    });
  });

  describe("humidity threshold", () => {
    it("applies minHumidity inclusively", () => {
      // Chittagong is exactly 83 and must be kept.
      expect(names(filterWeatherData(DATA, { minHumidity: 83 }))).toEqual([
        "Chittagong",
        "Sylhet",
        "Manchester",
        "Reykjavik",
      ]);
    });
  });

  describe("sorting", () => {
    it("sorts by temperature ascending", () => {
      expect(
        names(filterWeatherData(DATA, { sortBy: "temperature", order: "asc" })),
      ).toEqual([
        "Reykjavik",
        "Manchester",
        "London",
        "New York",
        "Tokyo",
        "Sylhet",
        "Chittagong",
        "Dhaka",
        "Cairo",
      ]);
    });

    it("sorts by temperature descending", () => {
      expect(
        names(filterWeatherData(DATA, { sortBy: "temperature", order: "desc" })),
      ).toEqual([
        "Cairo",
        "Dhaka",
        "Chittagong",
        "Sylhet",
        "Tokyo",
        "New York",
        "London",
        "Manchester",
        "Reykjavik",
      ]);
    });

    it("defaults to ascending when order is omitted", () => {
      expect(filterWeatherData(DATA, { sortBy: "temperature" })).toEqual(
        filterWeatherData(DATA, { sortBy: "temperature", order: "asc" }),
      );
    });

    it("sorts by humidity", () => {
      expect(
        names(filterWeatherData(DATA, { sortBy: "humidity", order: "desc" })).slice(0, 3),
      ).toEqual(["Reykjavik", "Manchester", "Sylhet"]);
    });

    it("sorts by wind speed", () => {
      expect(names(filterWeatherData(DATA, { sortBy: "windSpeed" })).slice(0, 3)).toEqual(
        ["Cairo", "Sylhet", "Dhaka"],
      );
    });

    it("sorts by city name alphabetically", () => {
      expect(names(filterWeatherData(DATA, { sortBy: "city" }))).toEqual([
        "Cairo",
        "Chittagong",
        "Dhaka",
        "London",
        "Manchester",
        "New York",
        "Reykjavik",
        "Sylhet",
        "Tokyo",
      ]);
    });

    it("groups by country, then orders cities within each country", () => {
      expect(names(filterWeatherData(DATA, { sortBy: "country" }))).toEqual([
        "Chittagong",
        "Dhaka",
        "Sylhet", // BD
        "Cairo", // EG
        "London",
        "Manchester", // GB
        "Reykjavik", // IS
        "Tokyo", // JP
        "New York", // US
      ]);
    });

    it("is stable — equal records keep their original relative order", () => {
      const tied = [
        makeRecord({ city: "Alpha", temperature: 10 }),
        makeRecord({ city: "Bravo", temperature: 10 }),
        makeRecord({ city: "Charlie", temperature: 10 }),
      ];

      expect(names(filterWeatherData(tied, { sortBy: "temperature" }))).toEqual([
        "Alpha",
        "Bravo",
        "Charlie",
      ]);
    });
  });

  describe("combined filters", () => {
    it("satisfies the example call from the assessment brief", () => {
      // filterWeatherData(data, {
      //   country: "BD", minTemp: 25, condition: "Clear",
      //   sortBy: "temperature", order: "desc",
      // });
      const result = filterWeatherData(DATA, {
        country: "BD",
        minTemp: 25,
        condition: "Clear",
        sortBy: "temperature",
        order: "desc",
      });

      expect(names(result)).toEqual(["Dhaka"]);
    });

    it("applies every filter type at once with AND semantics", () => {
      const result = filterWeatherData(DATA, {
        country: "BD",
        minTemp: 20,
        maxTemp: 30,
        condition: "Rain",
        minHumidity: 80,
        sortBy: "temperature",
        order: "asc",
      });

      expect(names(result)).toEqual(["Sylhet", "Chittagong"]);
    });

    it("returns an empty array when the combination excludes everything", () => {
      expect(
        filterWeatherData(DATA, { country: "BD", condition: "Snow", minHumidity: 95 }),
      ).toEqual([]);
    });
  });
});
