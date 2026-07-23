import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { themeInitScript } from "@/components/theme/theme-script";

import "./globals.css";

/*
 * Three faces, each with one job.
 *
 * Loaded through next/font, which self-hosts them at build time: no runtime
 * request to fonts.googleapis.com, no third-party connection on the critical
 * path, and no flash of unstyled text. `display: swap` keeps text readable while
 * the file arrives.
 */

/** Display: geometric and slightly technical. Headings and the wordmark only. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** UI: the most legible thing available at 12–14px, which is most of this app. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Numerals: every temperature, humidity and wind reading.
 * Chosen for its tabular figures — see `.sky-numeric` in globals.css.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SkySift — weather data, filtered",
    template: "%s · SkySift",
  },
  description:
    "Fetch current weather for any list of cities, then filter by country, temperature, condition and humidity — and see exactly what each filter removed.",
  authors: [{ name: "MD. Arif Rahman", url: "https://arif26761.github.io" }],
  openGraph: {
    title: "SkySift — weather data, filtered",
    description:
      "A weather data service with a filtering instrument on top. Shows you what each filter removed.",
    type: "website",
  },
};

export const viewport: Viewport = {
  /*
   * The theme colour follows the active palette, so mobile browser chrome
   * matches the page instead of framing a dark UI in a white bar.
   *
   * These must stay in step with `--background` in globals.css by hand — a meta
   * tag cannot read a CSS custom property. They had drifted: both values were
   * still the blue-tinted ones from the original design baseline, two palettes
   * ago, so a phone drew a pale blue bar above a warm-neutral page.
   */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b08" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      /*
       * The inline script below mutates <html>'s class list before React
       * hydrates, so server and client markup are expected to differ on this one
       * element. Suppressing here is precise — it does not extend to any child.
       */
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        {/* Blocking on purpose: it must run before first paint to avoid the
            dark-mode white flash. See theme-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>

      <body className="sky-ambient flex min-h-full flex-col antialiased">
        {/*
         * Skip link. The filter panel sits between the header and the results,
         * so a keyboard user would otherwise tab through every control before
         * reaching the data. Visible only when focused.
         */}
        <a
          href="#results"
          className="bg-primary text-primary-fg sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to results
        </a>

        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
