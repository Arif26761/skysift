# Design system

The brief is explicit that it is **not** looking for a pixel-perfect Figma clone:

> _"We're looking for whether you can turn a data shape into something a
> non-technical user could actually operate."_

That reframes the whole exercise. **SkySift is not a weather app. It is a
filtering instrument that happens to contain weather.** A weather app's hero is a
big sun and a temperature. Ours is the filter → result feedback loop. Every
decision below serves one question: _can a non-technical person see what the
filters just did to the data?_

---

## 1. Colour: semantic tokens, never raw values

Components say `bg-surface`, `text-muted`, `border-line`. They never say
`bg-white` or `text-slate-500`. A component therefore describes its **role in the
hierarchy**, not its appearance — which is what lets one stylesheet repaint the
entire application.

| Token         | Light     | Dark      | Use                           |
| ------------- | --------- | --------- | ----------------------------- |
| `background`  | `#f7f5f0` | `#0d100f` | Page base                     |
| `surface`     | `#ffffff` | `#151917` | Cards, panels                 |
| `surface-2`   | `#f0ece2` | `#1d2320` | Elevated / hover              |
| `surface-3`   | `#e7e2d4` | `#262d29` | Pressed / shimmer             |
| `line`        | `#e5e0d3` | `#28302c` | Decorative hairlines          |
| `line-strong` | `#9e9375` | `#5f6d67` | Form-control borders (3:1)    |
| `text`        | `#1a1713` | `#ecefec` | Primary text                  |
| `muted`       | `#56514a` | `#a2aba6` | Secondary text                |
| `subtle`      | `#746d5b` | `#7d867f` | Captions, meta                |
| `primary`     | `#0f766e` | `#2dd4bf` | Brand, actions                |
| `accent`      | `#c2410c` | `#fb923c` | The one warm counterweight    |
| `ring`        | `#0f766e` | `#2dd4bf` | Focus outline                 |
| `danger`      | `#b42318` | `#fb8b7f` | Destructive, exclusion counts |
| `warning`     | `#a15c07` | `#f2b23c` | Failed-city rail              |

### Why chart paper, and why teal

**Light is warm off-white, not cool blue-white.** That is the graticule's natural
companion: synoptic charts and barograph traces are printed on warm paper and
ruled in fine ink. Adopting that base makes the grid read as _paper_ rather than
as a texture laid over a website — the decoration and the substrate become one
idea instead of two. Pure white cards then sit on it as clearly raised, without
needing heavy shadows.

**Dark is near-neutral graphite with the faintest green shift** — the same
instrument at night. Deliberately _not_ navy: a blue-cast dark would push the
entire page into the cold family that the condition language already owns, and
Rain would stop standing out.

**The primary is deep teal ink, and that is a functional constraint rather than a
taste call.** The condition language owns the whole cold-blue family — Rain is
blue, Drizzle is sky, Snow is pale ice. If the interface chrome were _also_ blue,
then every button, link, focus ring and active state would compete with the data
for the same meaning, and a blue chip would be genuinely ambiguous: is that a
filter control, or is it raining? Teal sits adjacent to the cold family without
belonging to it. **Chrome owns teal; data owns blue; nothing collides.**

### Contrast is measured, not asserted

```bash
npm run check:contrast
```

`scripts/check-contrast.mjs` parses the tokens **straight out of `globals.css`**
— so the audit cannot drift from what ships — and checks 16 foreground/background
pairs per theme against WCAG AA (4.5:1 text, 3:1 non-text UI).

It earned its place immediately. On the first run against this palette it failed
`border-strong on surface` at **1.95:1**, which turned out to be a real defect:
the filter panel's inputs sit on `surface` _with_ a `surface` background, so
their border is the only thing identifying them as controls — exactly the case
WCAG 1.4.11 requires 3:1 for. `line-strong` was darkened to `#9e9375` / `#5f6d67`
and the form controls switched onto it.

That is also why there are two border tokens: `line` stays feather-light for
decorative hairlines (card edges, dividers, which carry no information), while
`line-strong` carries the contrast obligation for anything that identifies a
control.

