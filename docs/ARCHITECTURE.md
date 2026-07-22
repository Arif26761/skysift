# Architecture

Why SkySift is built the way it is. Every section states a decision, the
alternative it was chosen over, and what the choice actually buys.

---

## 1. The organising principle: functional core, imperative shell

```
┌─ IMPERATIVE SHELL — I/O, effects, everything that can fail ────────────┐
│                                                                        │
│  app/api/weather/route.ts       HTTP in, HTTP out                      │
│  lib/weather/fetch-weather.ts   batching, deadlines, concurrency       │
│  lib/weather/provider/*         the only code that talks to a network  │
│  lib/weather/use-weather.ts     browser fetch, cancellation            │
│                                                                        │
│   ┌─ FUNCTIONAL CORE — pure, no I/O, no async ───────────────────┐     │
│   │                                                              │     │
│   │  lib/weather/filter.ts           filterWeatherData()         │     │
│   │  lib/weather/filter-insights.ts  the Filter Ledger           │     │
│   │  lib/weather/conditions.ts       condition → icon/colour     │     │
│   │  lib/weather/types.ts            the shared vocabulary       │     │
│   │                                                              │     │
│   └──────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

Everything that can fail lives in the shell. Everything that can be tested
without mocks lives in the core.

`filterWeatherData` has **no runtime imports at all** — the two imports in the
file are `import type`, erased at build time. That constraint is what makes the
next three sections possible.

---

## 2. Why Next.js, and not a React SPA

**The API key.** A client-only SPA calling OpenWeatherMap must ship the key to
the browser. It is in the network tab, in the JS bundle, and harvestable by
anyone. There is no way around it.

A Next.js Route Handler is a real server on the same deployment, so
`OPENWEATHER_API_KEY` is read only in `resolveProvider()` — a module marked
`server-only`, meaning importing it from a client component is a **build error**,
not a code-review catch. The browser talks only to `/api/weather`.

This is a correctness argument, not a preference. It is the single strongest
reason for the framework choice.

**Why not Express + a separate React app?** Two deployables, two CORS surfaces,
two build pipelines. One repo gives a shared type system instead: `WeatherRecord`
is _the same symbol_ on the server and in the browser, so the two cannot drift.
A two-service setup has to work to achieve that.

**Why not Laravel or Python?** Both are legitimate under the brief. But filtering
has to run _in the browser_ for filters to feel instant. In a PHP or Python
backend the filter logic would exist twice — once server-side, once in JS — or
every slider drag would round-trip. TypeScript end to end means **one
implementation, one test suite, running in both places.**

---

## 3. The provider port

```ts
type WeatherProvider = (city: string, signal: AbortSignal) => Promise<CityResult>;
```

`fetch-weather.ts` depends on this interface and never on OpenWeatherMap. Two
implementations ship: `openweather.ts` and `mock.ts`.

Four things this buys:

1. The brief permits "any public weather API" — swapping is one substitution,
   proven structurally rather than claimed.
2. Tests never touch the network. Fast, deterministic, no key in CI.
3. **The deployed demo survives a missing key, a rotated key, or an exhausted
   quota**, degrading to labelled fixture data instead of a broken page.
4. Exactly one file knows the upstream response shape, so an upstream change has
   one place to land.

The contract is strict: **a provider must never reject.** Every outcome, success
or failure, comes back as a `CityResult`.

---

## 4. Errors as data

The brief asks for "a clear error structure instead of throwing raw exceptions".
Throwing is the wrong _shape_ for this problem: a batch of five cities where one
404s is not a failure — it is four successes and one explained gap. An exception
can only say "the whole thing died".

```ts
type CityResult =
  { status: "ok"; record: WeatherRecord } | { status: "error"; error: WeatherError };

type WeatherError = {
  city: string;
  code:
    | "CITY_NOT_FOUND"
    | "INVALID_API_KEY"
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "NETWORK"
    | "INVALID_RESPONSE"
    | "UPSTREAM"
    | "INVALID_INPUT";
  message: string; // safe to show a non-technical user, verbatim
  retryable: boolean; // derived from `code`, never set by hand
};
```

**`retryable` is a property of the code, not of the call site.** Retrying a
misspelt city or a revoked key fails identically forever, so a Retry button in
those cases is the UI lying to the user. One `Set` in `errors.ts` owns that
judgement, and the UI simply reads it.

**`WeatherBatch` cannot express failure.** It has `records`, `errors` and `meta`
— and no `success` flag. There is deliberately nothing to branch on, so no
caller can accidentally discard the half that worked.

---

## 5. The batch guarantee

> _"Don't let one bad city crash the whole batch."_

Four **independent** defences, because the failure modes are independent:

| Defence                                   | Failure mode it covers                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `Promise.allSettled`, never `Promise.all` | A provider that **rejects**. `all` discards the successes.                           |
| `try/catch` around every call             | A provider that breaks the port contract.                                            |
| A deadline the **orchestrator** owns      | A provider that neither resolves nor rejects — it hangs. `allSettled` waits forever. |
| A concurrency limiter (5)                 | Prevents a _cause_: 20 parallel calls trip the 60/min free tier.                     |

The third is the subtle one. The abort signal is passed down so a well-behaved
provider cancels its socket, but the call is _also_ raced against the same
deadline — so an adapter that ignores the signal still cannot stall the batch.
There is a test using `new Promise(() => {})`, which never settles, and the batch
completes in 25ms.

Results return in **requested order**, not arrival order, so the UI is
predictable and the tests are deterministic.

---

## 6. Data flow: why filters feel instant

```
city chips change ──► POST /api/weather ──► concurrency-limited allSettled
                                            + Zod parse + 10-min TTL cache
                            │
                            ▼
                   { records, errors, meta }   ← fetched ONCE
                            │
