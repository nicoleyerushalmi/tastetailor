# TasteTailor — Software Architecture

Status: reflects the implemented app, Stack constraint: Next.js + TypeScript + Supabase + Vercel
Related: Product Specification Document (PRD)

---

## 1. Goals of this architecture

Support these end-to-end flows:

1. Onboarding & dietary profile
2. Tailored generation (adapt a pasted recipe **or** generate from a dish name) + history
3. Client-side serving scale
4. Favorites
5. Shopping list + clipboard export
6. Recipe refine (a chat-style follow-up that edits an existing recipe in place)
7. Cook mode (a distraction-free, printable view of a recipe)
8. Best-effort recipe photo attachment (Unsplash)


---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)** + **TypeScript** | Course requirement; SSR/RSC for auth-gated pages; Route Handlers for LLM |
| Hosting | **Vercel** | Course requirement; native Next.js deploy |
| Database | **Supabase Postgres** | Course requirement; relational data for recipes/lists |
| Auth | **Supabase Auth** (email + password only) | Built-in session cookies via `@supabase/ssr`; pairs with RLS |
| Authorization | **Postgres Row Level Security (RLS)** | Users only read/write their own rows |
| AI | **Google Gemini API** (`gemini-flash-latest` default, override via `GEMINI_MODEL`) | Real provider actually implemented (`lib/ai/gemini.ts`) — the original plan below was OpenAI, but the shipped app never called it; an `OPENAI_API_KEY`/`OPENAI_MODEL` env pair still exists as an unused placeholder for a possible future adapter (`.env.local.example`, `# Optional (OpenAI adapter not shipped yet)`). Gemini calls include a retry/backoff loop, multiple search/thinking-budget attempt combinations, and an optional second-model failover (`GEMINI_FALLBACK_MODEL`) for when the primary model is overloaded. |
| Images | **Unsplash API** (optional) | Best-effort recipe photo on generate; `lib/images/unsplash.ts`, silently skipped if `UNSPLASH_ACCESS_KEY` is unset |
| Validation | **Zod** | Shared schemas for AI output, forms, and API bodies |
| UI | **React** + **Tailwind CSS v4** | Utility classes + CSS custom-property design tokens in `app/globals.css` |
| Tests | **Vitest** (unit/API, mock AI) + **Playwright** (E2E, mock AI by default; opt-in live Gemini/Unsplash smoke) | Full automated suite implemented — see `docs/TESTING.md` |

### External services

| Service | Role | Secrets |
|---|---|---|
| Supabase | Auth + DB | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, only used by one E2E test) |
| Google Gemini | Recipe generation + refine | `GEMINI_API_KEY` (server-only), optional `GEMINI_FALLBACK_MODEL` |
| Unsplash | Recipe photo lookup | `UNSPLASH_ACCESS_KEY` (server-only, optional — feature degrades gracefully without it) |
| Vercel | Hosting + env vars | Project env in Vercel dashboard |

Never expose `GEMINI_API_KEY`, `UNSPLASH_ACCESS_KEY`, or service-role keys to the browser (enforced and regression-tested — see SEC-06 in `docs/TESTING.md`, which scans the built client bundle for these values).

---

## 3. High-level system components

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  Pages: auth, onboarding, generate, recipe detail, history,  │
│         favorites, shopping list, profile                    │
│  Client-only: serving scale math, cook mode, clipboard export│
└───────────────┬─────────────────────────────┬───────────────┘
                │ Supabase JS (RLS)           │ HTTPS
                ▼                             ▼
┌───────────────────────────┐    ┌────────────────────────────┐
│     Supabase              │    │   Next.js Route Handlers   │
│  - Auth                   │    │   /api/generate            │
│  - Postgres + RLS         │    │   /api/recipes/[id]/refine │
│  - profiles, recipes,     │    │   (auth check, rate limit, │
│    shopping_list_items    │    │    Gemini call, save row)  │
└───────────────────────────┘    └─────────┬──────────┬───────┘
                                            │          │
                                            ▼          ▼
                                 ┌────────────┐  ┌────────────┐
                                 │ Gemini API │  │  Unsplash  │
                                 │ (+ fallback│  │  (optional,│
                                 │  model)    │  │  best-eff.)│
                                 └────────────┘  └────────────┘
