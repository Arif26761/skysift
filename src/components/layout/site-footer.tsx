// lucide-react v1 removed third-party brand marks, so the source link uses the
// generic code glyph rather than pulling in a second icon package for one logo.
import { CodeXml } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-line mt-auto border-t">
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
