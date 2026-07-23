/** @vitest-environment happy-dom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildFilterLedger } from "@/lib/weather/filter-insights";
import { makeRecord } from "@/lib/weather/fixtures";

import { FilterFunnel } from "./filter-funnel";

const DATA = [
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
    city: "London",
    countryCode: "GB",
    temperature: 14,
    humidity: 71,
    condition: "Clouds",
  }),
];

function renderFunnel(
  filters: Parameters<typeof buildFilterLedger>[1],
  overrides: { onClear?: () => void; onReset?: () => void } = {},
) {
  const onClear = overrides.onClear ?? vi.fn();
  const onReset = overrides.onReset ?? vi.fn();

  render(
    <FilterFunnel
      ledger={buildFilterLedger(DATA, filters)}
      onClear={onClear}
      onReset={onReset}
    />,
  );

  return { onClear, onReset };
}

describe("FilterFunnel", () => {
  it("collapses to a single quiet line when nothing is filtered", () => {
    // An empty rail with one lonely endpoint would be chrome describing the
    // absence of an explanation — worse than saying nothing.
    renderFunnel({});

    expect(screen.getByText(/cities loaded/)).toHaveTextContent("3 cities loaded");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reset all/i }),
    ).not.toBeInTheDocument();
  });

  it("announces the outcome politely rather than making the whole rail live", () => {
    // A live region spanning every stage would re-read the entire pipeline on
    // each keystroke of a slider drag. This reads only the part that changed.
    renderFunnel({ country: "BD" });

    const announcement = screen.getByText(/of 3 cities shown/);
    expect(announcement).toHaveAttribute("aria-live", "polite");
    expect(announcement).toHaveTextContent("2 of 3 cities shown, 1 filters active");
  });

  it("draws both exact endpoints of the pipeline", () => {
    renderFunnel({ country: "BD" });

    expect(screen.getByText("loaded").parentElement).toHaveTextContent("3loaded");
    expect(screen.getByText("shown").parentElement).toHaveTextContent("2shown");
  });

  it("shows one stage per active filter, annotated with its exclusion count", () => {
    renderFunnel({ country: "BD" });

    expect(screen.getByText("Country · BD")).toBeInTheDocument();
    // Dropping the country filter would bring London back: exactly one record.
    expect(screen.getByText("−1")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("reports a filter that excludes nothing as −0 rather than hiding it", () => {
    // A filter doing nothing is still information: it tells the user not to
    // bother relaxing that one.
    renderFunnel({ minHumidity: 10 });

    expect(screen.getByText("Humidity ≥ 10%")).toBeInTheDocument();
    expect(screen.getByText("−0")).toBeInTheDocument();
  });

  it("labels each stage with the consequence of clearing it", () => {
    // The explanation and the fix are the same object, so the accessible name
    // has to carry the consequence, not just the filter's name.
    renderFunnel({ country: "BD" });

    expect(
      screen.getByRole("button", {
        name: "Clear Country · BD, currently hiding 1 city",
      }),
    ).toBeInTheDocument();
  });

  it("pluralises the consequence correctly", () => {
    renderFunnel({ country: "GB" });

    expect(
      screen.getByRole("button", {
        name: "Clear Country · GB, currently hiding 2 cities",
      }),
    ).toBeInTheDocument();
  });

  it("clears just that filter when a stage is activated", async () => {
    const user = userEvent.setup();
    const { onClear } = renderFunnel({ country: "BD", minHumidity: 70 });

    await user.click(
      screen.getByRole("button", { name: /^Clear Country · BD/ }),
    );

    expect(onClear).toHaveBeenCalledWith("country");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("resets everything when Reset all is used", async () => {
    const user = userEvent.setup();
    const { onReset } = renderFunnel({ country: "BD" });

    await user.click(screen.getByRole("button", { name: /reset all/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("collapses a temperature range into a single stage", () => {
    // The user dragged one control, so they see one stage — not a min and a max.
    renderFunnel({ minTemp: 20, maxTemp: 30 });

    expect(screen.getByText("Temp 20–30°")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("ignores sorting, which reorders results but never removes them", () => {
    renderFunnel({ sortBy: "temperature", order: "desc" });

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByText(/cities loaded/)).toBeInTheDocument();
  });

  it("is fully keyboard operable", async () => {
    const user = userEvent.setup();
    const { onClear } = renderFunnel({ country: "BD" });

    await user.tab();
    expect(screen.getByRole("button", { name: /^Clear Country · BD/ })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClear).toHaveBeenCalledWith("country");
  });

  it("scales blame bars against the worst offender, not against the total", () => {
    /*
     * Scaling against `total` would render a set of small-but-unequal
     * exclusions as a row of near-identical slivers — precisely when the
     * comparison matters most. The worst offender must reach full width.
     */
    const { container } = render(
      <FilterFunnel
        ledger={buildFilterLedger(DATA, { country: "BD", minHumidity: 80 })}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const bars = [...container.querySelectorAll<HTMLElement>("span[aria-hidden][style]")];
    const widths = bars.map((bar) => bar.style.width);

    expect(bars.length).toBeGreaterThan(0);
    expect(widths).toContain("100%");
  });
});
