/**
 * WCAG contrast audit for the design tokens.
 *
 * The README claims AA contrast in both themes. This script is what makes that
 * a measured fact rather than a hopeful assertion — and it means a future
 * palette change cannot quietly break accessibility, because the numbers are
 * one command away:
 *
 *     npm run check:contrast
 *
 * Token values are parsed straight out of globals.css, so the audit can never
 * drift from what actually ships.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/** WCAG 2.1 minimums. Large text is >=18.66px bold or >=24px. */
const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;
/** Non-text UI (borders, focus rings, icon-only affordances) — WCAG 1.4.11. */
const AA_UI = 3.0;

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  const r = srgbToLinear(parseInt(full.slice(0, 2), 16));
  const g = srgbToLinear(parseInt(full.slice(2, 4), 16));
  const b = srgbToLinear(parseInt(full.slice(4, 6), 16));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Pull `--token: #hex;` pairs out of a CSS block.
 *
 * Reading the real stylesheet rather than duplicating the palette here is the
 * whole point: a hardcoded copy would pass this audit forever while the shipped
 * colours drifted away from it.
 */
function parseBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Could not find "${selector}" in globals.css`);

  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  const body = css.slice(open, close);

  const tokens = {};
  for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6});/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

/** [foreground token, background token, minimum ratio, description] */
const CHECKS = [
  ["text", "surface", AA_NORMAL, "body text on a card"],
  ["text", "background", AA_NORMAL, "body text on the page"],
  ["text-muted", "surface", AA_NORMAL, "secondary text on a card"],
  ["text-muted", "background", AA_NORMAL, "secondary text on the page"],
  ["text-subtle", "surface", AA_NORMAL, "captions and meta on a card"],
  ["text-subtle", "background", AA_NORMAL, "captions on the page"],
  ["primary", "surface", AA_NORMAL, "links and active labels"],
  ["primary", "background", AA_NORMAL, "links on the page"],
  ["danger", "surface", AA_NORMAL, "exclusion counts, error text"],
  ["warning", "surface", AA_NORMAL, "failed-city badge text"],
  ["success", "surface", AA_NORMAL, "success text"],
  ["accent", "surface", AA_LARGE, "accent, used at display sizes only"],
  ["primary-fg", "primary", AA_NORMAL, "label on a primary button"],
  ["ring", "background", AA_UI, "focus ring against the page"],
  ["ring", "surface", AA_UI, "focus ring against a card"],
  ["border-strong", "surface", AA_UI, "emphasised control borders"],
];

async function main() {
  const css = await readFile(path.resolve("src/app/globals.css"), "utf8");

  const themes = [
    { name: "light", tokens: parseBlock(css, ":root {") },
    { name: "dark", tokens: parseBlock(css, ".dark {") },
  ];

  let failures = 0;

  for (const theme of themes) {
    console.log(`\n  ${theme.name.toUpperCase()}`);
    console.log("  " + "─".repeat(74));

    for (const [fg, bg, min, description] of CHECKS) {
      const fgHex = theme.tokens[fg];
      const bgHex = theme.tokens[bg];

      if (fgHex === undefined || bgHex === undefined) {
        console.log(`  ?  ${fg} on ${bg} — token missing, skipped`);
        continue;
      }

      const ratio = contrast(fgHex, bgHex);
      const pass = ratio >= min;
      if (!pass) failures += 1;

      const label = `${fg} on ${bg}`.padEnd(30);
      const figure = `${ratio.toFixed(2)}:1`.padStart(8);
      console.log(
        `  ${pass ? "PASS" : "FAIL"}  ${label} ${figure}  (min ${min.toFixed(1)})  ${description}`,
      );
    }
  }

  console.log("");
  if (failures > 0) {
    console.error(`  ${failures} contrast check(s) below the WCAG AA threshold.`);
    process.exitCode = 1;
  } else {
    console.log("  All contrast checks meet WCAG AA.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
