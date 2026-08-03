# TasteTailor — Software Architecture

Status: draft for MVP (course submission)  
Stack constraint: Next.js + TypeScript + Supabase + Vercel  
Related: Product Specification Document (PRD)

---

## 1. Goals of this architecture

Support the five MVP flows end-to-end:

1. Onboarding & dietary profile  
2. Tailored generation (adapt recipe **or** generate from dish name) + history  
3. Client-side serving scale  
4. Favorites  
5. Shopping list + clipboard export  

Non-goals for MVP (explicit):

- URL scraping / import from websites  
- Payments, freemium billing, affiliate supermarket APIs  
- Social sharing / public recipes  
- Precise nutrition / macro calculation  
- Automatic cup↔gram density conversion (see §6.3)  
- B2B dietitian multi-client accounts  

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** + **TypeScript** | Course requirement; SSR/RSC for auth-gated pages; Route Handlers for LLM |
| Hosting | **Vercel** | Course requirement; native Next.js deploy |
| Database | **Supabase Postgres** | Course requirement; relational data for recipes/lists |
| Auth | **Supabase Auth** (email + password only) | Built-in session cookies via `@supabase/ssr`; pairs with RLS |
| Authorization | **Postgres Row Level Security (RLS)** | Users only read/write their own rows |
| AI | **OpenAI API** (`gpt-4o-mini` default) | Cheap enough for student MVP; JSON mode / structured outputs for recipe schema |
| Validation | **Zod** | Shared schemas for AI output, forms, and API bodies |
| UI | **React** + CSS Modules or Tailwind (team choice) | Keep styling simple; no heavy UI kit required |
| Tests (later) | **Vitest** + **Playwright** | Unit/integration + critical E2E flows |

### External services

| Service | Role | Secrets |
|---|---|---|
| Supabase | Auth + DB | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, rare use) |
| OpenAI | Recipe generation | `OPENAI_API_KEY` (server-only) |
| Vercel | Hosting + env vars | Project env in Vercel dashboard |

Never expose `OPENAI_API_KEY` or service-role keys to the browser.

---

## 3. High-level system components

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  Pages: auth, onboarding, generate, recipe, history,         │
│         favorites, shopping list, profile                    │
│  Client-only: serving scale math, clipboard export           │
└───────────────┬─────────────────────────────┬───────────────┘
                │ Supabase JS (RLS)           │ HTTPS
                ▼                             ▼
┌───────────────────────────┐    ┌────────────────────────────┐
│     Supabase              │    │   Next.js Route Handlers   │
│  - Auth                   │    │   /api/generate            │
│  - Postgres + RLS         │    │   (auth check, rate limit, │
│  - profiles, recipes,     │    │    OpenAI, save recipe)    │
│    shopping_list_items    │    └─────────────┬──────────────┘
└───────────────────────────┘                  │
                                               ▼
                                    ┌────────────────────┐
                                    │     OpenAI API     │
                                    └────────────────────┘
```

**Data ownership rule**

- CRUD for profile, history, favorites, shopping list → **Supabase client from the app**, enforced by **RLS**.  
- AI generation → **only via Next.js server** (`/api/generate`), so the API key never ships to the client.

---

## 4. Users & permissions

### Roles (MVP)

| Role | Who | Access |
|---|---|---|
| Anonymous | Not logged in | Landing, login, signup only |
| Authenticated user | Registered end-user (B2C client) | Full app: generate, history, favorites, shopping list, profile |

No admin role in MVP.

### Authorization rules

| Resource | Policy |
|---|---|
| `profiles` | `select/update` where `id = auth.uid()`; insert on signup (trigger) |
| `recipes` | CRUD where `user_id = auth.uid()` |
| `shopping_list_items` | CRUD where `user_id = auth.uid()` |
| `/api/generate` | Requires valid Supabase session; rejects if over rate limit |

All recipes and lists are **private**. No cross-user reads.

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

Culinary **style personas** are primarily **free-text** (user types a creator/style name). A small curated list may still be offered as shortcuts that fill the same text field. There is **no persona DB table** — unresolved names use the profile-only fallback (see §6.1).

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

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | → `profiles.id` |
| `title` | `text` | |
| `mode` | `text` | `adapt` \| `scratch` |
| `persona_query` | `text` | nullable; free-text creator/style the user requested |
| `persona_fallback_used` | `boolean` | true when persona unknown → profile-only / general recipe |
| `servings_base` | `int` | base servings from AI (e.g. 4) |
| `ingredients` | `jsonb` | `[{name, quantity, unit}]` |
| `steps` | `jsonb` | `string[]` |
| `insights` | `jsonb` | insights box content |
| `source_input` | `jsonb` | original form or dish name (for audit/debug) |
| `is_favorite` | `boolean` | default false |
| `created_at` | `timestamptz` | |

Indexes:

- `(user_id, created_at desc)` — history feed  
- `(user_id, is_favorite)` where `is_favorite = true` — favorites  

#### `shopping_list_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | one active list per user (all rows = current list) |
| `name` | `text` | normalized lowercase key for merge |
| `display_name` | `text` | original casing for UI |
| `quantity` | `numeric` | |
| `unit` | `text` | normalized unit string; empty if countable |
| `is_checked` | `boolean` | “already own” |
| `source_recipe_ids` | `uuid[]` | optional traceability |
| `updated_at` | `timestamptz` | |

