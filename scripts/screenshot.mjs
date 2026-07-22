/**
 * Capture the screenshots used in the README.
 *
 * The assessment requires screenshots of the UI, and hand-cropped ones drift out
 * of date the moment the design changes. Scripting them makes them reproducible,
 * consistently sized and cheap to regenerate:
 *
 *     npm run build && npm run start   # in one terminal
 *     npm run screenshots              # in another
 *
 * Each "scene" drives the app into a specific state before shooting, so the
 * README can show the states the brief actually asks about — loading, empty,
 * inline errors — rather than four pictures of the happy path.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

const BASE_URL = process.env.SCREENSHOT_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("docs/screenshots");

const DESKTOP = { width: 1440, height: 1100 };
/** The mobile floor the brief names explicitly. */
const MOBILE = { width: 375, height: 820 };

/**
 * @typedef {object} Scene
 * @property {string} name
 * @property {{width:number,height:number}} viewport
 * @property {"light"|"dark"} theme
 * @property {boolean} [fullPage]
 * @property {(page: import("playwright").Page) => Promise<void>} [prepare] runs before navigation
 * @property {(page: import("playwright").Page) => Promise<void>} [act] runs after load
 */

/** @type {Scene[]} */
const SCENES = [
  { name: "overview-light", viewport: DESKTOP, theme: "light", fullPage: true },
  { name: "overview-dark", viewport: DESKTOP, theme: "dark", fullPage: true },

  {
    // The signature feature: chips annotated with what each filter excluded.
    name: "ledger-light",
    viewport: DESKTOP,
    theme: "light",
    async act(page) {
      await page.selectOption("#filter-condition", "Clouds");
      await page.fill("#filter-humidity", "60");
      await page.selectOption("#filter-sort", "temperature");
    },
  },

  {
    // Empty results, showing the culprit callout rather than a dead end.
    name: "empty-dark",
    viewport: DESKTOP,
    theme: "dark",
    async act(page) {
      await page.fill("#filter-min-temp", "45");
    },
  },

  {
    // The dense view, with its headers wired to the same sort state.
    name: "table-dark",
    viewport: DESKTOP,
    theme: "dark",
    async act(page) {
      await page.click('button[aria-label="Table view"]');
      await page.selectOption("#filter-sort", "temperature");
      await page.click('button[aria-label="Descending"]');
    },
  },

  {
    // Partial failure: a city that does not exist, rendered inline beside the
    // ones that resolved. This is the Part 3 requirement made visible.
    name: "errors-light",
    viewport: DESKTOP,
    theme: "light",
    async act(page) {
      await page.fill("#city-input", "Nowhereville");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    },
  },

  {
    // Skeletons. The API is stalled so the loading state is actually catchable —
    // it would otherwise be gone in a few hundred milliseconds.
    name: "loading-light",
    viewport: DESKTOP,
    theme: "light",
    async prepare(page) {
      await page.route("**/api/weather", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        await route.continue();
      });
    },
    async act(page) {
      // Shoot mid-flight rather than waiting for the response.
      await page.waitForTimeout(600);
    },
  },

  { name: "mobile-light", viewport: MOBILE, theme: "light" },
  { name: "mobile-dark", viewport: MOBILE, theme: "dark" },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const scene of SCENES) {
      const context = await browser.newContext({
        viewport: scene.viewport,
        deviceScaleFactor: 2, // Retina density, so text stays crisp in the README.
        colorScheme: scene.theme,
        // Screenshots must never capture a mid-animation frame.
        reducedMotion: "reduce",
      });

      const page = await context.newPage();
      if (scene.prepare) await scene.prepare(page);

      // "load" rather than "networkidle": the loading scene deliberately stalls
      // a request, so networkidle would never resolve for it.
      await page.goto(BASE_URL, { waitUntil: "load" });

      // Fonts load asynchronously; shooting early captures a fallback-face
      // render that misrepresents the design.
      await page.evaluate(() => document.fonts.ready);

      if (scene.act) {
        await scene.act(page);
      } else {
        await page.waitForTimeout(900);
      }

      await page.waitForTimeout(400);

      const file = path.join(OUT_DIR, `${scene.name}.png`);
      await page.screenshot({ path: file, fullPage: scene.fullPage === true });
      console.log(`captured ${path.relative(process.cwd(), file)}`);

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
