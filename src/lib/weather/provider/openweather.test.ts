import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenWeatherProvider } from "./openweather";

const API_KEY = "test-key-0123456789abcdef";

/** A well-formed OpenWeatherMap "current weather" payload. */
const VALID_PAYLOAD = {
  name: "Dhaka",
  sys: { country: "bd" },
  main: { temp: 32.43000000000001, feels_like: 38.1, humidity: 74.4 },
  weather: [{ main: "Rain", description: "moderate rain" }],
  wind: { speed: 3.14159 },
  extraFieldWeDoNotCareAbout: true,
};

function stubFetch(
  response: Partial<Response> & { json?: () => Promise<unknown> },
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, ...response }) as Response),
  );
}

function stubFetchRejecting(cause: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw cause;
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createOpenWeatherProvider", () => {
  const signal = new AbortController().signal;

  describe("successful responses", () => {
    it("normalises the payload into a provider-agnostic record", async () => {
      stubFetch({ json: async () => VALID_PAYLOAD });

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;

      expect(result.record).toMatchObject({
        city: "Dhaka",
        countryCode: "BD", // upper-cased
        temperature: 32.4, // rounded to one decimal
        feelsLike: 38.1,
        humidity: 74, // integer
        condition: "Rain",
        conditionGroup: "Rain",
        description: "moderate rain",
        windSpeed: 3.1,
      });
    });

    it("ignores unknown fields so upstream can add them without breaking us", async () => {
      stubFetch({ json: async () => VALID_PAYLOAD });

      await expect(
        createOpenWeatherProvider(API_KEY)("Dhaka", signal),
      ).resolves.toMatchObject({
        status: "ok",
      });
    });

    it("tolerates a missing country code rather than discarding usable data", async () => {
      stubFetch({ json: async () => ({ ...VALID_PAYLOAD, sys: undefined }) });

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status === "ok" && result.record.countryCode).toBe("??");
    });

    it("sends the key as a query parameter and requests metric units", async () => {
      stubFetch({ json: async () => VALID_PAYLOAD });
      const provider = createOpenWeatherProvider(API_KEY);

      await provider("New York", signal);

      const call = vi.mocked(fetch).mock.calls[0]?.[0];
      const url = new URL(String(call));

      expect(url.searchParams.get("q")).toBe("New York");
      expect(url.searchParams.get("units")).toBe("metric");
      expect(url.searchParams.get("appid")).toBe(API_KEY);
    });
  });

  describe("HTTP failures map to our vocabulary", () => {
    it.each([
      [401, "INVALID_API_KEY", false],
      [403, "INVALID_API_KEY", false],
      [404, "CITY_NOT_FOUND", false],
      [429, "RATE_LIMITED", true],
      [500, "UPSTREAM", true],
      [503, "UPSTREAM", true],
    ])("maps HTTP %i to %s (retryable: %s)", async (status, code, retryable) => {
      stubFetch({ ok: false, status });

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status).toBe("error");
      if (result.status !== "error") return;
      // The mapping decides whether the UI offers Retry, so it is behaviour,
      // not cosmetics: 404 and 401 are permanent for the same input.
      expect(result.error).toMatchObject({ code, retryable });
    });
  });

  describe("malformed responses", () => {
    it("reports INVALID_RESPONSE when the shape does not match", async () => {
      // OpenWeatherMap has historically returned error envelopes with HTTP 200.
      // A typed cast would sail past this and crash inside a React render.
      stubFetch({ json: async () => ({ cod: 200, message: "unexpected" }) });

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status === "error" && result.error.code).toBe("INVALID_RESPONSE");
    });

    it("reports INVALID_RESPONSE when the body is not JSON at all", async () => {
      stubFetch({
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        },
      });

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status).toBe("error");
    });
  });

  describe("transport failures", () => {
    it("maps a transport-level TypeError to NETWORK", async () => {
      stubFetchRejecting(new TypeError("fetch failed"));

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status === "error" && result.error.code).toBe("NETWORK");
    });

    it("maps an abort to TIMEOUT", async () => {
      stubFetchRejecting(new DOMException("The operation timed out.", "TimeoutError"));

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status === "error" && result.error.code).toBe("TIMEOUT");
    });
  });

  describe("contract", () => {
    it("never rejects, whatever happens", async () => {
      stubFetchRejecting(new Error("something entirely unexpected"));

      await expect(
        createOpenWeatherProvider(API_KEY)("Dhaka", signal),
      ).resolves.toHaveProperty("status", "error");
    });

    it("rejects a blank city without making a request", async () => {
      stubFetch({ json: async () => VALID_PAYLOAD });

      const result = await createOpenWeatherProvider(API_KEY)("   ", signal);

      expect(result.status === "error" && result.error.code).toBe("INVALID_INPUT");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("never leaks the API key into an error message", async () => {
      // Error messages are rendered verbatim in the UI, so a key echoed into one
      // would end up on screen and in any screenshot of it.
      stubFetch({ ok: false, status: 401 });

      const result = await createOpenWeatherProvider(API_KEY)("Dhaka", signal);

      expect(result.status === "error" && result.error.message).not.toContain(API_KEY);
    });
  });
});
