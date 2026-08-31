# Phase 9 plan — Tests, docs, presentation

Source: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Phase 9, [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) §15.

## Gate (required)

1. Draft **[TESTING.md](./TESTING.md)** — full test specification (categories below).
2. **You review and approve** that document (edit as needed).
3. **Only then** implement automated tests that map to the approved spec.
4. Write scale + security docs and presentation outline; mark Phase 9 complete in the implementation plan.

No automated test code until step 2 is done.

```text
Draft TESTING.md → You approve → Implement tests → SCALE / SECURITY / PRESENTATION
```

---

## Deliverables

| Deliverable | Path | Status |
| --- | --- | --- |
| Testing specification | `docs/TESTING.md` | Done — approved |
| Automated tests | Vitest + Playwright | Done — 18 Vitest files + 8 Playwright specs, passing |
| Scale document | `docs/SCALE.md` | Done |
| Security document | `docs/SECURITY.md` | Done |
| Presentation outline | `docs/PRESENTATION.md` | Done |
| Plan status update | `docs/IMPLEMENTATION_PLAN.md` | Done — Phase 9 marked complete |

---

## TESTING.md structure (what you will approve)

A **specification**, not source code. Each section lists purpose, scope, method (unit / integration / E2E / manual), target module or route, and pass criteria. Traceability IDs (e.g. `FEAT-03`, `AUTH-02`).

### Categories

1. **Main features** — Auth, onboarding, generate (adapt/scratch), recipe detail (scale, favorite, delete, add-to-list), refine, history/favorites filters, shopping list, Unsplash attach (graceful failure).
2. **Invalid inputs** — Zod/API rejection: empty dish, oversized paste, bad refine body, bad profile fields, malformed JSON, non-culinary refuse.
3. **Main business processes** — Signup → onboard → generate → scale → list → export; adapt + creator/sources; refine + chat_log; rate-limit claim/refund with mock AI.
4. **Auth** — Unauthenticated `(app)` / API access; session required; onboarding gate.
5. **Privilege between users** — User A cannot access User B recipes/shopping (RLS); detail not found for non-owner. Automated where feasible; otherwise manual two-user checklist.
6. **DB** — Constraints (mode, servings, chat_log); merge unique `(user_id, name, unit)`; nullable image columns; migration `0004` noted.
7. **UI** — Playwright/manual: landing/auth, generate overlay, cook mode, history filters, empty states.
8. **Edge cases** — Fractional scale; empty list; `ai_unavailable`; generate OK when image attach fails; persona fallback; empty filters.
9. **Stress** — Daily generation 429; concurrent claims; large paste near max; large shopping list. Mock/API scripts + short manual burst notes (full cloud load lab out of scope).

### Cross-cutting

- Test pyramid: unit → API (`AI_PROVIDER=mock`) → one Playwright happy path → manual privilege/stress appendix.
- How to run: `npm test`, Playwright, env notes (no live Gemini required for default unit/API suite).

---

## After TESTING.md approval — implementation approach

- **Vitest:** `lib/shopping/merge.ts`, `lib/shopping/scale.ts`, `lib/validation/*`, `lib/ai/schema.ts`, generate route with mock provider.
- **Playwright:** signup → onboard → scratch generate → favorite → add list → export.
- **Manual appendix:** two-user privilege, live Unsplash, optional stress burst.

## Scale / security / presentation

- **SCALE.md** — rate limits, Gemini latency, Unsplash timeout, serverless, DB indexes.
- **SECURITY.md** — RLS, secrets, redirects, AI refuse, Unsplash key handling.
- **PRESENTATION.md** — agenda, demo script, architecture bullets, known limits.

## Out of scope

- New product features.
- Full k6/cloud load suite.
- Committing secrets; requiring live Gemini for default unit tests.

## Status

All deliverables above are complete. Phase 9 is done.
