/**
 * Deterministic weather fixtures.
 *
 * Serves two purposes, which is why it lives in the core rather than in a test
 * folder:
 *
 *   1. The mock `WeatherProvider` reads from here, so Demo Mode (no API key,
 *      exhausted quota, offline) shows a believable, varied dataset instead of
 *      an error page.
 *   2. Unit tests build their datasets with `makeRecord`, so a test only has to
 *      state the fields it actually cares about.
 *
 * Values are plausible rather than real, and are intentionally spread across
 * countries, conditions, temperatures and humidities so that every filter in
 * Part 2 has something meaningful to bite on.
 */

import { toConditionGroup } from "./conditions";
import type { WeatherRecord } from "./types";

/**
 * A fixed timestamp. Fixtures must be deterministic — a `new Date()` here would
 * make snapshot-style assertions flaky and would defeat response caching in the
 * mock provider.
 */
export const FIXTURE_TIMESTAMP = "2026-07-22T18:00:00.000Z";

type RecordSeed = Partial<WeatherRecord> & { readonly city: string };

/**
 * Build a `WeatherRecord` from a partial seed.
 *
 * `conditionGroup` is derived from `condition` unless explicitly overridden, so
 * a fixture can never accidentally declare a condition and a group that
 * disagree — the same normalisation the live provider uses.
 */
export function makeRecord(seed: RecordSeed): WeatherRecord {
  const condition = seed.condition ?? "Clear";
  const temperature = seed.temperature ?? 20;
  return {
    city: seed.city,
    countryCode: seed.countryCode ?? "XX",
    temperature,
    feelsLike: seed.feelsLike ?? temperature,
    humidity: seed.humidity ?? 50,
    condition,
    conditionGroup: seed.conditionGroup ?? toConditionGroup(condition),
    description: seed.description ?? condition.toLowerCase(),
    windSpeed: seed.windSpeed ?? 3,
    fetchedAt: seed.fetchedAt ?? FIXTURE_TIMESTAMP,
  };
}

/**
 * The Demo Mode dataset. Includes the five cities from the brief's example input
 * plus enough variety that the country dropdown, temperature range, condition
 * filter and humidity threshold each have several distinct values to work with.
 */
export const DEMO_RECORDS: readonly WeatherRecord[] = [
  makeRecord({
    city: "Dhaka",
    countryCode: "BD",
    temperature: 32.4,
    feelsLike: 38.1,
    humidity: 74,
    condition: "Clear",
    description: "clear sky",
    windSpeed: 3.1,
  }),
  makeRecord({
    city: "Chittagong",
    countryCode: "BD",
    temperature: 29.2,
    feelsLike: 34.6,
    humidity: 83,
    condition: "Rain",
    description: "moderate rain",
    windSpeed: 4.6,
  }),
  makeRecord({
    city: "Sylhet",
    countryCode: "BD",
    temperature: 24.8,
    feelsLike: 26.0,
    humidity: 88,
    condition: "Thunderstorm",
    description: "thunderstorm with light rain",
    windSpeed: 2.2,
  }),
  makeRecord({
    city: "London",
    countryCode: "GB",
    temperature: 14.1,
    feelsLike: 13.2,
    humidity: 71,
    condition: "Clouds",
    description: "broken clouds",
    windSpeed: 5.7,
  }),
  makeRecord({
    city: "Manchester",
    countryCode: "GB",
    temperature: 9.6,
    feelsLike: 7.4,
    humidity: 89,
    condition: "Drizzle",
    description: "light intensity drizzle",
    windSpeed: 6.2,
  }),
  makeRecord({
    city: "Tokyo",
    countryCode: "JP",
    temperature: 21.7,
    feelsLike: 22.0,
    humidity: 64,
    condition: "Clouds",
    description: "scattered clouds",
    windSpeed: 3.3,
  }),
  makeRecord({
    city: "New York",
    countryCode: "US",
    temperature: 18.3,
    feelsLike: 17.9,
    humidity: 55,
    condition: "Clear",
    description: "clear sky",
    windSpeed: 4.1,
  }),
  makeRecord({
    city: "San Francisco",
    countryCode: "US",
    temperature: 16.0,
    feelsLike: 15.1,
    humidity: 78,
    condition: "Haze",
    description: "haze",
    windSpeed: 5.0,
  }),
  makeRecord({
    city: "Reykjavik",
    countryCode: "IS",
    temperature: -1.8,
    feelsLike: -7.2,
    humidity: 90,
    condition: "Snow",
    description: "light snow",
    windSpeed: 9.4,
  }),
  makeRecord({
    city: "Cairo",
    countryCode: "EG",
    temperature: 36.9,
    feelsLike: 35.4,
    humidity: 19,
    condition: "Clear",
    description: "clear sky",
    windSpeed: 2.0,
  }),
  makeRecord({
    city: "Sydney",
    countryCode: "AU",
    temperature: 12.5,
    feelsLike: 11.8,
    humidity: 66,
    condition: "Rain",
    description: "light rain",
    windSpeed: 7.1,
  }),
  makeRecord({
    city: "Moscow",
    countryCode: "RU",
    temperature: 4.2,
    feelsLike: 0.6,
    humidity: 81,
    condition: "Clouds",
    description: "overcast clouds",
    windSpeed: 4.8,
  }),
];

/** Case-insensitive lookup used by the mock provider. */
export const DEMO_RECORDS_BY_CITY: ReadonlyMap<string, WeatherRecord> = new Map(
  DEMO_RECORDS.map((record) => [record.city.toLowerCase(), record]),
);
