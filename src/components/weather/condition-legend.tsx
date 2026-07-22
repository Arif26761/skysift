import { CONDITION_GROUP_ORDER, conditionStyle } from "@/lib/weather/conditions";

import { ConditionIcon } from "./condition-icon";

/**
 * The key to the visual language.
 *
 * The brief asks for a consistent icon/colour system for weather conditions. A
 * legend is what turns a *system* into something a first-time, non-technical
 * user can actually read — without it they have to infer the mapping from the
 * cards, and inference is exactly the work good design removes.
 *
 * Every entry shows colour, icon and text label together. That redundancy is the
 * accessibility guarantee: the mapping survives colour-blindness (icon + text),
 * monochrome printing (icon + text), and screen readers (text).
 */
export function ConditionLegend() {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
      aria-label="Weather condition key"
    >
      {CONDITION_GROUP_ORDER.filter((group) => group !== "Unknown").map((group) => {
        const style = conditionStyle(group);

        return (
          <li
            key={group}
            className="border-line inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-xs"
            style={{ backgroundColor: style.tint }}
          >
            <ConditionIcon group={group} className="h-3.5 w-3.5" />
            <span className="text-muted font-medium">{style.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
