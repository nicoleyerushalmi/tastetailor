# TasteTailor

AI-powered personalized recipe web app (Next.js + TypeScript + Supabase + Vercel).

Product and technical docs live in [`docs/`](./docs/).

## Local setup

```bash
npm install
copy .env.local.example .env.local
```

Fill in Supabase keys when ready. Leave `AI_PROVIDER=mock` until you have an OpenAI key.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit tests) |
