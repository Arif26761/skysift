/**
 * The single source of truth for how a weather condition looks.
 *
 * The brief requires "a consistent visual language for weather conditions
 * (e.g. icons or color coding) — don't just dump raw text". Consistency is only
 * achievable if there is exactly one place that decides it. The card grid, the
 * table, the condition dropdown and the legend all read from this map, so they
 * are incapable of disagreeing with each other.
 *
 * Note that this module stores an icon *name*, not an icon component. That keeps
 * the functional core free of any React or lucide-react import; a thin UI-layer
 * component resolves the name to a glyph. The core stays renderer-agnostic and
 * unit-testable in plain Node.
 */

import type { ConditionGroup } from "./types";

export type ConditionIconName =
  | "Sun"
  | "Cloud"
  | "CloudRain"
  | "CloudDrizzle"
  | "CloudLightning"
  | "Snowflake"
  | "CloudFog"
  | "CircleHelp";

export interface ConditionStyle {
  readonly group: ConditionGroup;
  /** Short label. Always rendered alongside the icon — never colour alone. */
  readonly label: string;
  /** Base hue for the condition rail, icon and chip border. */
  readonly color: string;
  /** Same hue at low alpha, for chip and rail backgrounds in both themes. */
  readonly tint: string;
  readonly icon: ConditionIconName;
}

/**
 * Palette rationale: each hue is the one a person would intuitively reach for
 * (amber sun, grey cloud, blue rain), pulled toward the project's blue/cyan
 * brand family so the grid reads as one system rather than a bag of stickers.
 * Every colour was checked for AA contrast against both theme surfaces when
 * used for text; where a hue is too light for body text it is used for the rail
 * and icon only, with the label inheriting normal text colour.
 */
export const CONDITION_STYLES: Readonly<Record<ConditionGroup, ConditionStyle>> = {
  Clear: {
    group: "Clear",
    label: "Clear",
    color: "#f59e0b",
    tint: "rgba(245, 158, 11, 0.14)",
    icon: "Sun",
  },
  Clouds: {
    group: "Clouds",
    label: "Cloudy",
    color: "#64748b",
    tint: "rgba(100, 116, 139, 0.16)",
    icon: "Cloud",
  },
  Rain: {
    group: "Rain",
    label: "Rain",
    color: "#1363df",
    tint: "rgba(19, 99, 223, 0.16)",
    icon: "CloudRain",
  },
  Drizzle: {
    group: "Drizzle",
    label: "Drizzle",
    color: "#38bdf8",
    tint: "rgba(56, 189, 248, 0.16)",
    icon: "CloudDrizzle",
  },
  Thunderstorm: {
    group: "Thunderstorm",
    label: "Storm",
    color: "#7c6bff",
    tint: "rgba(124, 107, 255, 0.16)",
    icon: "CloudLightning",
  },
  Snow: {
    group: "Snow",
    label: "Snow",
    color: "#22d3ee",
    tint: "rgba(34, 211, 238, 0.16)",
    icon: "Snowflake",
  },
  Mist: {
    group: "Mist",
    label: "Mist",
    color: "#94a3b8",
    tint: "rgba(148, 163, 184, 0.18)",
    icon: "CloudFog",
  },
  Unknown: {
    group: "Unknown",
    label: "Unknown",
    color: "#8b95a8",
    tint: "rgba(139, 149, 168, 0.16)",
    icon: "CircleHelp",
  },
};

/**
 * Provider condition label -> visual family.
 *
 * OpenWeatherMap's atmospheric conditions (Smoke, Haze, Dust, Sand, Ash, Fog,
 * Squall, Tornado) are separate `main` values but read as the same thing to a
 * user, so they collapse. Squall and Tornado map to Thunderstorm because that is
 * the severe-weather visual family; showing a tornado as neutral grey mist would
 * understate it.
 */
const GROUP_BY_CONDITION: Readonly<Record<string, ConditionGroup>> = {
  clear: "Clear",
  clouds: "Clouds",
  rain: "Rain",
  drizzle: "Drizzle",
  thunderstorm: "Thunderstorm",
  snow: "Snow",
  mist: "Mist",
  smoke: "Mist",
  haze: "Mist",
  dust: "Mist",
  fog: "Mist",
  sand: "Mist",
  ash: "Mist",
  squall: "Thunderstorm",
  tornado: "Thunderstorm",
};

/**
 * Normalise any provider condition string into a known family.
 * Unrecognised input yields "Unknown" rather than throwing — an odd condition
 * from upstream should degrade one card's icon, not take down the page.
 */
export function toConditionGroup(condition: string): ConditionGroup {
  return GROUP_BY_CONDITION[condition.trim().toLowerCase()] ?? "Unknown";
}

/** Look up the visual style for a group. Total: every group has an entry. */
export function conditionStyle(group: ConditionGroup): ConditionStyle {
  return CONDITION_STYLES[group];
}

/** Order used by the legend and the condition dropdown. */
export const CONDITION_GROUP_ORDER: readonly ConditionGroup[] = [
  "Clear",
  "Clouds",
  "Rain",
  "Drizzle",
  "Thunderstorm",
  "Snow",
  "Mist",
  "Unknown",
];
