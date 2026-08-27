# TasteTailor — Manual test checklist

Companion to [TESTING.md](./TESTING.md). Record pass/fail in course submission notes.
Automated coverage lives under `lib/**/*.test.ts`, `app/api/**/*.test.ts`, and `e2e/`.

**Precondition:** migration `0004_recipe_images` applied; email confirmation disabled for E2E signup accounts.

---

## Privilege (`PRIV-*`)

| ID | Result | Notes |
| --- | --- | --- |
| PRIV-01 | ☐ | User B cannot open A's recipe UUID |
| PRIV-02 | ☐ | B cannot favorite/refine A's recipe |
| PRIV-03 | ☐ | B cannot delete A's recipe |
| PRIV-04 | ☐ | A's history shows only A's recipes |
| PRIV-05 | ☐ | Shopping lists isolated |
| PRIV-06 | ☐ | B cannot toggle/delete A's shopping row |
| PRIV-07 | ☐ | A cannot update B's profile (SQL/RLS) |
| PRIV-08 | ☐ | Covered by API unit test; spot-check DB `user_id` |

Follow the procedure in TESTING.md §7.

---

## Database (`DB-*`)

| ID | Result | Notes |
| --- | --- | --- |
| DB-01 | ☐ | `mode` check constraint |
| DB-02 | ☐ | `servings_base` 1–24 |
| DB-03 | ☐ | title length constraints |
| DB-04 | ☐ | `handle_new_user` creates profile |
| DB-05 | ☐ | shopping unique `(user_id, name, unit)` merge |
| DB-06 | ☐ | chat_log cap (also UNIT-08) |
| DB-07 | ☐ | image columns nullable |
| DB-08 | ☐ | `0004_recipe_images` columns exist |
| DB-09 | ☐ | delete strips `source_recipe_ids` (migration 0002) |

---

## Stress (`STRESS-*`)

| ID | Result | Notes |
| --- | --- | --- |
| STRESS-01 | ☐ | After `GENERATIONS_PER_DAY` claims → 429 |
| STRESS-02 | ☐ | Rapid sequential generates under cap |
| STRESS-03 | ☐ | Two tabs near limit — no corrupt rows |
| STRESS-04 | ☐ | ~20k adapt paste accepted; over max → 400 |
| STRESS-05 | ☐ | 50 shopping lines usable |
| STRESS-06 | ☐ | Many refines; chat_log trimmed; refine still works |
| STRESS-07 | ☐ | Live Gemini 503 → retries / `ai_unavailable` + refund |

---

## Security live probes (`SEC-*`)

| ID | Result | Notes |
| --- | --- | --- |
| SEC-02 | ☐ | Source links have `noopener noreferrer` |
| SEC-03 | ☐ | Seed hostile `<script>` title — escaped |
| SEC-04 | ☐ | Live adapt paste injection — no system prompt leak |
| SEC-05 | ☐ | Jailbreak persona_query |
| SEC-06 | ☐ | `npm run build` then grep client chunks for keys |
| SEC-08 | ☐ | `.env*` ignored except examples |
| SEC-09 | ☐ | Non-Unsplash `image_url` does not load via next/image |
| SEC-10 | ☐ | No client import of `lib/ai/*` / `lib/images/*` |

Automated: SEC-01, SEC-07, SEC-09 (config) in Vitest.

---

## Live Unsplash / UI

| ID | Result | Notes |
| --- | --- | --- |
| FEAT-16 | ☐ | With key + migration, `image_url` may be set |
| UI-02 | ☐ | Auth split layout desktop/mobile |
| UI-05 | ☐ | History skeleton on slow network |
| UI-09 | ☐ | Photo credit link when image set |
| UI-12 | ☐ | `ai_unavailable` copy on busy refine |

---

## Authenticated Playwright journeys

Uses `E2E_EMAIL` / `E2E_PASSWORD` (defaults: `test@test.com` / `test12345678`).
Session state is written to `e2e/.auth/` (gitignored). Playwright starts its own
`next dev` on port 3000 with `AI_PROVIDER=mock` — stop any existing server on that
port first, or set `PW_REUSE_SERVER=1` only if that server is already on mock.

```bash
npm run test:e2e
```

Covered in automation: FEAT-02, FEAT-07–09, FEAT-11, FEAT-14–15, FEAT-17, UI-03/04/06, AUTH-07, BP-01 (partial).
