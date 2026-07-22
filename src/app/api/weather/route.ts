/**
 * `GET|POST /api/weather` — the imperative shell's HTTP surface.
 *
 * This file is deliberately thin. It parses input, delegates to the orchestrator
 * and the pure filter, and serialises the result. All the interesting behaviour
 * lives in modules that can be unit-tested without an HTTP server.
 *
 * Two properties worth calling out:
 *
 *   - **The API key never leaves the server.** The browser talks only to this
 *     route; `OPENWEATHER_API_KEY` is read inside `resolveProvider()`, which is
 *     marked `server-only`. A client-side SPA calling OpenWeatherMap directly
 *     would have to ship the key in its bundle, where anyone can read it. This
 *     is the main architectural reason the project uses Next.js.
 *
 *   - **The same `filterWeatherData` runs here and in the browser.** The UI
 *     filters locally for instant feedback; this route accepts the identical
 *     filter parameters so the service is usable on its own from curl. One
 *     implementation, one test suite, two runtimes.
 */

import { NextResponse } from "next/server";

import {
  weatherGetQuerySchema,
  weatherPostBodySchema,
  type WeatherApiBadRequest,
  type WeatherApiResponse,
  type WeatherRequestFilters,
} from "@/lib/weather/api-contract";
import { fetchWeatherForCities } from "@/lib/weather/fetch-weather";
import { filterWeatherData } from "@/lib/weather/filter";
import { resolveProvider } from "@/lib/weather/provider";
import type { WeatherFilters } from "@/lib/weather/types";

/** Node runtime: the provider module is server-only and the cache is in-process. */
export const runtime = "nodejs";

/**
 * Never statically rendered or cached by the framework. Freshness is governed by
 * our own TTL cache, which we can reason about and invalidate; two overlapping
 * caching layers would make staleness impossible to explain.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = weatherGetQuerySchema.safeParse(params);

  if (!parsed.success) return badRequest(parsed.error.issues.map(describeIssue));

  const { cities, ...filters } = parsed.data;
  return respond(cities, filters);
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    // A malformed body is the caller's mistake, so it gets a 400 with an
    // explanation rather than a 500 that looks like our bug.
    return badRequest(["Request body must be valid JSON."]);
  }

  const parsed = weatherPostBodySchema.safeParse(payload);
  if (!parsed.success) return badRequest(parsed.error.issues.map(describeIssue));

  return respond(parsed.data.cities, parsed.data.filters ?? {});
}

async function respond(
  cities: readonly string[],
  filters: Partial<WeatherRequestFilters>,
): Promise<NextResponse<WeatherApiResponse>> {
  const { provider, demoMode } = resolveProvider();

  const batch = await fetchWeatherForCities(cities, { provider, demoMode });

  const applied = toWeatherFilters(filters);
  const filtered = Object.keys(applied).length > 0;
  const records = filtered ? filterWeatherData(batch.records, applied) : batch.records;

  /*
   * HTTP 200 even when some cities failed.
   *
   * A 500 would signal "this request produced nothing useful", which is false:
   * three good cities plus two explained errors is a complete, actionable answer
   * and the UI renders both side by side. Reserving non-2xx for "we could not
   * understand your request" keeps the status code meaningful.
   */
  return NextResponse.json(
    {
      records,
      errors: batch.errors,
      meta: { ...batch.meta, filtered },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Drop unset filters before handing them to the pure function.
 *
 * `filterWeatherData` already treats `undefined` as "no constraint", but a clean
 * object also lets the route report accurately whether filtering was applied at
 * all — which the client uses to decide whether to trust `meta.filtered`.
 */
function toWeatherFilters(filters: Partial<WeatherRequestFilters>): WeatherFilters {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) result[key] = value;
  }

  return result as WeatherFilters;
}

function describeIssue(issue: { path: PropertyKey[]; message: string }): string {
  const field = issue.path.join(".");
  return field === "" ? issue.message : `${field}: ${issue.message}`;
}

function badRequest(issues: readonly string[]): NextResponse<WeatherApiBadRequest> {
  return NextResponse.json(
    {
      error: {
        code: "BAD_REQUEST" as const,
        message: "The request could not be understood.",
        issues,
      },
    },
    { status: 400 },
  );
}