```

**Data ownership rule**

- CRUD for profile, history, favorites, shopping list → **Supabase client from the app**, enforced by **RLS**.
- AI generation and refine → **only via Next.js server** (`/api/generate`, `/api/recipes/[id]/refine`), so the Gemini API key never ships to the client.
- Route protection has two layers: `proxy.ts` (root-level, delegates to `lib/supabase/middleware.ts`) redirects unauthenticated requests away from a fixed list of protected path prefixes; the `(app)` layout and `/onboarding` page additionally gate on `profiles.onboarding_completed` server-side.

---

## 4. Users & permissions

### Roles (MVP)

| Role | Who | Access |
|---|---|---|
| Anonymous | Not logged in | Landing, login, signup only |
| Authenticated user | Registered end-user (B2C client) | Full app: generate, refine, history, favorites, shopping list, profile |

No admin role in MVP.

### Authorization rules

| Resource | Policy |
|---|---|
| `profiles` | `select/update` where `id = auth.uid()`; insert on signup via a `security definer` trigger (no direct insert policy) |
| `recipes` | CRUD where `user_id = auth.uid()` |
| `shopping_list_items` | CRUD where `user_id = auth.uid()` |
| `/api/generate` | Requires valid Supabase session + completed onboarding; rejects if over rate limit |
| `/api/recipes/[id]/refine` | Same as above, plus the recipe must exist and belong to the caller (`404` otherwise) |

All recipes and lists are **private**. No cross-user reads — verified end-to-end by the `PRIV-*` Playwright suite in `docs/TESTING.md`.

---

## 5. Database model

### 5.1 Entity relationship

```text
auth.users (Supabase)
    │ 1:1
    ▼
profiles
    │ 1:N
    ├── recipes
    └── shopping_list_items
```

Culinary **style personas** are primarily **free-text** (user types a creator/style name). A curated list (`lib/persona-known-creators.ts`, ~55 entries) backs an HTML `<datalist>` autocomplete, and `lib/persona-shortcuts.ts` offers 5 generic style phrases as quick-fill buttons — neither is a browsable "categories" UI. There is **no persona DB table** — unresolved names use the profile-only fallback (see §6.1).

### 5.2 Tables

#### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users.id` |
| `display_name` | `text` | nullable |
| `allergies` | `text[]` | e.g. `{gluten,lactose}` |
| `diet_type` | `text` | e.g. `vegan`, `keto`, `none` |
| `goals` | `text[]` | e.g. `{high_protein,low_calorie}` |
| `preferences_notes` | `text` | free-text extras |
| `onboarding_completed` | `boolean` | gate access to generate |
| `daily_generation_count` | `int` | rate limit counter |
| `generation_count_reset_at` | `timestamptz` | daily window |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### `recipes`

| Column | Type | Notes | Added |
|---|---|---|---|
| `id` | `uuid` PK | | 0001 |
| `user_id` | `uuid` FK | → `profiles.id` | 0001 |
| `title` | `text` | | 0001 |
| `mode` | `text` | `adapt` \| `scratch` | 0001 |
| `persona_query` | `text` | nullable; free-text creator/style the user requested | 0001 |
| `persona_fallback_used` | `boolean` | true when persona unknown → profile-only / general recipe | 0001 |
| `servings_base` | `int` | base servings from AI (1–24) | 0001 |
| `ingredients` | `jsonb` | `[{name, quantity, unit}]` | 0001 |
| `steps` | `jsonb` | `string[]` | 0001 |
| `insights` | `jsonb` | summary + substitutions + citation sources | 0001 |
| `source_input` | `jsonb` | original validated request body (audit/debug) | 0001 |
| `is_favorite` | `boolean` | default false | 0001 |
| `created_at` | `timestamptz` | | 0001 |
| `chat_log` | `jsonb` | array of `{role, message, created_at}`; app trims to 40 entries, DB check allows up to 60 as a safety net | **0003** |
| `updated_at` | `timestamptz` | bumped on refine | **0003** |
| `image_url` | `text` | nullable; Unsplash photo URL | **0004** |
| `image_alt` | `text` | nullable | **0004** |
| `image_credit_name` | `text` | nullable; photographer credit | **0004** |
| `image_credit_url` | `text` | nullable; credit link | **0004** |

