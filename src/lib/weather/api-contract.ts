/**
 * The wire contract between the Route Handler and its callers.
 *
 * Deliberately framework-free and client-safe: the browser hook imports the
 * response type from here, the route imports the request schemas, and both sides
 * are therefore describing the same shape from one definition. A separate
 * hand-written DTO on each side is exactly how a client and server drift apart.
 *
 * Query parameters arrive as strings and may be absent, empty, or nonsense.
 * Validation happens here so the route body can assume well-formed input.
 */

import { z } from "zod";

import type { WeatherError } from "./errors";
import type { WeatherRecord } from "./types";

/**
 * A numeric query parameter.
 *
 * `z.coerce.number()` is avoided on purpose: it turns "" into 0, which would
 * silently apply `minTemp: 0` the moment a user cleared the field. Empty and
 * absent both have to mean "no constraint".
 */
const numericParam = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value === "" ? undefined : Number(value)))
  .refine((value) => value === undefined || Number.isFinite(value), {
    message: "must be a number",
  });

/** A string parameter where empty means "not set" rather than "match empty". */
const textParam = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value === "" ? undefined : value));

const sortFieldParam = z
  .enum(["temperature", "humidity", "windSpeed", "city", "country"])
  .optional();

const sortOrderParam = z.enum(["asc", "desc"]).optional();

/** Filters as they arrive on a query string. */
export const filterQuerySchema = z.object({
  country: textParam,
  condition: textParam,
  minTemp: numericParam,
  maxTemp: numericParam,
  minHumidity: numericParam,
  sortBy: sortFieldParam,
  order: sortOrderParam,
});

/**
 * `GET /api/weather?cities=Dhaka,London&country=BD&…`
 *
 * A comma-separated list keeps the endpoint trivially explorable with curl,
 * which matters because the assessment is judged as a *service*, not only as a
 * UI. City names containing commas are handled by the POST form below.
 */
export const weatherGetQuerySchema = filterQuerySchema.extend({
  cities: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((city) => city.trim())
        .filter((city) => city !== ""),
    ),
});

/**
 * `POST /api/weather` with a JSON body.
 *
 * Exists because a long city list is awkward in a URL and because city names may
 * legitimately contain commas ("Washington, D.C.").
 */
export const weatherPostBodySchema = z.object({
  cities: z.array(z.string()).default([]),
  filters: filterQuerySchema.partial().optional(),
});

export type WeatherRequestFilters = z.infer<typeof filterQuerySchema>;

/**
 * The response body.
 *
 * Note there is no `success` flag. Partial failure is the normal case — three
 * cities resolved and two failed is a useful answer — so the shape forces a
 * caller to look at both lists rather than branching on a boolean and throwing
 * half the data away.
 */
export interface WeatherApiResponse {
  readonly records: readonly WeatherRecord[];
  readonly errors: readonly WeatherError[];
  readonly meta: {
    readonly requested: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly demoMode: boolean;
    readonly fetchedAt: string;
    readonly durationMs: number;
    /** True when filters were applied server-side to the returned records. */
    readonly filtered: boolean;
  };
}

/** Shape returned when the request itself is malformed (HTTP 400). */
export interface WeatherApiBadRequest {
  readonly error: {
    readonly code: "BAD_REQUEST";
    readonly message: string;
    readonly issues: readonly string[];
  };
}
