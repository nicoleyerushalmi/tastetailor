# TasteTailor — Presentation Outline

Status: course deliverable, 10–15 minutes. Built from what's actually implemented and tested (`docs/TESTING.md`), not aspirational scope.

---

## 1. Agenda (timing is a guide, adjust live)

| Segment | Time |
|---|---|
| Problem & solution | 1.5 min |
| Architecture walkthrough | 3 min |
| Live demo | 6 min |
| Testing & security evidence | 2 min |
| Known limitations & roadmap | 1.5 min |
| Q&A | remainder |

## 2. Problem & solution (1.5 min)

- **Problem**: cooking around dietary restrictions means either giving up a recipe you like, or guessing at substitutions with no idea how they'll actually turn out — and building a shopping list from multiple recipes means manually deduplicating ingredients yourself.
- **Solution**: TasteTailor takes a recipe you already have (pasted as-is) or just a dish name, and an AI rewrites it to fit your saved dietary profile — explaining every substitution it makes, not just applying them silently — then merges it straight into a shared shopping list.
- **Who it's for**: people with dietary restrictions or fitness goals, and people who like following a specific creator/chef's style but need it adapted to how they eat.

## 3. Architecture walkthrough (3 min)

Bullets to hit, backed by `ARCHITECTURE.md`/`TECHNICAL_DESIGN.md`:

- **Stack**: Next.js 16 (App Router) + TypeScript, Supabase (Auth + Postgres + Row Level Security), deployed on Vercel.
- **AI provider**: Google Gemini (not the originally-planned OpenAI — a real mid-build pivot, worth mentioning honestly rather than glossing over). A `mock` provider exists too, so the entire test suite runs deterministically without ever calling a real model.
- **The generation pipeline**: validate the request (Zod) → check the daily rate limit via an atomic Postgres RPC → build a system-guarded prompt from the user's profile → call Gemini (with retry/backoff and an optional fallback model if the primary is overloaded) → validate the AI's JSON output before trusting it → save the recipe → best-effort attach an Unsplash photo.
- **Data isolation**: every table has Row Level Security scoped to `auth.uid()` — proven, not just declared, by an automated two-user Playwright suite that asserts one account genuinely cannot read, edit, or delete another's data.
- **Two AI-backed endpoints, not one**: `/api/generate` (new recipe) and `/api/recipes/[id]/refine` (a chat-style follow-up that edits an existing recipe in place, e.g. "make it dairy-free") — both share the same validate → call → classify pipeline.

## 4. Live demo script (6 min)

Run this against a real (not mock) environment if Gemini quota allows; fall back to the mock provider if not — either demonstrates the same flow.

1. **Sign up** a fresh account → land on onboarding.
2. **Onboarding**: set a diet type + an allergy → save → land on `/generate`.
3. **Generate — adapt mode**: paste a simple recipe (title + ingredients + steps as one block) and name a known creator in the style field → submit → point out the "Tips" panel and the generating overlay while it's in flight.
4. **Recipe detail**: show the Insights box explaining a substitution, and — if a persona fallback occurred — the "couldn't find that creator's version, here's a profile-based recipe instead" banner with its "Try again" retry.
5. **Scale servings** with +/− and show ingredient quantities updating live, client-side, with no page reload.
6. **Add to shopping list**, then generate a second recipe (from-scratch mode, a different dish) that shares an ingredient with the first, and add it to the list too — show the two recipes' matching ingredient **merging into one line** on `/shopping-list`, and a different-unit ingredient staying as a **separate line** (the explicit, tested MVP boundary — no unit conversion).
7. **Refine**: on a recipe, type a follow-up like "make it spicier" in the refine chat and show the recipe update in place with the chat history preserved.
8. **Favorite** the recipe, then show it filtered into `/favorites`.
9. **Cook mode**: open it, check off an ingredient and a step, show the print-friendly layout, close it.
10. **Export**: copy the shopping list to clipboard and paste the result to show the plain-text "To buy" / "Already have" format.
11. **Privilege proof (optional, if time)**: log in as a second seeded test account and show it cannot see the first account's history at all — ties directly to the RLS claim in §3.

## 5. Testing & security evidence (2 min)

- Full automated suite: **18 Vitest files + 8 Playwright specs**, covering unit logic, both API routes (mock AI), full auth/onboarding gates, cross-user privilege isolation, DB constraints, XSS/untrusted-content handling, and burst/rate-limit behavior under real concurrency.
- Two things worth naming specifically because they show real engineering rigor, not just "tests exist": a test asserting two simultaneous generate requests against one remaining rate-limit slot resolve to exactly one success and one rejection (a genuine concurrency proof, not a sequential mock), and a client-bundle scan that fails the build if a secret API key ever ends up in code the browser can download.
- Point to `docs/SECURITY.md` and `docs/SCALE.md` for the full write-ups rather than reading them aloud.

## 6. Known limitations & roadmap (1.5 min)

Be upfront — a professor will respect disclosed limitations far more than a claim of "no known issues":

- **No automatic unit conversion** (e.g. cups ↔ grams) — an explicit, tested MVP boundary, not a bug; different units for the same ingredient stay as separate shopping-list lines. Planned for a future version.
- **No categorized/browsable creator directory** — persona/style input is free-text with autocomplete + a handful of quick-fill shortcuts today; a curated categorized browsing UI is future scope.
- **Gemini is a shared external dependency** with its own rate limits — the app's retry/fallback logic makes individual requests resilient to transient overload, but a real production deployment at scale would need a higher-throughput plan or per-tenant API keys (see `docs/SCALE.md` §8).
- **Production deploy is pending dashboard access** (Vercel + Supabase project settings), not a code gap — see `docs/IMPLEMENTATION_PLAN.md` for the exact remaining steps.

## 7. Anticipated Q&A

Prep answers, don't read them verbatim:

- **"Why Gemini and not OpenAI, if the original plan said OpenAI?"** — a real build-time decision; the provider layer is abstracted (`lib/ai/provider.ts`) specifically so swapping providers doesn't touch the rest of the app, and the docs were updated after the fact to reflect what actually shipped rather than leaving stale claims in place.
- **"How do you know users can't see each other's data, not just that you wrote a policy saying so?"** — point to the two-user Playwright suite (§3/§5) that actually logs in as two different accounts and asserts the isolation holds, rather than trusting the RLS policy declaration alone.
- **"What happens if Gemini is down or slow?"** — walk through the retry/timeout/fallback-model behavior in `docs/SCALE.md` §7, and the user-facing "taking longer than usual" messaging rather than a silent hang.
- **"Why doesn't the shopping list convert units?"** — a deliberate, disclosed MVP scope cut (§6), not an oversight — merging identical name+unit pairs was implemented and tested; conversion is a known future enhancement.
- **"What would you change first at real scale?"** — the synchronous AI-call-inside-the-request pattern (`docs/SCALE.md` §7–8) is the first thing to move off the request/response cycle if usage grew significantly.
