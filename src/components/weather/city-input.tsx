"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";

interface CityInputProps {
  readonly cities: readonly string[];
  readonly onChange: (cities: readonly string[]) => void;
}

/** Cap mirrors MAX_CITIES on the server, so the limit is felt before it is enforced. */
const MAX_CITIES = 25;

/**
 * Chip/tag entry for the city list.
 *
 * The chips are the app's primary input, so the interaction has to work the way
 * people already expect tag inputs to work — Enter or comma commits, Backspace
 * on an empty field removes the last one. Those two shortcuts are what separate
 * a tag input that feels native from one that feels like a form field with
 * decorations.
 *
 * Validation is inline and non-blocking: a duplicate or a blank is refused with
 * a short message rather than a thrown error or a silent no-op, because silently
 * ignoring input is the single most confusing thing a text field can do.
 */
export function CityInput({ cities, onChange }: CityInputProps) {
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const city = raw.trim().replace(/\s+/g, " ");

    if (city === "") return;

    if (cities.some((existing) => existing.toLowerCase() === city.toLowerCase())) {
      setNotice(`"${city}" is already in the list.`);
      setDraft("");
      return;
    }

    if (cities.length >= MAX_CITIES) {
      setNotice(`You can compare up to ${MAX_CITIES} cities at once.`);
      return;
    }

    setNotice(null);
    setDraft("");
    onChange([...cities, city]);
  }

  function remove(city: string) {
    setNotice(null);
    onChange(cities.filter((existing) => existing !== city));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter would submit a form and a comma would type a character; both are
      // the user saying "this one is done".
      event.preventDefault();
      commit(draft);
      return;
    }

    if (event.key === "Backspace" && draft === "" && cities.length > 0) {
      const last = cities[cities.length - 1];
      if (last !== undefined) remove(last);
    }
  }

  return (
    <div>
      <label
        htmlFor="city-input"
        className="text-subtle text-xs font-semibold tracking-wider uppercase"
      >
        Cities
      </label>

      <div
        className="border-line bg-surface shadow-card focus-within:border-primary mt-2 flex flex-wrap items-center gap-1.5 rounded-[14px] border p-2 transition-colors"
        // Clicking the padding around the chips should focus the field, the way
        // a real text input's whole box is a click target.
        onClick={() => inputRef.current?.focus()}
      >
        {cities.map((city) => (
          <span
            key={city}
            className="border-line bg-surface-2 text-text inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm"
          >
            {city}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(city);
              }}
              // Icon-only, so the city name has to be in the accessible name —
              // "Remove" alone would give a screen reader a list of identical buttons.
              aria-label={`Remove ${city}`}
              className="text-subtle hover:bg-surface-3 hover:text-danger inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        <input
          id="city-input"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          // Committing on blur means a half-typed city is not silently lost when
          // the user clicks straight into the filter panel.
          onBlur={() => commit(draft)}
          placeholder={
            cities.length === 0 ? "Add a city and press Enter" : "Add another…"
          }
          className="text-text placeholder:text-subtle min-w-[10rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none"
          aria-describedby="city-input-help"
          autoComplete="off"
          spellCheck={false}
        />

        <button
          type="button"
          onClick={() => commit(draft)}
          disabled={draft.trim() === ""}
          className="bg-primary text-primary-fg hover:bg-primary-hover inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add
        </button>
      </div>

      {/*
       * aria-live so the refusal is announced. A sighted user sees the message
       * appear; without this a screen-reader user would press Enter, hear
       * nothing, and have no idea why the chip was not added.
       */}
      <p
        id="city-input-help"
        className="text-subtle mt-1.5 min-h-[1.25rem] text-xs"
        aria-live="polite"
      >
        {notice ?? "Press Enter or comma to add. Backspace removes the last city."}
      </p>
    </div>
  );
}
