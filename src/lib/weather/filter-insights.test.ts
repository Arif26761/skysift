import { describe, expect, it } from "vitest";

import { buildFilterLedger } from "./filter-insights";
import { makeRecord } from "./fixtures";
import type { WeatherRecord } from "./types";

const DATA: readonly WeatherRecord[] = [
  makeRecord({
    city: "Dhaka",
    countryCode: "BD",
    temperature: 32,
    humidity: 74,
    condition: "Clear",
  }),
  makeRecord({
    city: "Chittagong",
    countryCode: "BD",
    temperature: 29,
    humidity: 83,
    condition: "Rain",
  }),
  makeRecord({
    city: "Sylhet",
    countryCode: "BD",
    temperature: 24,
    humidity: 88,
    condition: "Rain",
  }),
  makeRecord({
    city: "London",
    countryCode: "GB",
    temperature: 14,
    humidity: 71,
    condition: "Clouds",
  }),
  makeRecord({
    city: "Manchester",
    countryCode: "GB",
    temperature: 9,
    humidity: 89,
    condition: "Drizzle",
  }),
  makeRecord({
    city: "Tokyo",
    countryCode: "JP",
    temperature: 21,
    humidity: 64,
    condition: "Clouds",
  }),
  makeRecord({
    city: "New York",
    countryCode: "US",
    temperature: 18,
    humidity: 55,
    condition: "Clear",
  }),
  makeRecord({
    city: "Reykjavik",
    countryCode: "IS",
    temperature: -2,
    humidity: 90,
    condition: "Snow",
  }),
  makeRecord({
    city: "Cairo",
    countryCode: "EG",
    temperature: 36,
    humidity: 19,
    condition: "Clear",
  }),
];

describe("buildFilterLedger", () => {
  describe("with no active filters", () => {
    it("reports everything as shown and lists no chips", () => {
      const ledger = buildFilterLedger(DATA, {});

      expect(ledger.total).toBe(9);
      expect(ledger.shown).toBe(9);
      expect(ledger.active).toEqual([]);
      expect(ledger.culprit).toBeNull();
    });

    it("ignores sorting — reordering never removes records", () => {
      const ledger = buildFilterLedger(DATA, { sortBy: "temperature", order: "desc" });

      expect(ledger.shown).toBe(9);
      expect(ledger.active).toEqual([]);
    });

    it("treats blank and non-finite values as inactive", () => {
      const ledger = buildFilterLedger(DATA, {
        country: "  ",
        condition: "",
        minTemp: Number.NaN,
        minHumidity: Number.NaN,
      });

      expect(ledger.active).toEqual([]);
      expect(ledger.shown).toBe(9);
    });
  });

  describe("exclusion counts", () => {
    it("reports how many records a single filter removed", () => {
      const ledger = buildFilterLedger(DATA, { country: "BD" });

      expect(ledger.shown).toBe(3);
      expect(ledger.active).toEqual([
        { key: "country", label: "Country · BD", excluded: 6 },
      ]);
    });

    it("reports a marginal contribution per filter when several are active", () => {
      // BD ∩ humidity>=85 leaves only Sylhet.
      //   without country  -> Sylhet, Manchester, Reykjavik  (3) => +2
      //   without humidity -> Dhaka, Chittagong, Sylhet      (3) => +2
      const ledger = buildFilterLedger(DATA, { country: "BD", minHumidity: 85 });

      expect(ledger.shown).toBe(1);
      expect(ledger.active).toEqual([
        { key: "country", label: "Country · BD", excluded: 2 },
        { key: "humidity", label: "Humidity ≥ 85%", excluded: 2 },
      ]);
    });

    it("reports zero for a filter that excludes nothing the others did not already", () => {
      // temp>=30 ∩ Clear leaves Dhaka and Cairo.
      //   without temp      -> Dhaka, New York, Cairo (3) => +1
      //   without condition -> Dhaka, Cairo          (2) => +0
      //
      // Note the counts sum to 1 while 7 records are hidden: these are marginal
      // gains ("what do I get back by relaxing this one?"), not set sizes. That
      // is the number a user is actually asking for.
      const ledger = buildFilterLedger(DATA, { minTemp: 30, condition: "Clear" });

      expect(ledger.shown).toBe(2);
      expect(ledger.active).toEqual([
        { key: "temperature", label: "Temp ≥ 30°", excluded: 1 },
        { key: "condition", label: "Condition · Clear", excluded: 0 },
      ]);
    });

    it("collapses the temperature range into a single entry", () => {
      // A user dragged one control, so they see one chip — not a min chip and a
      // max chip.
      const ledger = buildFilterLedger(DATA, { minTemp: 20, maxTemp: 30 });

      expect(ledger.active).toHaveLength(1);
      expect(ledger.active[0]?.label).toBe("Temp 20–30°");
    });

    it("orders chips consistently regardless of filter insertion order", () => {
      const a = buildFilterLedger(DATA, { minHumidity: 60, country: "BD" });
      const b = buildFilterLedger(DATA, { country: "BD", minHumidity: 60 });

      expect(a.active.map((e) => e.key)).toEqual(["country", "humidity"]);
      expect(a).toEqual(b);
    });
  });

  describe("labels", () => {
    it("describes an open-ended lower bound", () => {
      expect(buildFilterLedger(DATA, { minTemp: 25 }).active[0]?.label).toBe(
        "Temp ≥ 25°",
      );
    });

    it("describes an open-ended upper bound", () => {
      expect(buildFilterLedger(DATA, { maxTemp: 15 }).active[0]?.label).toBe(
        "Temp ≤ 15°",
      );
    });

    it("normalises country codes to upper case", () => {
      expect(buildFilterLedger(DATA, { country: "bd" }).active[0]?.label).toBe(
        "Country · BD",
      );
    });

    it("capitalises the condition", () => {
      expect(buildFilterLedger(DATA, { condition: "rain" }).active[0]?.label).toBe(
        "Condition · Rain",
      );
    });
  });

  describe("culprit detection", () => {
    it("is null while results are non-empty", () => {
      expect(buildFilterLedger(DATA, { country: "BD" }).culprit).toBeNull();
    });

    it("names the filter whose removal recovers the most records", () => {
      // Nothing is at or above 40 degrees, so the temperature bound is to blame:
      // dropping the country filter still yields nothing, dropping temperature
      // brings back all three Bangladeshi cities.
      const ledger = buildFilterLedger(DATA, { country: "BD", minTemp: 40 });

      expect(ledger.shown).toBe(0);
      expect(ledger.culprit).toEqual({
        key: "temperature",
        label: "Temp ≥ 40°",
        excluded: 3,
      });
    });

    it("returns null when no single filter can unblock the result set", () => {
      // Both filters independently match nothing, so blaming either one would
      // mislead the user into relaxing a control that will not help.
      const ledger = buildFilterLedger(DATA, { country: "ZZ", minTemp: 40 });

      expect(ledger.shown).toBe(0);
      expect(ledger.culprit).toBeNull();
    });
  });

  describe("purity", () => {
    it("does not mutate the filters it is given", () => {
      const filters = { country: "BD", minTemp: 20, maxTemp: 30, minHumidity: 70 };
      const snapshot = { ...filters };

      buildFilterLedger(DATA, filters);

      expect(filters).toEqual(snapshot);
    });

    it("does not mutate the dataset it is given", () => {
      const input = [...DATA];
      const before = input.map((r) => r.city);

      buildFilterLedger(input, { sortBy: "temperature", country: "BD" });

      expect(input.map((r) => r.city)).toEqual(before);
    });
  });
});