filters change ──────► filterWeatherData(records, filters)   ← client, pure, sync
                            │                                   NO network
                            ▼
                     card grid / table
```

**Filters never hit the network.** Every filter change is a synchronous call over
≤25 objects — sub-millisecond. That is how the results update live with no
debounce, no spinner flash, and no chance of a slow response landing after a
newer one.

The same function is also exposed server-side, so the service is usable from
`curl` alone. One implementation, one test suite, two runtimes.

---

## 7. Caching

The cache is a **decorator over the provider port**, not a feature inside the
orchestrator:

```ts
const { provider } = withCache(createOpenWeatherProvider(key));
```

So caching composes. The batch layer is unaware it exists, tests inject an
uncached provider, and the policy can change without touching batching or error
handling.

**Only successes are cached.** Caching a timeout would pin a city broken for the
full TTL and make its Retry button a no-op — the exact lying-UI failure the error
model exists to prevent. It is also what makes "retry one city" efficient: a full
refetch serves the healthy cities from memory and only re-requests the failed
ones.

Measured on a live run: first call **1290 ms**, identical second call **1 ms**.

**Honest limitation:** on Vercel the cache is per-instance and vanishes on cold
start, so the hit rate is best-effort. A shared KV store is the production
answer; at this workload the in-process cache delivers most of the benefit at
none of the operational cost.

---

## 8. Validation at the boundary

TypeScript types are erased at runtime, so `await response.json()` is `any`
wearing a type. OpenWeatherMap has historically returned error envelopes with
HTTP 200 — a typed cast sails past that and crashes inside a React render.

Zod **parses instead of casting**, turning an unexpected shape into a typed,
handled `INVALID_RESPONSE` that renders as one inline card. Only the fields we
consume are declared, so upstream can add fields without breaking us.

The same principle applies to inbound query parameters — with one trap worth
naming: **`z.coerce.number()` is deliberately avoided**, because it turns `""`
into `0`. A coercing schema would silently apply `minTemp: 0` the instant a user
cleared the field. Empty and absent both have to mean _no constraint_.

That guard now exists at three layers: `filterWeatherData` (`Number.isFinite`),
the API contract, and the UI's number inputs.

---

## 9. Client state

Three pieces of state exist in the whole application — the city list, the
filters, and the view mode. Everything else is **derived**: the filtered records,
the ledger, the dropdown options, the temperature domain.

That is why the table's column headers and the filter panel's sort dropdown
cannot disagree. They are two views of one value, not two copies of one fact.

Dropdown options are derived from loaded data rather than hardcoded. Offering
"France" when no French city is present would let a user build a filter
guaranteed to return nothing — the UI inviting a dead end.

**Why no query library.** One endpoint, one cache key, no mutations. TanStack
Query would be ~13kB and a layer of indirection for problems this app does not
have. The two things that genuinely matter — cancelling superseded requests and
ignoring out-of-order responses — are twenty lines, and writing them makes the
behaviour inspectable.

---

## 10. The Filter Ledger

The feature the project is built around, and the clearest payoff of the pure-core
discipline.

Every filter UI shares one blind spot: you narrow the data, rows vanish, and
nothing says _which control_ removed them. Users then reset things at random.

For each active filter, run `filterWeatherData` again with that one filter
omitted. The difference in count is that filter's contribution — a leave-one-out
sensitivity analysis:

```
Showing 2 of 5   [Condition · Clouds −2 ×]  [Humidity ≥ 60% −0 ×]   Reset all
```

This is only affordable **because `filterWeatherData` is pure**: six passes over
a small array, with no I/O and no chance of the repeated calls interfering. The
architectural discipline Part 2 asked for unlocked a product feature the brief
never requested.

**The counts are marginal contributions, not set sizes.** When two filters
exclude the same record, neither gets credit, so entries will not sum to
`total − shown`. That is the honest number: the user is asking _"what do I get
back by relaxing this one?"_, and a set-size figure would send them to relax a
filter that changes nothing.

When results hit zero, the ledger names the **culprit** — the filter whose
removal recovers the most records — and the empty state offers to relax exactly
that one. When no single filter unblocks the set, it says so rather than blaming
an innocent control.