Unique constraint for merge: `(user_id, name, unit)`.

Indexes:

- `(user_id, is_checked)`  

### 5.3 Trigger

On `auth.users` insert → create empty `profiles` row with `onboarding_completed = false`.

---

## 6. Core business logic

### 6.1 Generation pipeline (`POST /api/generate`)

1. Verify session (Supabase server client).  
2. Load `profiles`; require `onboarding_completed`.  
3. Enforce rate limit (e.g. 20 generations / UTC day; configurable).  
4. Validate body with Zod (`mode`, recipe fields or `dish_name`, optional `persona_query` free-text).  
5. Call OpenAI with system guardrails (culinary-only) + user profile + optional persona request + structured output schema.  
   - If a persona was requested but the model cannot meaningfully apply it, response must set `persona_applied: false`; server stores `persona_fallback_used = true` and the recipe is still a valid **general / profile-based** recipe.  
6. Validate AI JSON with Zod; on failure → one retry; then 422 to client.  
7. Insert `recipes` row for the user.  
8. Increment generation counter.  
9. Return saved recipe (with `id`) to the client; UI shows a notice when fallback was used.

### 6.2 Serving scale (client-only)

- Display quantities = `stored_quantity * (uiServings / servings_base)`.  
- Do **not** write scaled values back to DB unless user explicitly “save as new” (out of MVP).  
- Avoid float noise: round sensibly in UI (e.g. 2 decimal places for metric, fractions optional later).

### 6.3 Shopping list merge (MVP rule)

**Merge only when `normalized_name` + `unit` match.**

Examples:

- `2 onion` + `3 onion` → `5 onion`  
- `1 cup flour` + `2 cup flour` → `3 cup flour`  
- `1 cup flour` + `100 g flour` → **two lines** (same ingredient, different units)

No automatic unit conversion in MVP. Export can group lines that share `display_name` but different units under one visual heading if useful.

### 6.4 Favorites

Toggle `recipes.is_favorite`. Favorites page = filter `is_favorite = true`, not a separate table.

---

## 7. API surface

Prefer **Route Handlers** for AI (clear HTTP boundary, easy to test). Prefer **direct Supabase client** for private CRUD (less boilerplate; RLS is the security layer).

### 7.1 Next.js Route Handlers

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/generate` | Required | Run LLM + persist recipe |
| `GET` | `/api/health` | Public | Optional deploy smoke check |

#### `POST /api/generate`

Request (adapt):

```json
{
  "mode": "adapt",
  "title": "Carbonara",
  "ingredients": [{ "name": "eggs", "quantity": 2, "unit": "" }],
  "steps": ["Boil pasta", "..."],
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
  "recipe": { "id": "...", "title": "...", "ingredients": [], "steps": [], "insights": {}, "servings_base": 4, "persona_fallback_used": false }
}
```

Error codes: `401` unauthenticated · `403` onboarding incomplete · `429` rate limit · `400` validation · `422` AI schema failure · `500` upstream.

### 7.2 Supabase data operations (from app)

| Operation | Table | How |
|---|---|---|
| Read/update profile | `profiles` | Supabase client |
| Complete onboarding | `profiles` | update prefs + `onboarding_completed=true` |
| List history | `recipes` | `order by created_at desc` + pagination (`limit/offset` or cursor) |
| Get recipe | `recipes` | by `id` (RLS) |
| Toggle favorite | `recipes` | update `is_favorite` |
| List favorites | `recipes` | `is_favorite = true` |
| Add recipe to list | `shopping_list_items` | upsert merge by `(user_id,name,unit)` |
| Toggle checked / delete item | `shopping_list_items` | update/delete |
| Clear list | `shopping_list_items` | delete all for user |
| Export | — | client formats checked/unchecked text → `clipboard.writeText` |

Optional later: Server Actions wrapping the same Supabase calls for form posts — not required if client mutations stay simple.

---

## 8. Application pages (App Router)

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing / value prop + CTA |
| `/login` | Public | Sign in |
| `/signup` | Public | Register |
| `/onboarding` | Auth | First-time dietary profile setup |
| `/generate` | Auth + onboarded | Dual input: adapt form **or** dish name + free-text persona/style (optional curated shortcuts) |
| `/recipes/[id]` | Auth + owner | Recipe detail, insights, scale +/- , favorite, add to list |
| `/history` | Auth | Personal recipe history (paginated) |
| `/favorites` | Auth | Favorited recipes gallery |
| `/shopping-list` | Auth | Active list, check off, export |
| `/profile` | Auth | Edit dietary prefs |

Middleware (`middleware.ts`): refresh Supabase session; redirect unauthenticated users away from private routes; redirect incomplete onboarding away from `/generate` etc.

---

## 9. Data flow examples

### 9.1 Adapt recipe

```text
User fills Adapt form → POST /api/generate
  → server loads profile + checks rate limit
  → OpenAI returns JSON recipe + insights
  → INSERT recipes
  → client navigates to /recipes/[id]
