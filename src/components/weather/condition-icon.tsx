import {
  CircleHelp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { conditionStyle } from "@/lib/weather/conditions";
import type { ConditionIconName } from "@/lib/weather/conditions";
import type { ConditionGroup } from "@/lib/weather/types";

/**
 * The bridge between the renderer-agnostic core and lucide-react.
 *
 * `conditions.ts` deliberately stores an icon *name* rather than a component, so
 * the core carries no React dependency and stays testable in plain Node. This
 * module is the one place that resolves those names to glyphs — a lookup table,
 * not a decision, since the decision was already made in the core.
 */
const ICONS: Record<ConditionIconName, LucideIcon> = {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  CircleHelp,
};

interface ConditionIconProps {
  readonly group: ConditionGroup;
  readonly className?: string;
}

/**
 * Renders the icon for a condition, tinted with that condition's hue.
 *
 * Always `aria-hidden`. The icon is one of three redundant encodings of the same
 * fact — colour, glyph and text label — and only the text label should be
 * announced. A screen reader hearing "cloud rain icon, Rain" is being told the
 * same thing twice.
 */
export function ConditionIcon({ group, className }: ConditionIconProps) {
  const style = conditionStyle(group);
  const Icon = ICONS[style.icon];

  return <Icon className={className} style={{ color: style.color }} aria-hidden="true" />;
}
