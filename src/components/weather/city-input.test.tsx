/**
 * @vitest-environment happy-dom
 *
 * Opting into a DOM per file rather than globally: the functional core is the
 * bulk of the suite and has no business paying for one.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CityInput } from "./city-input";

describe("CityInput", () => {
  it("commits a city when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={["Dhaka"]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Cities"), "London{Enter}");

    expect(onChange).toHaveBeenCalledWith(["Dhaka", "London"]);
  });

  it("commits on a comma, since that is how people type lists", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Cities"), "Tokyo,");

    expect(onChange).toHaveBeenCalledWith(["Tokyo"]);
  });

  it("collapses internal whitespace so 'New   York' is not a distinct city", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Cities"), "  New   York  {Enter}");

    expect(onChange).toHaveBeenCalledWith(["New York"]);
  });

  it("refuses a duplicate and explains why rather than silently ignoring it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={["London"]} onChange={onChange} />);

    // Case-insensitive: "london" is the same city as "London".
    await user.type(screen.getByLabelText("Cities"), "london{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/already in the list/i)).toBeInTheDocument();
  });

  it("removes the last chip on Backspace when the field is empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={["Dhaka", "London"]} onChange={onChange} />);

    await user.click(screen.getByLabelText("Cities"));
    await user.keyboard("{Backspace}");

    expect(onChange).toHaveBeenCalledWith(["Dhaka"]);
  });

  it("does not eat a chip when Backspace is editing text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={["Dhaka"]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Cities"), "Lo{Backspace}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("gives each remove button a distinct accessible name", () => {
    render(<CityInput cities={["Dhaka", "London"]} onChange={vi.fn()} />);

    // "Remove" alone would give a screen-reader user a list of identical
    // buttons with no way to tell which chip each one belongs to.
    expect(screen.getByRole("button", { name: "Remove Dhaka" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove London" })).toBeInTheDocument();
  });

  it("removes a city when its chip button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityInput cities={["Dhaka", "London"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove Dhaka" }));

    expect(onChange).toHaveBeenCalledWith(["London"]);
  });
});