```

### 9.2 Scale servings

```text
User on /recipes/[id] clicks +
  → React state uiServings++
  → ingredients re-rendered with scaled quantities
  → DB unchanged
```

### 9.3 Add to shopping list

```text
User clicks "Add to Shopping List"
  → client scales ingredients to current uiServings
  → for each ingredient: upsert shopping_list_items on (user_id, name, unit)
  → redirect or toast → /shopping-list
```

### 9.4 Export

```text
User clicks Export
  → client builds plain text from list rows
  → navigator.clipboard.writeText(...)
```

---

## 10. Frontend structure (planned)

```text
app/
  (marketing)/page.tsx
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  (app)/onboarding/page.tsx
  (app)/generate/page.tsx
  (app)/recipes/[id]/page.tsx
  (app)/history/page.tsx
  (app)/favorites/page.tsx
  (app)/shopping-list/page.tsx
  (app)/profile/page.tsx
  api/generate/route.ts
  api/health/route.ts
  layout.tsx
  middleware.ts
components/
  auth/
  generate/
  recipe/
  shopping/
  ui/
lib/
  supabase/client.ts
  supabase/server.ts
  supabase/middleware.ts
  ai/prompt.ts
  ai/schema.ts
  shopping/merge.ts
  rate-limit.ts
types/
  recipe.ts
  profile.ts
supabase/
  migrations/0001_init.sql
```

Optional: `lib/persona-shortcuts.ts` — curated labels that only prefill `persona_query` (not a separate system).

**State management**

- Server Components load lists/details where possible.  
- Client Components for: generate form, serving scaler, shopping checkboxes, clipboard.  
- No global Redux — React state + Supabase fetches + URL for recipe id.  
- Profile prefs read from DB; cached in layout/session as needed.

**Product language:** all UI copy in **English**.

---

## 11. AI contract (structured output)

Minimum recipe JSON the model must return (Zod-validated):

```ts
{
  title: string
  servings_base: number // int >= 1
  ingredients: { name: string; quantity: number; unit: string }[]
  steps: string[]
  insights: {
    summary: string
    substitutions: { original?: string; replacement: string; reason: string }[]
  }
  persona_applied: boolean
}
```

System prompt duties:

- Culinary tasks only; refuse anything else (guardrail).  
- Respect allergies / diet / goals from profile.  
- If `persona_query` is provided and recognizable, apply that voice (`persona_applied: true`).  
- If not recognizable, produce a solid general recipe that still respects the dietary profile (`persona_applied: false`) — do not fail the request.  
- Always fill `insights` with understandable substitution rationale.

---

## 12. Rate limiting & cost control

- Counter columns on `profiles` (simple, no Redis needed for MVP).  
- Limit checked inside `/api/generate` before calling OpenAI.  
- Model default: `gpt-4o-mini` (override via env `OPENAI_MODEL`).  
- Log token usage later if needed; not required for MVP UI.

---

## 13. Error handling (app-level)

| Case | Behavior |
|---|---|
| Validation error | 400 + field messages |
| AI non-JSON / schema fail | 1 retry; then user-facing “generation failed, try again” |
| Non-culinary prompt | Model/guardrail refusal → 400 with message |
| Unknown / unusable persona | Still return a general profile-based recipe; UI notice (`persona_fallback_used`) |
| Rate limit | 429 + “daily limit reached” |
| RLS / wrong id | Empty/404 — never leak others’ data |

---

## 14. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GENERATIONS_PER_DAY=20
```

Optional: `SUPABASE_SERVICE_ROLE_KEY` only if a trusted server job needs to bypass RLS (avoid in MVP paths).

---

## 15. Deployment topology

```text
Vercel (Next.js)  ←→  Supabase (Auth + Postgres)
       │
       └──→ OpenAI API
```

Local: `.env.local` mirrors Vercel env.  
Prod: same vars in Vercel project settings; Supabase project = production DB.

---

## 16. Locked product decisions

| Topic | Decision |
|---|---|
| UI language | **English** |
| Personas | **Free-text** creator/style; optional UI shortcuts only prefill the field. On fail to apply → **general / profile-based recipe** + user-facing notice (`persona_fallback_used`) |
| Add to shopping list | Use **current scaled servings** (`uiServings`), not `servings_base` |
| Auth (MVP) | **Email + password** only (no OAuth) |

---

## 17. Next document after this

Detailed technical design: [`TECHNICAL_DESIGN.md`](./TECHNICAL_DESIGN.md) (course step 4) — then implementation.
