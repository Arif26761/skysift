"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { conditionStyle } from "@/lib/weather/conditions";
import type { SortField, SortOrder, WeatherRecord } from "@/lib/weather/types";

import { ConditionIcon } from "./condition-icon";

interface WeatherTableProps {
  readonly records: readonly WeatherRecord[];
  readonly sortBy: SortField | undefined;
  readonly order: SortOrder;
  readonly onSort: (field: SortField) => void;
}

const COLUMNS: readonly { field: SortField; label: string; numeric: boolean }[] = [
  { field: "city", label: "City", numeric: false },
  { field: "country", label: "Country", numeric: false },
  { field: "temperature", label: "Temp", numeric: true },
  { field: "humidity", label: "Humidity", numeric: true },
  { field: "windSpeed", label: "Wind", numeric: true },
];

/**
 * The dense view, for comparing many cities at once.
 *
 * The column headers are not a second sorting mechanism — they write to the
 * *same* `{ sortBy, order }` state as the filter panel's sort selector. Change
 * one and the other updates. That is the visible proof that filter state is
 * genuinely centralised rather than duplicated per view, which is the reason
 * both views exist at all: the brief allows a card grid *or* a table, so
 * shipping both only means something if they share a single source of truth.
 *
 * `aria-sort` on the active header is what makes that state available to a
 * screen reader, which otherwise has no way to know the table is ordered.
 */
export function WeatherTable({ records, sortBy, order, onSort }: WeatherTableProps) {
  return (
    // The wrapper scrolls, not the page. A table that forces the whole document
    // sideways at 375px is the classic responsive-table failure.
    <div className="border-line bg-surface shadow-card overflow-x-auto rounded-[14px] border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">
          Current weather for the selected cities. Column headers sort the table.
        </caption>

        <thead>
          <tr className="border-line border-b">
            <th scope="col" className="w-1" />
            {COLUMNS.map((column) => {
              const active = sortBy === column.field;

              return (
                <th
                  key={column.field}
                  scope="col"
                  aria-sort={
                    active ? (order === "asc" ? "ascending" : "descending") : "none"
                  }
                  className={`p-0 ${column.numeric ? "text-right" : "text-left"}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.field)}
                    className={`hover:bg-surface-2 inline-flex w-full items-center gap-1 px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
                      column.numeric ? "justify-end" : "justify-start"
                    } ${active ? "text-primary" : "text-subtle"}`}
                  >
                    {column.label}
                    {active ? (
                      order === "asc" ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      )
                    ) : (
                      // A permanent affordance on every column, so it is
                      // discoverable that the table sorts at all.
                      <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                    )}
                  </button>
                </th>
              );
            })}
            <th
              scope="col"
              className="text-subtle px-3 py-2.5 text-left text-xs font-semibold tracking-wide uppercase"
            >
              Condition
            </th>
          </tr>
        </thead>

        <tbody>
          {records.map((record) => {
            const style = conditionStyle(record.conditionGroup);

            return (
              <tr
                key={record.city}
                className="border-line hover:bg-surface-2 border-b transition-colors last:border-b-0"
              >
                {/* The same condition rail as the cards, so the visual language
                    carries across both views. */}
                <td className="p-0">
                  <span
                    className="block h-full min-h-[2.75rem] w-1"
                    style={{ backgroundColor: style.color }}
                    aria-hidden="true"
                  />
                </td>

                <th scope="row" className="text-text px-3 py-2.5 text-left font-medium">
                  {record.city}
                </th>
                <td className="text-muted sky-numeric px-3 py-2.5">
                  {record.countryCode}
                </td>
                <td className="text-text sky-numeric px-3 py-2.5 text-right font-semibold">
                  {record.temperature.toFixed(1)}°
                </td>
                <td className="text-muted sky-numeric px-3 py-2.5 text-right">
                  {record.humidity}%
                </td>
                <td className="text-muted sky-numeric px-3 py-2.5 text-right">
                  {record.windSpeed.toFixed(1)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <ConditionIcon
                      group={record.conditionGroup}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted text-xs">{style.label}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
