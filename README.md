<div align="center">

# SkySift

**Sift the sky.** A weather data service with a filtering instrument on top.

Fetches current weather for any list of cities, then lets you slice that data by country,
temperature, condition and humidity — and *shows you what each filter removed*.

[![CI](https://github.com/Arif26761/skysift/actions/workflows/ci.yml/badge.svg)](https://github.com/Arif26761/skysift/actions/workflows/ci.yml)

</div>

---

> **Status:** in active development. Built as a take-home assessment for Cotton Group
> (Software Engineer). This README is updated as the build progresses — screenshots, the live
> demo link and full API docs land before submission.

## What this is

Most filter UIs have the same flaw: when you narrow the data and the list empties, you can't
tell *which control did it*. SkySift's signature feature is the **Filter Ledger** — a live bar
showing `Showing 4 of 9`, with one chip per active filter annotated with how many records
that specific filter excluded. When results hit zero, it names the cause and offers to relax
that one filter.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript 5 (`strict`, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| Validation | Zod (runtime parsing at the API boundary) |
| Testing | Vitest + Testing Library |
| Icons | lucide-react |
| Hosting | Vercel |

## Quick start

```bash
git clone https://github.com/Arif26761/skysift.git
cd skysift
npm install
cp .env.example .env.local   # optional — see below
npm run dev
```

Open <http://localhost:3000>.

### API key (optional)

SkySift runs **without an API key**. With none configured it starts in **Demo Mode**, serving
realistic fixture data behind a clearly-labelled banner. To use live data, put a free
[OpenWeatherMap](https://home.openweathermap.org/api_keys) key in `.env.local`:

```ini
OPENWEATHER_API_KEY=your_key_here
```

The key is read **only** in server-side code, so it never reaches the browser. This is the
main reason the project uses a Next.js Route Handler rather than calling OpenWeatherMap
directly from React.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Run the unit test suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Prettier write |

## License

MIT © MD. Arif Rahman