Indexes: `(user_id, created_at desc)` — history feed; `(user_id, created_at desc) where is_favorite = true` — favorites.

#### `shopping_list_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | one active list per user (all rows = current list) |
| `name` | `text` | normalized lowercase key for merge |
| `display_name` | `text` | original casing for UI |
| `quantity` | `numeric` | |
| `unit` | `text` | normalized unit string; empty if countable |
| `is_checked` | `boolean` | "already own" |
| `source_recipe_ids` | `uuid[]` | traceability; a row's own id is pruned out of every list item when that recipe is deleted (trigger, see §5.3) |
| `updated_at` | `timestamptz` | |

Unique constraint for merge: `(user_id, name, unit)`.

Index: `(user_id, is_checked)`.

### 5.3 Triggers

| Trigger | Table | Fires | Function |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | after insert | `handle_new_user()` — creates the matching `profiles` row with `onboarding_completed = false` |
| `profiles_set_updated_at` | `profiles` | before update | `set_updated_at()` |
| `recipes_set_updated_at` | `recipes` | before update | `set_updated_at()` (added migration 0003) |
| `shopping_list_set_updated_at` | `shopping_list_items` | before update | `set_updated_at()` |
| `recipes_cleanup_shopping_list_refs` | `recipes` | after delete | `strip_deleted_recipe_from_shopping_list()` — removes the deleted recipe's id from every `source_recipe_ids` array (added migration 0002) |

---

## 6. Core business logic

### 6.1 Generation pipeline (`POST /api/generate`)

1. Verify session + load profile (`getCurrentUserAndProfile()`) → `401` if either is missing.
2. Require `onboarding_completed` → `403` otherwise.
3. Parse and validate the JSON body against `GenerateRequestSchema` → `400` on either failure.
   - **Adapt mode is one free-text field**, not structured title/ingredients/steps: `{ mode: "adapt", recipe_text: string (20–20,000 chars), persona_query }`. The model parses the pasted text into structured ingredients/steps itself.
   - Scratch mode: `{ mode: "scratch", dish_name: string (2–160 chars), persona_query }`.
4. Atomically claim a daily generation slot via the `claim_generation_slot(max_per_day)` Postgres RPC → `429` if denied.
5. Build the system + user prompt (`lib/ai/prompt.ts`) from the profile and request.
6. Call the Gemini provider (`lib/ai/gemini.ts`) with the culinary-only system guardrail + profile + optional persona request:
   - Tries several search-tool/thinking-budget combinations sequentially, with per-call timeouts and backoff on transient (429/502/503/504) responses.
   - If the primary model is fully overloaded/unresponsive and `GEMINI_FALLBACK_MODEL` is set, retries once against that model.
   - If a persona was requested but the model can't apply it, the response sets `persona_applied: false`; the server sets `persona_fallback_used = true` and still returns a valid general/profile-based recipe.
7. Validate the AI JSON with Zod; on failure, one repair-retry with a "fix this to match the schema" instruction; if still invalid → `422`, and the claimed slot is refunded.
8. If the model's response is a refusal (non-culinary request) → `400`, no recipe row is created, and the slot is **not** refunded (deliberate abuse deterrence).
9. Insert the `recipes` row for the user.
10. Kick off a best-effort Unsplash photo lookup (`image_query` from the AI, or the title) **before** the insert resolves, then attach the result afterward — a failed/missing photo never blocks or fails the request; `image_*` columns simply stay `null`.
11. Return `201` with the saved recipe (including any attached image fields); the client shows a fallback notice when `persona_fallback_used` is true.