### Dark mode is a token swap, not a second design

`:root` and `.dark` assign different values to the **same variable names**, and
Tailwind v4's `@theme inline` keeps every generated utility resolving through
those variables at runtime.

The result: **component code contains essentially no `dark:` variants.** The
theme changes underneath it.

> **The `inline` keyword is load-bearing.** Without it Tailwind bakes the light
> values into the compiled CSS and the dark theme silently never applies. This is
> the subtlest trap in Tailwind v4's new theming model.

### Elevation differs by theme, because physics does

Light mode uses soft drop shadows. Dark mode uses an **inset top highlight**:

```css
--shadow-card:
  inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 24px -12px rgba(0, 0, 0, 0.7);
```

Darkening something already dark is nearly invisible. A hairline catch of light
on the raised edge is how the eye actually reads elevation in low light.

---

## 2. Weather condition language

The brief requires a consistent icon/colour system and explicitly rejects raw
text dumps. Consistency is only achievable if **one module decides it** — so the
card grid, the table, the filter dropdown and the legend all read from
`CONDITION_STYLES` and are incapable of disagreeing.

| Condition    | Colour    | Icon             |
| ------------ | --------- | ---------------- |
| Clear        | `#f59e0b` | `Sun`            |
| Clouds       | `#64748b` | `Cloud`          |
| Rain         | `#2563eb` | `CloudRain`      |
| Drizzle      | `#38bdf8` | `CloudDrizzle`   |
| Thunderstorm | `#7c6bff` | `CloudLightning` |
| Snow         | `#93c5fd` | `Snowflake`      |
| Mist         | `#94a3b8` | `CloudFog`       |
| _Unknown_    | `#8b95a8` | `CircleHelp`     |

The wet conditions are deliberately arranged as a **single cold ramp**, so the
grid reads as increasing coldness rather than three unrelated blues:

```
Rain #2563eb   →   Drizzle #38bdf8   →   Snow #93c5fd
 deep blue           sky                  pale ice
```

Snow moved off cyan for a concrete reason: cyan sat too close to the teal chrome
in dark mode, and _"is that snow, or is that a button?"_ is not a question a
legend should ever have to answer.

OpenWeatherMap reports ~15 `main` values. Mist / Smoke / Haze / Dust / Fog / Sand
/ Ash read identically to a user, so they collapse into one family — giving each
its own icon would dilute the language rather than enrich it. Squall and Tornado
map to Thunderstorm, because rendering a tornado in neutral grey would understate
it. An unrecognised value degrades to `Unknown` rather than crashing a render.

### Three redundant encodings, always

Every condition is shown as **colour + icon + text label**, together. This is not
indecision — it is how _"don't rely on colour alone"_ is actually met. The
mapping survives colour-blindness, greyscale printing, and screen readers.

The icon is always `aria-hidden`: colour, glyph and label state one fact, and a
screen reader hearing "cloud rain icon, Rain" is being told it twice.

---

## 3. Typography

| Role      | Family             | Why                                                                     |
| --------- | ------------------ | ----------------------------------------------------------------------- |
| Display   | **Space Grotesk**  | Geometric, faintly technical. Headings and wordmark only.               |
| Interface | **Inter**          | The most legible thing available at 12–14px, which is most of this app. |
| Numerals  | **JetBrains Mono** | Tabular figures.                                                        |

All self-hosted via `next/font` — no runtime request to `fonts.googleapis.com`,
no third-party connection on the critical path, no flash of unstyled text.

**The mono face is functional, not stylistic.** Proportional digits have
different widths, so a temperature ticking `9.9 → 10.1` makes the whole row
twitch and table columns fail to align. `.sky-numeric` pairs the mono family with
`font-variant-numeric: tabular-nums`, fixing both. If asked "why monospace?", the
answer is layout stability.

---

## 4. The one piece of decoration: the graticule

A ~5% opacity 32px rule behind the entire page, the way a meteorological chart or
a plotting sheet is ruled.

