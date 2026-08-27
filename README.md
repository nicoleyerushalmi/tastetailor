# TasteTailor

AI-powered personalized recipe web app (Next.js + TypeScript + Supabase + Vercel).

Product and technical docs live in [`docs/`](./docs/).

## Local setup

```bash
npm install
copy .env.local.example .env.local
```

Fill in the Supabase keys (Project Settings → API). Leave `AI_PROVIDER=mock` until you have a Gemini API key — the mock provider returns a structured recipe without calling any AI service.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public by design; RLS enforces access) |
| `AI_PROVIDER` | Yes | `mock` or `gemini` |
| `GEMINI_API_KEY` | Only if `AI_PROVIDER=gemini` | Server-only, never sent to the browser |
| `GEMINI_MODEL` | No | Defaults to `gemini-flash-latest`. Pinned versions like `gemini-2.5-flash` may 404 for newer API keys ("no longer available to new users") — the `-latest` alias tracks whatever Google currently recommends. |
| `GENERATIONS_PER_DAY` | No | Per-user daily generation cap, defaults to 20 |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit / API tests; uses mock AI) |
| `npm run test:e2e` | Playwright suite with `AI_PROVIDER=mock` (needs free port 3000) |
| `npm run test:client-secrets` | SEC-06: scan `.next/static` for leaked API keys (run `npm run build` first) |
| `npm run test:live` | Opt-in live Gemini (+ Unsplash) smoke — **not CI**; needs `GEMINI_API_KEY` |

### Live smoke (`npm run test:live`)

Runs FEAT-16 (Unsplash attach) and SEC-05 (jailbreak persona) against real Gemini. Config: `playwright.live.config.ts` (forces `AI_PROVIDER=gemini`).

1. Put `GEMINI_API_KEY` in `.env.local` (and `UNSPLASH_ACCESS_KEY` for FEAT-16).
2. Free port 3000 (or set `PW_REUSE_SERVER=1` only if a Gemini-backed `next dev` is already up).
3. Use the same E2E accounts as the mock suite (`E2E_EMAIL` / `E2E_PASSWORD`, defaults in `.env.local.example`).
4. Run: `npm run test:live`

Skipped automatically when `GEMINI_API_KEY` is missing; FEAT-16 alone skips when Unsplash is unset. See [docs/TESTING.md](./docs/TESTING.md) and [docs/TESTING_MANUAL.md](./docs/TESTING_MANUAL.md).

## Deploy

1. Push to GitHub, import the repo into [Vercel](https://vercel.com/new).
2. Set the environment variables above in the Vercel project settings.
3. In Supabase → Authentication → URL Configuration, add the deployed `*.vercel.app` URL to the redirect allow-list (otherwise login/signup redirects fail in production).
4. Smoke test the full flow — signup → onboarding → generate → recipe detail → shopping list — on the live URL.