### 6.1a Refine pipeline (`POST /api/recipes/[id]/refine`)

Same auth/onboarding/rate-limit gates as above, plus: the target recipe must exist and belong to the caller (`404` otherwise). Runs the identical Gemini call → Zod-validate → repair-retry → refuse/invalid/success pipeline as generation (`lib/ai/run-generation.ts` is shared by both routes), using a refine-specific prompt that includes the recipe's current state and its recent chat history. On success, appends a `{user, assistant}` pair to `chat_log` (capped at 40 entries) and updates the recipe's title/servings/ingredients/steps/insights in place. Never touches the image fields.

### 6.2 Serving scale (client-only)

- Display quantities = `stored_quantity * (uiServings / servings_base)`, rounded to 2 decimals (`lib/shopping/scale.ts`).
- Never written back to the DB — purely a client-side display transform, both on the recipe page and in Cook Mode.

### 6.3 Shopping list merge (MVP rule)

**Merge only when `normalized_name` + `unit` match** — confirmed as the actual, intentional behavior in code (`lib/shopping/merge.ts`), with a dedicated test asserting different units never merge.

Examples:

- `2 onion` + `3 onion` → `5 onion`
- `1 cup flour` + `2 cup flour` → `3 cup flour`
- `1 cup flour` + `100 g flour` → **two lines** (same ingredient, different units — no automatic conversion exists)

### 6.4 Favorites

Toggle `recipes.is_favorite`. Favorites page = filter `is_favorite = true`, not a separate table.

### 6.5 Cook mode

A full-screen, client-only overlay (no route change) showing checkable ingredients and steps scaled to the current serving count, with a print affordance. Purely presentational — no DB writes.

---

## 7. API surface

Prefer **Route Handlers** for AI (clear HTTP boundary, easy to test). Prefer **direct Supabase client** for private CRUD (less boilerplate; RLS is the security layer).

