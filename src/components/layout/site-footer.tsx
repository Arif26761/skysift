// lucide-react v1 removed third-party brand marks, so the source link uses the
// generic code glyph rather than pulling in a second icon package for one logo.
import { CodeXml } from "lucide-react";

/**
 * The page's terminal zone, as frosted glass.
 *
 * With only a border-top the footer read as "page, plus a line": the graticule
 * ran straight through it at full strength and it never resolved as a place the
 * document ends.
 *
 * An opaque surface would have fixed that by cutting the paper off square —
 * which throws away the thing that makes the background worth having. Glass
 * solves it the other way: `backdrop-blur` softens the ruling *behind* the
 * footer rather than hiding it, so the grid stays continuous while the footer
 * lifts off it. Translucency is what sells the effect, so the fill is
 * deliberately partial — at full opacity there is nothing left to blur and the
 * filter becomes a no-op.
 *
 * Matches the header's treatment, so the document is bracketed by two panes of
 * the same material.
 */
export function SiteFooter() {
  return (
    <footer className="border-line bg-surface/60 mt-auto border-t backdrop-blur-xl">
      <div className="text-subtle mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          Built by{" "}
          <a
            href="https://arif26761.github.io"
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted hover:text-primary underline underline-offset-2 transition-colors"
          >
            MD. Arif Rahman
          </a>{" "}
          · Weather data from OpenWeatherMap
        </p>

        <a
          href="https://github.com/Arif26761/skysift"
          target="_blank"
          rel="noreferrer noopener"
          className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
        >
          <CodeXml className="h-3.5 w-3.5" aria-hidden="true" />
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
