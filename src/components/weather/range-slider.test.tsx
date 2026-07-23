/** @vitest-environment happy-dom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RangeSlider } from "./range-slider";

const DOMAIN = { min: -30, max: 55 };

function setup(props: Partial<React.ComponentProps<typeof RangeSlider>> = {}): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();

  render(
    <RangeSlider
      label="Temperature"
      min={DOMAIN.min}
      max={DOMAIN.max}
      valueMin={undefined}
      valueMax={undefined}
      format={(value) => `${value}°`}
      onChange={onChange}
      {...props}
    />,
  );

  return { onChange };
}

const lower = () => screen.getByLabelText("Temperature, lower bound");
const upper = () => screen.getByLabelText("Temperature, upper bound");

describe("RangeSlider", () => {
  it("reads as unconstrained when neither bound is set", () => {
    setup();

    expect(screen.getByText("Any")).toBeInTheDocument();
    expect(lower()).toHaveAttribute("aria-valuetext", "No lower bound");
    expect(upper()).toHaveAttribute("aria-valuetext", "No upper bound");
  });

  it("parks unset bounds at the domain edges", () => {
    setup();

    expect(lower()).toHaveValue("-30");
    expect(upper()).toHaveValue("55");
  });

  it("emits a real number once a thumb leaves its edge", () => {
    const { onChange } = setup();

    fireEvent.change(lower(), { target: { value: "10" } });

    // The upper thumb is still parked, so it stays unconstrained.
    expect(onChange).toHaveBeenCalledWith({ min: 10, max: undefined });
  });

  it("emits undefined — not the edge number — when a thumb returns to its edge", () => {
    /*
     * The whole point of the control's contract. Emitting -30 here would leave a
     * permanently "active" temperature filter that excludes nothing, which is
     * exactly the phantom control the Filter Funnel exists to expose.
     */
    const { onChange } = setup({ valueMin: 10, valueMax: 40 });

    fireEvent.change(lower(), { target: { value: "-30" } });

    expect(onChange).toHaveBeenCalledWith({ min: undefined, max: 40 });
  });

  it("treats the upper edge as no upper bound", () => {
    const { onChange } = setup({ valueMin: 10, valueMax: 40 });

    fireEvent.change(upper(), { target: { value: "55" } });

    expect(onChange).toHaveBeenCalledWith({ min: 10, max: undefined });
  });

  it("stops the lower thumb from crossing the upper one", () => {
    // Letting them swap roles mid-drag silently inverts the handle the user
    // grabbed, which is a well-known way to make a range control feel broken.
    const { onChange } = setup({ valueMin: 10, valueMax: 20 });

    fireEvent.change(lower(), { target: { value: "45" } });

    expect(onChange).toHaveBeenCalledWith({ min: 20, max: 20 });
  });

  it("stops the upper thumb from crossing the lower one", () => {
    const { onChange } = setup({ valueMin: 10, valueMax: 20 });

    fireEvent.change(upper(), { target: { value: "-5" } });

    expect(onChange).toHaveBeenCalledWith({ min: 10, max: 10 });
  });

  it("shows the selected span once bounds are set", () => {
    setup({ valueMin: 10, valueMax: 40 });

    expect(screen.getByText("10° – 40°")).toBeInTheDocument();
    expect(lower()).toHaveAttribute("aria-valuetext", "10°");
    expect(upper()).toHaveAttribute("aria-valuetext", "40°");
  });

  it("draws a tick for every loaded record", () => {
    const { container } = render(
      <RangeSlider
        label="Temperature"
        min={DOMAIN.min}
        max={DOMAIN.max}
        valueMin={undefined}
        valueMax={undefined}
        marks={[0, 15, 32]}
        format={(value) => `${value}°`}
        onChange={vi.fn()}
      />,
    );

    // Ticks are the only aria-hidden spans carrying a left offset.
    const ticks = container.querySelectorAll('span[aria-hidden="true"]');
    expect(ticks).toHaveLength(3);
  });

  it("exposes both thumbs as real range inputs for keyboard users", () => {
    // Built from two native <input type="range"> precisely so arrow keys,
    // Home/End and PageUp/PageDown work without being reimplemented.
    setup();

    expect(lower()).toHaveAttribute("type", "range");
    expect(upper()).toHaveAttribute("type", "range");
  });
});