### 7.1 Next.js Route Handlers

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/generate` | Required + onboarded | Run Gemini + persist a new recipe |
| `POST` | `/api/recipes/[id]/refine` | Required + onboarded + owner | Run Gemini against an existing recipe + persist the edit + chat log |
| `GET` | `/api/health` | — | Liveness check for deploy smoke tests / uptime monitors. Returns `200 { "ok": true }`. |

#### `POST /api/generate`

Request (adapt — one free-text field, not structured fields):

```json
{
  "mode": "adapt",
  "recipe_text": "Classic beef lasagna: layer pasta sheets with ground beef ragu, bechamel, and mozzarella. Bake 45 minutes at 375F until bubbly and golden.",
  "persona_query": "Ottolenghi"
}
```

Request (scratch):

```json
{
  "mode": "scratch",
  "dish_name": "Mac and Cheese",
  "persona_query": null
}
```

Response `201`:

```json
{
  "recipe": {
    "id": "...", "title": "...", "mode": "adapt",
    "ingredients": [], "steps": [], "insights": {},
    "servings_base": 4, "persona_query": null, "persona_fallback_used": false,
    "is_favorite": false, "chat_log": [], "created_at": "...", "updated_at": "...",
    "image_url": null, "image_alt": null, "image_credit_name": null, "image_credit_url": null
  }
}
```

Error codes: `401 unauthorized` · `403 onboarding_required` · `400 invalid_json` · `400 validation_error` · `429 rate_limited` · `400 non_culinary` · `422 invalid_ai_output` · `503 ai_unavailable` (upstream busy/timeout) · `500 server_error`.

#### `POST /api/recipes/[id]/refine`

Request: `{ "message": "Make it dairy-free and cut the sodium in half." }` (2–500 chars; recipe id comes from the URL).

Response `200`: same recipe shape as above (minus the `image_*` fields, which this route never touches), with `chat_log` updated.

Error codes: same as `/api/generate`, plus `404 not_found` (recipe missing or not owned by the caller) instead of a persona-fallback-only concern.

### 7.2 Supabase data operations (from app)

| Operation | Table | How |
|---|---|---|
| Read/update profile | `profiles` | Supabase client |
| Complete onboarding | `profiles` | update prefs + `onboarding_completed=true` |
| List history | `recipes` | `order by created_at desc` + pagination (page size 12) |
| Get recipe | `recipes` | by `id` (RLS) |
| Toggle favorite | `recipes` | update `is_favorite` |
| Delete recipe | `recipes` | delete; trigger prunes it from any shopping-list `source_recipe_ids` |
| List favorites | `recipes` | `is_favorite = true` |
| Add recipe to list | `shopping_list_items` | upsert merge by `(user_id,name,unit)` |
| Toggle checked / delete item | `shopping_list_items` | update/delete |
| Clear list | `shopping_list_items` | delete all for user |
| Export | — | client formats checked/unchecked text → `clipboard.writeText` |

---

## 8. Application pages (App Router)

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing / value prop + CTA (hero → "How it works" → "Example fit"; no closing CTA section or footer) |
| `/login` | Public | Sign in |
| `/signup` | Public | Register |
| `/onboarding` | Auth | First-time dietary profile setup |
| `/generate` | Auth + onboarded | Adapt (paste) or scratch (dish name) tab, plus optional free-text creator/style with quick-fill shortcuts |
| `/recipes/[id]` | Auth + owner | Recipe detail: header, hero image, scale, ingredients/steps, insights, refine chat, add-to-list, cook mode |
| `/history` | Auth | Personal recipe history (filterable, paginated) |
| `/favorites` | Auth | Favorited recipes gallery |
| `/shopping-list` | Auth | Active list, check off, export |
| `/profile` | Auth | Edit dietary prefs |

Route protection is split across two layers (not one `middleware.ts`, which no longer exists in this Next.js version):

- **`proxy.ts`** (root file, replaces the deprecated `middleware.ts`/`middleware()` convention as of Next.js 16 — confirmed against the real upgrade guide shipped in `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`) delegates to `lib/supabase/middleware.ts`'s `updateSession()`, which refreshes the Supabase session cookie and redirects unauthenticated requests away from a fixed `PROTECTED_PREFIXES` list (`/generate`, `/favorites`, `/history`, `/profile`, `/recipes`, `/shopping-list`, `/onboarding`) to `/login`.
- **Server layouts/pages** additionally gate on onboarding: `(app)/layout.tsx` redirects to `/onboarding` if incomplete; `/onboarding` itself redirects to `/generate` if already complete; `(auth)/layout.tsx` redirects an already-logged-in user away from `/login`/`/signup`.

---

## 9. Data flow examples

### 9.1 Adapt recipe

```text
User pastes a full recipe block + POST /api/generate
  → server loads profile + checks rate limit
  → Gemini parses the paste into structured ingredients/steps/insights
  → INSERT recipes (+ best-effort Unsplash photo attach)
  → client navigates to /recipes/[id]
```

### 9.2 Refine

```text
User types "make it dairy-free" on /recipes/[id]
  → POST /api/recipes/[id]/refine
  → server loads the recipe + recent chat_log, calls Gemini with both
  → UPDATE recipes (fields + chat_log)
  → client replaces in-page recipe state; shows "Recipe updated" toast
```

### 9.3 Scale servings

```text
User on /recipes/[id] clicks +
  → React state uiServings++
  → ingredients re-rendered with scaled quantities
  → DB unchanged
```

### 9.4 Add to shopping list

```text
User clicks "Add to shopping list"
  → client scales ingredients to current uiServings
  → for each ingredient: upsert shopping_list_items on (user_id, name, unit)
  → toast + link to /shopping-list
```

### 9.5 Export

```text
User clicks Export
  → client builds "To buy" / "Already have" plain text from list rows
  → navigator.clipboard.writeText(...)
