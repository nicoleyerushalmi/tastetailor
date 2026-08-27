# TasteTailor — Manual test checklist

Companion to [TESTING.md](./TESTING.md). Record pass/fail in course submission notes.
Automated coverage lives under `lib/**/*.test.ts`, `app/api/**/*.test.ts`, and `e2e/`.

**Precondition:** migration `0004_recipe_images` applied; email confirmation disabled for E2E accounts.

**Test accounts:** `test@test.com` (A) and `testb@test.com` (B) — override via `E2E_*` env vars.

---

## Privilege (`PRIV-*`) — automated in `e2e/privilege.spec.ts`

| ID | Result | Notes |
| --- | --- | --- |
| PRIV-01 | ✅ auto | B → A's recipe UUID → not found |
| PRIV-02 | ✅ auto | B refine 404; favorite update 0 rows |
| PRIV-03 | ✅ auto | B delete 0 rows; A still sees recipe |
| PRIV-04 | ✅ auto | B history excludes A's marker title |
| PRIV-05 | ✅ auto | Shopping list loads under B |
| PRIV-06 | ✅ auto | B cannot toggle/delete A's shopping row |
| PRIV-07 | ✅ auto | B cannot update A's profile |
| PRIV-08 | ✅ auto | API unit + generate stamps `user_id` |

---

## Database (`DB-*`)

| ID | Result | Notes |
| --- | --- | --- |
| DB-01 | ☐ | `mode` check constraint (needs service-role SQL) |
| DB-02 | ☐ | `servings_base` 1–24 |
| DB-03 | ☐ | title length constraints |
| DB-04 | ☐ | `handle_new_user` creates profile |
| DB-05 | ☐ | shopping unique merge (partial E2E via add-to-list) |
| DB-06 | ✅ auto | UNIT-08 / STRESS-06 chat_log cap |
| DB-07 | ✅ auto | generate with null images (API) |
| DB-08 | ☐ | `0004_recipe_images` columns exist |
| DB-09 | ☐ | delete strips `source_recipe_ids` |

---

## Stress (`STRESS-*`) — mostly automated in `app/api/generate/stress.test.ts`

| ID | Result | Notes |
| --- | --- | --- |
| STRESS-01 | ✅ auto | 429 when slot claim false |
| STRESS-02 | ✅ auto | 5 sequential generates → 201 |
| STRESS-03 | ☐ | Two tabs near limit (needs counter reset) |
| STRESS-04 | ✅ auto | 20k ok / 20_001 → 400 |
| STRESS-05 | ☐ | 50 shopping lines UI |
| STRESS-06 | ✅ auto | chat_log trim to cap |
| STRESS-07 | ☐ | Live Gemini 503 (UNIT covers mock retries) |

---

## Security (`SEC-*`)

| ID | Result | Notes |
| --- | --- | --- |
| SEC-01 | ✅ auto | Vitest `isHttpUrl` |
| SEC-02 | ✅ auto | `e2e/security-ui.spec.ts` |
| SEC-03 | ✅ auto | Seeded `<script>` title escaped |
| SEC-04 | ✅ auto | Mock adapt injection (API) |
| SEC-05 | ☐ | Live jailbreak persona (optional) |
| SEC-06 | ☐ | Build chunk key scan (optional CI) |
| SEC-07 | ✅ auto | API error shape |
| SEC-08 | ✅ auto | gitignore hygiene |
| SEC-09 | ✅ auto | Config unit + E2E no fetch to bad host |
| SEC-10 | ✅ auto | Client import boundary |

---

## Live Unsplash / UI

| ID | Result | Notes |
| --- | --- | --- |
| FEAT-16 | ☐ | Live Unsplash attach (optional) |
| UI-02 | ✅ auto | Auth form desktop + mobile |
| UI-05 | ☐ | History skeleton (brittle) |
| UI-09 | ✅ auto | Seeded photo credit |
| UI-10 | ✅ auto | Mobile nav drawer |
| UI-12 | ✅ auto | `ai_unavailable` via route mock |

---

## Run automation

```bash
npm test
# Free port 3000 (or set PW_REUSE_SERVER=1 only if already AI_PROVIDER=mock)
npm run test:e2e
```