```css
.sky-grid {
  background-image:
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

It is the **only** decoration in the design, and it earns its place by supporting
the thesis: this is an instrument for reading data, not a consumer weather
widget. At that opacity it is felt rather than seen and never competes with
content.

---

## 5. Making filters legible

### The Filter Ledger

```
Showing 2 of 5   [Condition · Clouds −2 ×]  [Humidity ≥ 60% −0 ×]   Reset all
```

Each chip is annotated with what that filter removed. A chip reading `−0` is
doing nothing on its own — itself useful information, because it tells the user
not to bother touching that one.

On zero results the empty state names the cause instead of shrugging:

> **No cities match your filters**
> _Temp ≥ 45° is hiding the last 5 cities._
> **[ Relax Temp ≥ 45° ]**

### The thermal spectrum bar

A number in isolation is hard to judge — is 24°C warm for this set? A thin track
on each card places that city on the temperature span of the currently visible
results, turning nine unrelated figures into a distribution you can read at a
glance. `aria-hidden`, since it encodes nothing the reading above it does not
already state.

### Cards ⇄ table

The brief allows either. Shipping both is only meaningful because they share one
state: the table's column headers write to the **same** `{ sortBy, order }` as
the filter panel's sort selector. Change either, the other updates. That is
visible proof that filter state is centralised rather than duplicated per view.

---

## 6. States, designed deliberately

| State       | Design                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading** | Skeleton cards whose geometry _exactly_ matches `WeatherCard` — same padding, same rail, same block heights. Nothing moves when data lands. A spinner cannot do this. |
| **Empty**   | The culprit callout above, with a one-click relax. Never a bare "no results".                                                                                         |
| **Error**   | A failed city renders as a card **inside the results grid**, in the slot it would have occupied, with a hatched amber rail. A partial batch then reads as partial.    |
| **Demo**    | A banner stating plainly that the numbers are fixtures. Presenting invented data as real weather would be dishonest.                                                  |

The Retry button appears **only** when `error.retryable` is true. Offering retry
on a misspelt city name would be the UI lying.

---

## 7. Layout and responsiveness

- **Desktop:** sticky ~280px filter rail beside the results, so controls stay
  reachable while scrolling a long list.
- **Mobile (≤1024px):** the panel collapses into a native `<details>` disclosure
  with an "N active" badge. Native because it is keyboard operable, correctly
  announced, and needs no JavaScript — and collapsed because at 375px the
  **results**, not the controls, must own the screen.
- The table scrolls inside its own container. A table that forces the whole
  document sideways is the classic responsive-table failure.

---

## 8. Accessibility

Structural, not sprinkled on:

- **One global `:focus-visible` ring**, so no component _can_ forget one. Mouse
  users are not shown a ring they did not ask for.
- **A skip link to the results.** The filter panel sits between the header and
  the data, so without it a keyboard user tabs through every control first.
- **`prefers-reduced-motion` honoured globally.** Motion here is explanatory
  (cards travel to their new position on re-sort); when a user has asked for
  less, that explanation is not worth the cost.
- **`aria-live="polite"`** on the "Showing N of M" count — the equivalent, for a
  screen-reader user, of watching the number change while dragging a control.
  Polite, not assertive, so it waits for a pause instead of interrupting.
- **`aria-sort`** on the active table header, so the ordering is perceivable.
- **Per-item accessible names**: `Remove Dhaka`, not `Remove`. Otherwise a screen
  reader announces a list of identical buttons.
- **Native form controls** throughout, so type-ahead, escape handling and the
  mobile wheel picker all behave correctly without being reimplemented.
- **WCAG AA contrast** verified in both themes.
- **`color-scheme`** set per theme, so native scrollbars and form controls follow
  the palette.

---

## 9. Motion

Subtle and purposeful, never ornamental.

- **Shimmer** on skeletons, to signal work in progress.
- **A 260ms rise** as result cards enter, so a re-sort reads as movement rather
  than a jump cut.
- **Colour transitions** on hover and focus, at 150ms.

All of it disabled under `prefers-reduced-motion`.