```

---

## 10. Frontend structure (as built)

```text
app/
  page.tsx                        # landing (no route group)
  layout.tsx                      # root shell — 3 fonts, MotionConfig
  globals.css
  not-found.tsx
  onboarding/page.tsx              # outside the (app) group
  (auth)/
    layout.tsx
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx                     # app nav + onboarding gate
    loading.tsx
    error.tsx
    generate/page.tsx
    recipes/[id]/page.tsx
    recipes/[id]/not-found.tsx
    history/page.tsx
    history/loading.tsx
    favorites/page.tsx
    shopping-list/page.tsx
    profile/page.tsx
  api/
    generate/route.ts
    recipes/[id]/refine/route.ts
proxy.ts                           # replaces middleware.ts (Next.js 16)
components/
  auth/ (LoginForm, SignupForm)
  onboarding/ (OnboardingForm)
  profile/ (PreferencesFields, ProfileForm)
  generate/ (GenerateTabs, AdaptRecipeForm, ScratchDishForm, PersonaField, GeneratingOverlay)
  recipe/ (RecipeDetailClient, RecipeHeader, IngredientList, StepList, InsightsBox,
           ServingScaler, FavoriteButton, DeleteRecipeButton, AddToShoppingListButton,
           RefineChat, CookModeView)
  history/ (RecipeCard, HistoryFilterChips, HistorySkeleton, Pagination)
  shopping/ (ShoppingListClient, ShoppingListItem, ClearListButton, ExportListButton)
  layout/ (AppNav, SiteHeader, Split, PageHeader, Section)
  ui/ (Button, TextField, TextArea, Select, CheckboxGroup, Tabs, Spinner, Toast, EmptyState)
lib/
  supabase/ (client.ts, server.ts, middleware.ts)
  ai/ (index.ts, provider.ts, gemini.ts, mock.ts, prompt.ts, schema.ts,
       run-generation.ts, rate-limit.ts, log.ts)
  images/ (unsplash.ts, safeRecipeImage.ts)
  recipes/ (chat-log.ts)
  security/ (isHttpUrl.ts)
  generate/ (mapApiError.ts)
  profile/ (get-profile.ts, options.ts)
  shopping/ (merge.ts, scale.ts, exportText.ts)
  validation/ (auth.ts, common.ts, generate.ts, profile.ts, refine.ts, shopping.ts, zod-issues.ts)
  persona-known-creators.ts
  persona-shortcuts.ts
  constants.ts
  format.ts
types/
  recipe.ts   # Ingredient, RecipeSource, RecipeInsights, ChatLogEntry, RecipeRow, RecipeSummary, ShoppingListItemRow
  profile.ts  # ProfileRow
supabase/
  migrations/0001_init.sql
  migrations/0002_refund_slot_and_cleanup.sql
  migrations/0003_recipe_refine_chat_log.sql
  migrations/0004_recipe_images.sql
