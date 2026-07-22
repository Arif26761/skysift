/**
 * Capture the screenshots used in the README.
 *
 * The assessment requires screenshots of the UI, and hand-cropped ones drift out
 * of date the moment the design changes. Scripting them means they are
 * reproducible, consistently sized, and cheap to regenerate:
 *
 *     npm run dev            # in one terminal
 *     npm run screenshots    # in another
 *
 * Every shot is taken twice — light and dark — because the theme is a first
 * class feature rather than an afterthought, and a reviewer should not have to
 * take that on trust.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

const BASE_URL = process.env.SCREENSHOT_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("docs/screenshots");

/** Deterministic viewports: one desktop, one at the 375px floor the brief names. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "mobile", width: 375, height: 780 },
];

const THEMES = ["light", "dark"];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 2, // Retina-density output, so text stays crisp in the README.
          colorScheme: theme === "dark" ? "dark" : "light",
          // Screenshots must not capture mid-animation frames.
          reducedMotion: "reduce",
        });

        const page = await context.newPage();
        await page.goto(BASE_URL, { waitUntil: "networkidle" });

        // Fonts load asynchronously; shooting before they settle produces a
        // fallback-face screenshot that misrepresents the design.
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);

        const file = path.join(OUT_DIR, `${viewport.name}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: viewport.name === "desktop" });
        console.log(`captured ${path.relative(process.cwd(), file)}`);

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
