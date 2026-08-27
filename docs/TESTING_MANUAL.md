# TasteTailor — Manual checklist

Companion to [TESTING.md](./TESTING.md). **Only items you still run by hand** (or opt-in live).  
Everything else is automated — see [TESTING.md §14](./TESTING.md#14-implementation-mapping) for IDs → files and how to run `npm test` / `npm run test:e2e`.

Record pass/fail here for course submission notes.

**Accounts (if needed):** `test@test.com` / `testb@test.com` (or `E2E_*` env).  
**Precondition:** migration `0004_recipe_images` applied.

---

## Required manual

| ID | Pass? | How to run | Pass criteria |
| --- | --- | --- | --- |
| **STRESS-07** | ☐ | With `AI_PROVIDER=gemini` and a real key, force or wait for a slow/503 upstream (or briefly break the key / exhaust quota). Generate once. | UI shows `ai_unavailable` (or retry succeeds); no crash; generation slot refunded on upstream failure. Mock retries already cover the code path in Vitest (UNIT-10–12). |
| **UI-05** | ☐ | Throttle Network to Slow 3G (DevTools), open `/history`. | A loading skeleton (or equivalent busy UI) appears briefly before the list. |

---

## Optional live smoke (not CI)

Run instead of (or in addition to) ticking FEAT-16 / SEC-05 by hand:

```bash
# GEMINI_API_KEY required; UNSPLASH_ACCESS_KEY for FEAT-16
# Free port 3000 — see TESTING.md “How to run”
npm run test:live
```

| ID | Pass? | Notes |
| --- | --- | --- |
| **FEAT-16** | ☐ | Live Unsplash attach on generate; skip if no Unsplash key. |
| **SEC-05** | ☐ | Jailbreak `persona_query`; response must not leak system-prompt markers. |

---

## Not on this checklist

Automated coverage (do **not** re-run manually unless debugging):

- Privilege `PRIV-*` → `e2e/privilege.spec.ts`
- Database `DB-*` → `e2e/database.spec.ts` (DB-04 needs `SUPABASE_SERVICE_ROLE_KEY`)
- Stress `STRESS-01`–`06` → Vitest + `e2e/stress-*.spec.ts`
- Security `SEC-01`–`04`, `SEC-06`–`10` → Vitest / E2E / `test:client-secrets`
- Happy path, auth gates, UI (except UI-05) → `e2e/*.spec.ts`
