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
| `npm test` | Vitest (unit tests) |

## Deploy

1. Push to GitHub, import the repo into [Vercel](https://vercel.com/new).
2. Set the environment variables above in the Vercel project settings.
3. In Supabase → Authentication → URL Configuration, add the deployed `*.vercel.app` URL to the redirect allow-list (otherwise login/signup redirects fail in production).
4. Smoke test the full flow — signup → onboarding → generate → recipe detail → shopping list — on the live URL.
