# TasteTailor — Scale & Limits

Status: reflects the implemented app. MVP scale is about **limit and burst validation**, not a cloud load-testing lab (see §8's boundaries) — every bound below is a real, current value from source, and every stress claim maps to a `STRESS-*` test in [`TESTING.md`](./TESTING.md) §12.

---

## 1. Concurrent users — what happens at tens or hundreds of users

- **The app tier scales fine on its own.** Every route (`app/api/*`, all Server Components) runs as a stateless Vercel serverless function — no persistent process, no in-memory state shared between requests. Vercel spins up as many concurrent function instances as needed, so tens or hundreds of users browsing history, scaling servings, or managing their shopping list concurrently isn't a bottleneck the app's own architecture introduces.
- **Postgres writes that must be atomic under concurrency are, and this is tested.** The one place concurrent users genuinely contend with each other is the daily generation-limit counter — two requests from the same user racing to claim the last slot. This is handled by an atomic `claim_generation_slot` Postgres RPC (not an app-level read-then-write, which would race), and `STRESS-03` (`e2e/stress-concurrent.spec.ts`) proves it under a real race: two parallel `POST /api/generate` calls with exactly one slot left resolve to one `201` and one `429`, never two successes or a corrupted count.
- **The real ceiling at hundreds of users is an external dependency, not this app's code**: every user's Gemini calls go through **one shared `GEMINI_API_KEY`**, which carries its own account-level rate limits (requests/minute, requests/day) on Google's side. This app's own retry/backoff/fallback-model logic (§7) makes individual requests resilient to *transient* overload, but it cannot manufacture more quota — at genuinely high concurrent usage, Gemini's own rate limiting becomes the actual throughput ceiling, not anything in this codebase. See §7 and §8 for how this should be addressed at real scale.
- Supabase's connection/query limits are governed by its own plan tier and aren't something this repo's code controls; the app doesn't open unmanaged raw connections itself.

## 2. Heavy / resource-intensive database queries

Most queries in this app are cheap point-lookups or small indexed range scans (a single recipe by id, a profile by id). The queries worth calling out specifically:

- **History / Favorites pagination's `hasNext` check.** Both pages compute `{ count: "exact" }` alongside the page of rows, purely to answer the boolean "is there a next page?" — an exact count forces Postgres to count the full matching row set every single page load, which gets more expensive as a user's history grows, just to answer a question a cheaper technique could answer (see §8). This is a real, identified inefficiency, not a hidden one.
- **The shopping list's "load all items for user" query** has no upper bound (§5) — cheap today at MVP list sizes, but it's a full-table-per-user scan that would need attention if any user's list grew into the hundreds of items.
- **The refine route's read-modify-write** (fetch the recipe, call Gemini, update the same row) is a single-row operation and cheap on its own, but its *wall-clock* duration is dominated by the Gemini call in between (§7), not the database work.
- A query that does **not** exist but is worth naming: there's no full-text or ingredient-content search across recipes — every list query filters only on `user_id` (+ `is_favorite`/`mode`), so nothing here does an expensive scan over JSONB recipe content.

## 3. Database indexes

| Index | Table | Supports |
|---|---|---|
| `(user_id, created_at desc)` | `recipes` | The default history feed query |
| `(user_id, created_at desc) where is_favorite = true` (partial) | `recipes` | The favorites page, without scanning non-favorited rows |
| `(user_id, is_checked)` | `shopping_list_items` | Splitting "To buy" vs "Already have" |
| Primary keys (`id` on all three tables) | all | Direct single-row lookups (recipe detail, refine's initial fetch) |
| Unique `(user_id, name, unit)` | `shopping_list_items` | Both the merge-on-conflict upsert *and* doubles as a lookup index for that key |

**A gap worth flagging rather than hiding**: the History page's "Adapted"/"From scratch" filter chips query `where user_id = ? and mode = ?`, but there's no composite index covering `(user_id, mode, created_at)` — only the plain `(user_id, created_at desc)` index exists. At MVP-scale per-user row counts this is invisible (Postgres just filters the indexed rows by `mode` after the index scan), but it's the first index I'd add if per-user recipe counts grew large (see §8).

## 4. Data fetching — avoiding over-fetching

- **List views and the detail view intentionally select different column sets.** `RecipeSummary` (`types/recipe.ts`) — used by history/favorites cards — carries only `id, title, created_at, is_favorite, mode, image_url, image_alt`; the full `RecipeRow` (ingredients, steps, insights, chat_log, source_input) is only ever fetched on the single-recipe detail page. A grid of 12 history cards never pulls a full recipe body over the wire for rows the user isn't looking at.
- **Server Components fetch exactly what their page needs and pass it down as props** — there's no client-side "fetch everything then filter in the browser" pattern anywhere; filtering (history's `?filter=`) and pagination (`?page=`) are query-param-driven server refetches, not client-side slicing of an over-fetched dataset.
- **The refine route's recipe fetch is scoped to the columns it actually uses** (`id, title, servings_base, ingredients, steps, persona_query, chat_log`) rather than `select("*")`.

## 5. Pagination

**Implemented and used correctly for its purpose**, with one known inefficiency already called out in §2:

- History and Favorites both paginate at `HISTORY_PAGE_SIZE = 12` via a server-side `range()` query — never loading a user's entire history into memory. Page state lives in the `?page=` URL search param (survives refresh, is shareable/bookmarkable), not client component state.
- The shopping list and the refine chat log are **deliberately not paginated** — the shopping list because it's expected to stay small (§8 flags a revisit threshold), and the chat log because it's already bounded by a hard cap (40 entries app-side, 60 DB-enforced) rather than needing pagination.
- The inefficiency: `hasNext` is currently computed from an exact `count`, when a cheaper and equally correct technique (fetch `PAGE_SIZE + 1` rows, check whether the extra row exists) would answer the same question without a full count scan. Correctness isn't in question — cost is (§8).

## 6. Client/server separation

- **Server Components own initial reads**: history, favorites, shopping list's initial load, the recipe detail page's initial fetch, and onboarding's initial profile read are all server-rendered — the client never re-fetches data the server already has on first paint.
- **Client Components own only interactivity that needs it**: the generate forms, the serving scaler, the refine chat, cook mode, the shopping list's optimistic check/delete mutations, toasts, and the mobile nav drawer. None of these own primary data-fetching responsibility — they mutate, then either trust an optimistic local update (reverting on error) or replace state with a server response (refine).
- **Validation logic isn't duplicated as two different implementations** — the same Zod schemas run client-side (fast UX feedback) and server-side (the actual authority; see `SECURITY.md` §5), so there's one source of truth for "what's a valid request," not a client copy that could drift from the server's rules.
- **Secret-holding logic is strictly server-only**: Gemini and Unsplash calls happen only inside route handlers/server modules, never in a `"use client"` file — enforced by an automated test (`SECURITY.md` §7), which is as much an architectural-separation guarantee as a secrets one.

## 7. Current limitations

- **Shared Gemini quota is the real throughput ceiling** (§1) — this is an external constraint, not something fixable by changing this app's code alone.
- **AI calls run synchronously inside the request/response cycle.** A slow Gemini combo-and-fallback sequence can take up to roughly a minute or two in the worst case (see `TECHNICAL_DESIGN.md`/session history on Gemini retry tuning) — and because this happens inside a single serverless function invocation, it competes directly against that platform's own function-duration ceiling. On a constrained hosting tier, an unusually slow AI response risks the platform terminating the function before Gemini ever replies, which would surface to the user as a generic failure rather than the "still working" messaging the UI shows during a merely-slow-but-successful call.
- **The `{count: "exact"}` pagination pattern** (§2/§5) costs more than necessary as history grows, though it's correct.
- **The shopping list has no upper bound or pagination** — fine at MVP list sizes (tested to 30+ items via `STRESS-05`), not validated beyond that.
- **No caching layer** (no Redis, no CDN caching of dynamic per-user data) — every list view re-queries Postgres on every navigation.
- **Single-region deployment** — no multi-region database replication or edge-local reads.
- **No background job/queue system** — the best-effort Unsplash image lookup and the Gemini call both happen inline in the request instead of being handed off to run independently of the HTTP response lifecycle.

## 8. Future improvements for much larger scale

1. **Take AI generation off the synchronous request path** — return immediately with a "generating" state and let the client poll or receive a push/webhook update when the recipe is ready, so a slow Gemini call can no longer risk hitting a serverless function's execution-time ceiling.
2. **Replace exact-count pagination** with a "fetch `PAGE_SIZE + 1`" `hasNext` check on history/favorites, removing the full count-scan cost entirely.
3. **Add the missing `(user_id, mode, created_at)` composite index** if per-user recipe counts grow large enough that the filtered-chip queries start showing up in slow-query logs.
4. **Paginate or virtualize the shopping list** once real usage shows lists regularly exceeding the ~200-row threshold already flagged as a revisit point.
5. **Move off a single shared Gemini API key** toward either a higher-throughput paid tier, per-tenant keys, or a request queue with backpressure, so one account's rate limit isn't a shared ceiling for every user.
6. **Introduce a proper background job system** (e.g. a queue) for the Unsplash lookup and, longer-term, for AI generation itself — decoupling both from the request/response lifecycle entirely rather than just bounding their timeouts as done today.
7. **Add a caching layer** for read-heavy, low-churn data (e.g. a user's own recent history) if repeated re-querying becomes measurably costly at scale.
8. **Formal load testing** (k6/Locust-style, multi-region) once there's real production traffic to model against — deliberately out of scope for this MVP phase, where the pressure points that actually matter (a shared external AI dependency's overload behavior, and per-user cost control) were the ones validated instead.