```

Full component-level API detail lives in `TECHNICAL_DESIGN.md` §7.

**State management**

- Server Components load lists/details where possible (history, favorites, shopping list initial load, recipe detail's initial fetch).
- Client Components own: generate forms, serving scaler, refine chat, cook mode, shopping checkboxes/toasts, clipboard export, the app nav's mobile drawer.
- No global Redux — React state + Supabase fetches + URL query params (`?filter=`, `?page=`) for list state.

**Product language:** all UI copy in **English**.

---

## 11. AI contract (structured output)

Minimum recipe JSON the model must return (Zod-validated, `lib/ai/schema.ts`):

```ts
{
  title: string
  servings_base: number // int 1–24, coerced from string if needed
  ingredients: { name: string; quantity: number; unit: string }[]
  steps: string[]
  insights: {
    summary: string
    substitutions: { original?: string; replacement: string; reason: string }[]
    sources: { label: string; url?: string; note?: string }[] // citations, e.g. from grounded search
  }
  persona_applied: boolean       // accepts "true"/"yes"-style strings too, coerced
  refused?: boolean              // accepts string variants too
  refusal_reason?: string
  change_summary?: string        // refine calls only
  image_query?: string           // fresh generates only — drives the Unsplash search
}
```

System prompt duties (`lib/ai/prompt.ts`):

- Culinary tasks only; refuse anything else (guardrail).
- Respect allergies / diet / goals from profile.
- If `persona_query` is provided and recognizable, apply that voice (`persona_applied: true`).
- If not recognizable, produce a solid general recipe that still respects the dietary profile (`persona_applied: false`) — do not fail the request.
- Always fill `insights` with understandable substitution rationale.

---

## 12. Rate limiting & cost control

- Not a simple counter check — an **atomic Postgres RPC pair**: `claim_generation_slot(max_per_day)` (checks-and-increments `profiles.daily_generation_count` in one statement, resetting the daily window when it's stale) and `refund_generation_slot()` (decrements it back on any failure after the slot was claimed). This specifically fixes a race condition an earlier, non-atomic app-level read-then-write approach had (documented in migration `0002_refund_slot_and_cleanup.sql`).
- A refusal (non-culinary request) is deliberately **not** refunded — abuse deterrence.
- `GENERATIONS_PER_DAY` env var (default 20 via `DEFAULT_GENERATIONS_PER_DAY`) — `generationsPerDay()` falls back to the default on any unset/non-numeric/non-positive value.
- Model default: `gemini-flash-latest` (override via `GEMINI_MODEL`); optional `GEMINI_FALLBACK_MODEL` for one failover attempt when the primary is overloaded.

---

## 13. Error handling (app-level)

| Case | Behavior |
|---|---|
| Validation error | `400 validation_error` + field messages |
| Malformed JSON body | `400 invalid_json` |
| AI schema fail | one repair retry; then `422 invalid_ai_output` (slot refunded) |
| Non-culinary prompt | Model/guardrail refusal → `400 non_culinary` (slot **not** refunded) |
| Unknown / unusable persona | Still return a general profile-based recipe; UI notice (`persona_fallback_used`), with a "try again" retry option |
| Rate limit | `429 rate_limited` |
| Gemini overloaded/timeout | `503 ai_unavailable` (slot refunded); per-attempt timeout is 15s (light) or 30s (search/deep-thinking) across several retries/combos, and an optional one-shot fallback model |
| Refine on missing/foreign recipe | `404 not_found` |
| RLS / wrong id (non-refine reads) | Empty/404 — never leak others' data |

---

## 14. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # optional; only one E2E DB test uses it

AI_PROVIDER=gemini                # mock | gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=            # optional — tried once if the primary model is busy/unresponsive

GENERATIONS_PER_DAY=20
AI_DEBUG=                         # optional — verbose per-attempt Gemini logs (1|true|yes)

UNSPLASH_ACCESS_KEY=              # optional — omit to skip recipe photos gracefully

# Unused placeholder — no OpenAI adapter is implemented
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Never expose `GEMINI_API_KEY`, `UNSPLASH_ACCESS_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to the browser.

---

## 15. Deployment topology

```text
Vercel (Next.js)  ←→  Supabase (Auth + Postgres)
       │
       ├──→ Google Gemini API
       └──→ Unsplash API (optional)
```

Local: `.env.local` mirrors Vercel env.
Prod: same vars in Vercel project settings; Supabase project = production DB.

---

## 16. Locked product decisions

| Topic | Decision |
|---|---|
| UI language | **English** |
| Personas | **Free-text** creator/style; optional UI shortcuts only prefill the field. On fail to apply → **general / profile-based recipe** + user-facing notice (`persona_fallback_used`) with a retry option |
| Add to shopping list | Use **current scaled servings** (`uiServings`), not `servings_base` |
| Auth (MVP) | **Email + password** only (no OAuth) |
| AI provider | **Gemini**, not the originally-planned OpenAI; a same-provider fallback model is supported for overload resilience |

---

## 17. Next document after this

Detailed technical design: [`TECHNICAL_DESIGN.md`](./TECHNICAL_DESIGN.md).
