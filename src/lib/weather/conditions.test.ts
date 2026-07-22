import { describe, expect, it } from "vitest";

import {
  CONDITION_GROUP_ORDER,
  CONDITION_STYLES,
  conditionStyle,
  toConditionGroup,
} from "./conditions";

describe("toConditionGroup", () => {
  it("maps the primary conditions to their own group", () => {
    expect(toConditionGroup("Clear")).toBe("Clear");
    expect(toConditionGroup("Clouds")).toBe("Clouds");
    expect(toConditionGroup("Rain")).toBe("Rain");
    expect(toConditionGroup("Drizzle")).toBe("Drizzle");
    expect(toConditionGroup("Thunderstorm")).toBe("Thunderstorm");
    expect(toConditionGroup("Snow")).toBe("Snow");
  });

  it("collapses the atmospheric conditions into one visual family", () => {
    // These are six distinct values upstream but read as the same thing to a
    // user, and giving each its own icon would dilute the visual language.
    for (const raw of ["Mist", "Smoke", "Haze", "Dust", "Fog", "Sand", "Ash"]) {
      expect(toConditionGroup(raw)).toBe("Mist");
    }
  });

  it("treats squalls and tornadoes as severe weather, not haze", () => {
    // Rendering a tornado in neutral grey would understate it.
    expect(toConditionGroup("Squall")).toBe("Thunderstorm");
    expect(toConditionGroup("Tornado")).toBe("Thunderstorm");
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(toConditionGroup("  rAiN ")).toBe("Rain");
  });

  it("degrades an unrecognised condition to Unknown rather than throwing", () => {
    // An unexpected value from upstream should cost one card its icon, not take
    // down the render.
    expect(toConditionGroup("Meteor Shower")).toBe("Unknown");
    expect(toConditionGroup("")).toBe("Unknown");
  });
});

describe("condition styles", () => {
  it("defines a complete style for every group", () => {
    // Guards the invariant the whole visual language depends on: no group can
    // exist without an icon, a label and a colour.
    for (const group of CONDITION_GROUP_ORDER) {
      const style = conditionStyle(group);

      expect(style.group).toBe(group);
      expect(style.label).not.toBe("");
      expect(style.icon).not.toBe("");
      expect(style.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(style.tint).toMatch(/^rgba\(/);
    }
  });

  it("lists every defined group in the display order", () => {
    expect([...CONDITION_GROUP_ORDER].sort()).toEqual(
      Object.keys(CONDITION_STYLES).sort(),
    );
  });

  it("gives each group a distinct colour so the grid stays readable", () => {
    const colors = CONDITION_GROUP_ORDER.map((g) => conditionStyle(g).color);

    expect(new Set(colors).size).toBe(colors.length);
  });
});
