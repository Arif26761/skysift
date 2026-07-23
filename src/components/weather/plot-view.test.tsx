/** @vitest-environment happy-dom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { filterWeatherData } from "@/lib/weather/filter";
import { makeRecord } from "@/lib/weather/fixtures";

import { PlotView } from "./plot-view";

const DATA = [
  makeRecord({ city: "Dhaka", temperature: 32, humidity: 74, condition: "Rain" }),
  makeRecord({ city: "London", temperature: 14, humidity: 71, condition: "Clouds" }),
  makeRecord({ city: "Tokyo", temperature: 28, humidity: 45, condition: "Clear" }),
];

function circles(container: HTMLElement): SVGCircleElement[] {
  return [...container.querySelectorAll("circle")];
}

describe("PlotView", () => {
  it("renders nothing when no cities are loaded", () => {
    const { container } = render(<PlotView records={[]} visible={[]} />);

    expect(container.querySelector("svg")).toBeNull();
  });

  it("plots every loaded city, not just the matching ones", () => {
    // The excluded points are the entire reason this view exists.
    const visible = filterWeatherData(DATA, { minHumidity: 70 });
    const { container } = render(<PlotView records={DATA} visible={visible} />);

    const dots = circles(container);
    expect(dots).toHaveLength(3);
    expect(visible).toHaveLength(2);
  });

  it("labels excluded cities as well as matching ones", () => {
    /*
     * A city you cannot find is exactly the problem this view solves, so the
     * name has to survive being filtered out.
     */
    const visible = filterWeatherData(DATA, { minHumidity: 70 });
    render(<PlotView records={DATA} visible={visible} />);

    expect(screen.getByText("Dhaka")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
  });

  it("draws matching dots filled and excluded dots hollow", () => {
    const visible = filterWeatherData(DATA, { minHumidity: 70 });
    const { container } = render(<PlotView records={DATA} visible={visible} />);

    const hollow = circles(container).filter(
      (dot) => dot.getAttribute("fill") === "none",
    );

    // Tokyo at 45% humidity is the only one excluded by minHumidity: 70.
    expect(hollow).toHaveLength(1);
  });

  it("paints excluded dots before matching ones so they cannot occlude them", () => {
    // Painting order is the only z-index SVG has.
    const visible = filterWeatherData(DATA, { minHumidity: 70 });
    const { container } = render(<PlotView records={DATA} visible={visible} />);

    const fills = circles(container).map((dot) => dot.getAttribute("fill"));

    expect(fills[0]).toBe("none");
    expect(fills.slice(1).every((fill) => fill !== "none")).toBe(true);
  });

  it("survives a zero-width temperature domain", () => {
    /*
     * One city — or several at an identical temperature — gives rawMax - rawMin
     * of 0, and every x would divide by zero and render NaN coordinates.
     */
    const flat = [
      makeRecord({ city: "Dhaka", temperature: 30, humidity: 70 }),
      makeRecord({ city: "Chittagong", temperature: 30, humidity: 60 }),
    ];

    const { container } = render(<PlotView records={flat} visible={flat} />);

    for (const dot of circles(container)) {
      expect(Number(dot.getAttribute("cx"))).not.toBeNaN();
      expect(Number(dot.getAttribute("cy"))).not.toBeNaN();
    }
  });

  it("separates labels that would otherwise be printed on top of each other", () => {
    // Two cities at nearly the same point is the interesting case — a cluster —
    // and it is where a scatter stops being readable if labels collide.
    const clustered = [
      makeRecord({ city: "Dhaka", temperature: 30, humidity: 80 }),
      makeRecord({ city: "Chittagong", temperature: 30.2, humidity: 80 }),
    ];

    const { container } = render(<PlotView records={clustered} visible={clustered} />);

    const labelYs = [...container.querySelectorAll("text")]
      .filter((node) => /Dhaka|Chittagong/.test(node.textContent ?? ""))
      .map((node) => Number(node.getAttribute("y")));

    expect(labelYs).toHaveLength(2);
    expect(Math.abs(labelYs[0]! - labelYs[1]!)).toBeGreaterThan(10);
  });

  it("describes itself for screen readers and points at the text alternative", () => {
    const { container } = render(<PlotView records={DATA} visible={DATA} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("role", "img");
    expect(svg?.getAttribute("aria-label")).toMatch(/3 cities.*table view/i);
  });
});
