/**
 * The provider port.
 *
 * The batch orchestrator depends on this interface and never on OpenWeatherMap.
 * That indirection is one line of code and buys four things:
 *
 *   1. The brief allows "any public weather API" — swapping provider is a single
 *      substitution, proven structurally rather than merely claimed.
 *   2. Unit tests inject a stub, so the suite never touches the network and is
 *      fully deterministic.
 *   3. Demo Mode: with no API key we substitute a fixture provider, so the public
 *      deployment still works instead of showing a broken page to a recruiter.
 *   4. Exactly one file in the codebase knows OpenWeatherMap's response shape, so
 *      an upstream change has one place to land.
 */

import type { CityResult } from "../errors";

/**
 * Fetch one city.
 *
 * The contract is deliberately strict: **a provider must never reject.** Every
 * outcome, including failure, comes back as a `CityResult`. Callers therefore
 * never need a try/catch to stay alive — though the orchestrator keeps one
 * anyway as defence in depth, since a third-party provider could always break
 * the contract.
 *
 * @param city   Raw city name as typed by the user.
 * @param signal Abort signal carrying the caller's deadline.
 */
export type WeatherProvider = (city: string, signal: AbortSignal) => Promise<CityResult>;
