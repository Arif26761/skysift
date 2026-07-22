/** @vitest-environment happy-dom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildFilterLedger } from "@/lib/weather/filter-insights";
import { makeRecord } from "@/lib/weather/fixtures";

import { FilterLedger } from "./filter-ledger";

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

describe("FilterLedger", () => {
  it("reports how much of the data is showing", () => {
    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, {})}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    // The count is announced politely, so a screen-reader user gets the same
    // signal a sighted user gets from watching the number change.
    const summary = screen.getByText(/Showing/);
    expect(summary).toHaveTextContent("Showing 3 of 3 cities");
    expect(summary).toHaveAttribute("aria-live", "polite");
  });

  it("shows one chip per active filter, annotated with its exclusion count", () => {
    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, { country: "BD" })}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Country · BD")).toBeInTheDocument();
    // Dropping the country filter would bring London back: exactly one record.
    expect(screen.getByText("−1")).toBeInTheDocument();
  });

  it("shows nothing excluded as −0 rather than hiding the chip", () => {
    // A filter that is currently doing nothing is still information: it tells
    // the user not to bother relaxing that one.
    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, { minHumidity: 10 })}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Humidity ≥ 10%")).toBeInTheDocument();
    expect(screen.getByText("−0")).toBeInTheDocument();
  });

  it("clears just that filter when a chip's dismiss button is used", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, { country: "BD", minHumidity: 70 })}
        onClear={onClear}
        onReset={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear filter: Country · BD" }));

    expect(onClear).toHaveBeenCalledWith("country");
  });

  it("collapses a temperature range into a single chip", () => {
    // The user dragged one control, so they see one chip — not a min and a max.
    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, { minTemp: 20, maxTemp: 30 })}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Temp 20–30°")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("offers no chips or reset when nothing is filtered", () => {
    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, {})}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reset all/i })).not.toBeInTheDocument();
  });

  it("ignores sorting, which reorders results but never removes them", () => {
    render(
      <FilterLedger
        ledger={buildFilterLedger(DATA, { sortBy: "temperature", order: "desc" })}
        onClear={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
