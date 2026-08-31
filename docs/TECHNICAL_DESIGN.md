# TasteTailor — Detailed Technical Design

Status: reflects the implemented app (updated to match shipped code)
Depends on: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
UI language: English
Auth: email + password

This document describes the app as actually built: folder layout, component contracts, Zod schemas, SQL schema, CRUD matrix, validation rules, and current-UI wireframes. The original version of this document (course step 4) predated a provider switch from OpenAI to Google Gemini and predated several shipped features (recipe refine, cook mode, Unsplash photos, a Gemini fallback model) — this revision replaces it entirely with what's actually in the repository today.

---

## 1. Project folder structure

```text
tastetailor/
├── app/
│   ├── layout.tsx                 # root shell — 3 fonts (Syne display, DM Sans body, Playfair Display logo), MotionConfig
│   ├── page.tsx                   # marketing landing (no route group)
│   ├── globals.css
│   ├── not-found.tsx
│   ├── favicon.ico
│   ├── onboarding/page.tsx        # outside the (app) group
│   ├── (auth)/
│   │   ├── layout.tsx             # centered/split auth chrome; redirects logged-in users away
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx             # app nav; redirects to /onboarding if incomplete
│   │   ├── loading.tsx            # shared spinner fallback
│   │   ├── error.tsx
│   │   ├── generate/page.tsx
│   │   ├── recipes/[id]/page.tsx
│   │   ├── recipes/[id]/not-found.tsx
│   │   ├── history/page.tsx
│   │   ├── history/loading.tsx    # dedicated skeleton grid, not the shared spinner
│   │   ├── favorites/page.tsx
│   │   ├── shopping-list/page.tsx
│   │   └── profile/page.tsx
│   └── api/
│       ├── generate/route.ts
│       ├── recipes/[id]/refine/route.ts
│       └── health/route.ts        # GET, no auth — liveness check, 200 { "ok": true }
├── proxy.ts                        # replaces middleware.ts — Next.js 16 renamed the file/export
│                                    # (`middleware` → `proxy`); confirmed against the real
│                                    # upgrade guide shipped in node_modules/next/dist/docs
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── onboarding/
│   │   └── OnboardingForm.tsx
│   ├── profile/
│   │   ├── PreferencesFields.tsx  # shared field group used by onboarding + profile
│   │   └── ProfileForm.tsx
│   ├── generate/
│   │   ├── GenerateTabs.tsx
│   │   ├── AdaptRecipeForm.tsx
│   │   ├── ScratchDishForm.tsx
│   │   ├── PersonaField.tsx
│   │   └── GeneratingOverlay.tsx
│   ├── recipe/
│   │   ├── RecipeDetailClient.tsx # top-level client orchestrator for the whole page
│   │   ├── RecipeHeader.tsx
│   │   ├── IngredientList.tsx
│   │   ├── StepList.tsx
│   │   ├── InsightsBox.tsx
│   │   ├── ServingScaler.tsx
│   │   ├── FavoriteButton.tsx
│   │   ├── DeleteRecipeButton.tsx
│   │   ├── AddToShoppingListButton.tsx
│   │   ├── RefineChat.tsx
│   │   └── CookModeView.tsx
│   ├── history/
│   │   ├── RecipeCard.tsx
│   │   ├── HistoryFilterChips.tsx
│   │   ├── HistorySkeleton.tsx
│   │   └── Pagination.tsx
│   ├── shopping/
│   │   ├── ShoppingListClient.tsx
│   │   ├── ShoppingListItem.tsx
│   │   ├── ClearListButton.tsx
│   │   └── ExportListButton.tsx
│   ├── layout/
│   │   ├── AppNav.tsx
│   │   ├── SiteHeader.tsx         # marketing/public header (logo + login link)
│   │   ├── Split.tsx              # two-column media/content layout (auth pages)
│   │   ├── PageHeader.tsx
│   │   └── Section.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── TextField.tsx
│       ├── TextArea.tsx
│       ├── Select.tsx
│       ├── CheckboxGroup.tsx
│       ├── Tabs.tsx
│       ├── Spinner.tsx
│       ├── Toast.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts                # RSC / route handler client
│   │   └── middleware.ts            # session refresh + PROTECTED_PREFIXES redirect
│   ├── ai/
│   │   ├── index.ts                 # getRecipeProvider() — picks mock|gemini via AI_PROVIDER
│   │   ├── provider.ts              # ProviderInput, RecipeProvider interface, UpstreamError
│   │   ├── gemini.ts                # real Gemini provider: retry/timeout/combo-matrix/fallback model
│   │   ├── mock.ts                  # deterministic offline provider for tests/dev
│   │   ├── prompt.ts                # system + user/refine/repair/persona-intensify prompt builders
│   │   ├── schema.ts                # AI output Zod schemas
│   │   ├── run-generation.ts        # shared generate/refine → validate → repair-retry pipeline
│   │   ├── rate-limit.ts            # refundGenerationSlot(), generationsPerDay()
│   │   └── log.ts                   # structured aiLog + per-request AsyncLocalStorage context
│   ├── images/
│   │   ├── unsplash.ts              # fetchRecipeImage() — best-effort, never throws
│   │   └── safeRecipeImage.ts       # allowlists local paths + images.unsplash.com only
│   ├── recipes/
│   │   └── chat-log.ts              # appendChatLog(), chatLogForPrompt()
│   ├── security/
│   │   └── isHttpUrl.ts             # gates clickable model-supplied source links
│   ├── generate/
│   │   └── mapApiError.ts           # API error JSON → { fieldErrors, formError } for forms
│   ├── profile/
│   │   ├── get-profile.ts           # getCurrentUserAndProfile()
│   │   └── options.ts               # {value,label} option lists derived from constants.ts
│   ├── shopping/
│   │   ├── merge.ts                 # normalizeName/normalizeUnit/mergeQuantity
│   │   ├── scale.ts                 # roundQuantity/scaleIngredients
│   │   └── exportText.ts            # formatShoppingListForExport
│   ├── validation/
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── generate.ts
│   │   ├── refine.ts
│   │   ├── shopping.ts
│   │   ├── common.ts                 # IngredientInputSchema
│   │   └── zod-issues.ts             # zodIssues() error-shape helper
│   ├── persona-known-creators.ts     # ~55-entry curated list + findKnownCreator()
│   ├── persona-shortcuts.ts          # 5 generic prefill phrases (not a categorized directory)
│   ├── constants.ts                  # diet/allergy/goal enums, limits, chat-log caps
│   └── format.ts                     # formatQuantity()
├── types/
│   ├── recipe.ts                     # Ingredient, RecipeSource, RecipeInsights, ChatLogEntry,
│   │                                  # RecipeRow, RecipeSummary, ShoppingListItemRow
│   └── profile.ts                    # ProfileRow
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql
│       ├── 0002_refund_slot_and_cleanup.sql
│       ├── 0003_recipe_refine_chat_log.sql
│       └── 0004_recipe_images.sql
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TECHNICAL_DESIGN.md
│   ├── PRD.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── PHASE_9_PLAN.md
│   ├── TESTING.md
│   ├── TESTING_MANUAL.md
│   └── UI_CRAFT.md
├── .env.local.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 2. Shared constants & enums

```ts
// lib/constants.ts (verbatim)
export const DIET_TYPES = [
  "none", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "mediterranean",
] as const;

export const ALLERGY_OPTIONS = [
  "gluten", "lactose", "nuts", "peanuts", "eggs", "soy", "shellfish", "fish", "sesame",
] as const;

export const GOAL_OPTIONS = [
  "high_protein", "low_calorie", "low_carb", "high_fiber", "balanced",
] as const;

export const RECIPE_MODES = ["adapt", "scratch"] as const;

export const DEFAULT_GENERATIONS_PER_DAY = 20;
export const HISTORY_PAGE_SIZE = 12;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 24;

/** DB retention cap on recipes.chat_log (~20 user/assistant turn pairs). */
export const MAX_CHAT_LOG_ENTRIES = 40;
/** How many recent chat_log entries are sent back to the model per refine call. */
export const MAX_CHAT_LOG_PROMPT_ENTRIES = 20;

export type DietType = (typeof DIET_TYPES)[number];
export type AllergyOption = (typeof ALLERGY_OPTIONS)[number];
export type GoalOption = (typeof GOAL_OPTIONS)[number];
export type RecipeMode = (typeof RECIPE_MODES)[number];
```

```ts
// lib/persona-shortcuts.ts — UI-only quick-fills, always stored as free-text persona_query
export const PERSONA_SHORTCUTS = [
  "Gourmet / fine dining",
  "High-protein / fitness coach",
  "Plant-based specialist",
  "Weeknight quick & easy",
  "Comfort food classic",
] as const;
```

`lib/persona-known-creators.ts` additionally exports `KNOWN_CREATORS` — a flat array of ~55 `{ name, style, website }` entries backing an HTML `<datalist>` autocomplete on the persona field, plus `findKnownCreator(query)`. There is no category/grouping field on these entries and no browsable "categories" UI anywhere in the app.

`lib/profile/options.ts` derives `{value,label}` option lists (`DIET_TYPE_OPTIONS`, `ALLERGY_CHECKBOX_OPTIONS`, `GOAL_CHECKBOX_OPTIONS`) from the constants above via a `humanizeOption()` helper, for the `Select`/`CheckboxGroup` form controls.

---

## 3. Exact Zod schemas

All request/response validation lives under `lib/validation/` and `lib/ai/schema.ts`. Forms and API share the same schemas.

### 3.1 Common ingredient

```ts
// lib/validation/common.ts
export const IngredientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().finite().positive().max(100_000), // coerces string input
  unit: z.string().trim().max(40).transform((u) => u.toLowerCase()).default(""),
});
export type IngredientInput = z.infer<typeof IngredientInputSchema>;
```

### 3.2 Auth

```ts
// lib/validation/auth.ts
export const SignupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().min(1).max(80).optional(),
});

export const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});
```

### 3.3 Profile / onboarding

```ts
// lib/validation/profile.ts
export const ProfileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(80).nullable().optional(),
  allergies: z.array(z.enum(ALLERGY_OPTIONS)).max(20).default([]),
  diet_type: z.enum(DIET_TYPES).default("none"),
  goals: z.array(z.enum(GOAL_OPTIONS)).max(10).default([]),
  preferences_notes: z.string().trim().max(1000).nullable().optional(),
});

export const OnboardingSchema = ProfileUpdateSchema.superRefine((val, ctx) => {
  if (val.diet_type === "none" && val.allergies.length === 0 &&
      val.goals.length === 0 && !val.preferences_notes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one preference (diet, allergy, goal, or note).",
      path: ["diet_type"],
    });
  }
});
```

### 3.4 Generate API request

**Adapt mode is a single free-text field, not structured title/ingredients/steps** — the model itself parses the paste into structured output.

```ts
// lib/validation/generate.ts
const PersonaQuerySchema = z.string().trim().max(120).nullable().optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const AdaptBodySchema = z.object({
  mode: z.literal("adapt"),
  recipe_text: z.string().trim().min(20).max(20_000),
  persona_query: PersonaQuerySchema,
});

const ScratchBodySchema = z.object({
  mode: z.literal("scratch"),
  dish_name: z.string().trim().min(2).max(160),
  persona_query: PersonaQuerySchema,
});

export const GenerateRequestSchema = z.discriminatedUnion("mode", [
  AdaptBodySchema,
  ScratchBodySchema,
]);
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
```

### 3.5 Refine API request

```ts
// lib/validation/refine.ts
export const RefineRequestSchema = z.object({
  message: z.string().trim().min(2).max(500),
});
export type RefineRequest = z.infer<typeof RefineRequestSchema>;
```

### 3.6 Shopping list item (client upsert payload)

```ts
// lib/validation/shopping.ts
export const ShoppingUpsertItemSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().positive().max(100_000),
  unit: z.string().trim().max(40).default(""),
  source_recipe_id: z.string().uuid().optional(),
});

export const AddRecipeToListSchema = z.object({
  items: z.array(ShoppingUpsertItemSchema).min(1).max(80),
});
```

### 3.7 Validation error shaping

```ts
// lib/validation/zod-issues.ts — used by both API routes to shape 400 responses
export function zodIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
  }));
}
```

### 3.8 AI output (Gemini, not OpenAI — see ARCHITECTURE.md §2)

```ts
// lib/ai/schema.ts
export const RecipeSourceSchema = z.object({
  label: z.string().trim().min(1).max(200),
  url: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(500).optional(),
});

export const InsightsSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  substitutions: z.array(z.object({
    original: z.string().trim().max(200).optional(),
    replacement: z.string().trim().min(1).max(200),
    reason: z.string().trim().min(1).max(500),
  })).max(40).default([]),
  sources: z.array(RecipeSourceSchema).max(20).default([]), // citations from grounded search
});

export const AiRecipeOutputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  servings_base: z.coerce.number().int().min(1).max(24),
  ingredients: z.array(IngredientInputSchema).min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(60),
  insights: InsightsSchema,
  // Both booleans below tolerate the model emitting a string ("true"/"yes") instead
  // of a real boolean — coerced via z.preprocess before validation.
  persona_applied: z.preprocess((v) => {
    if (typeof v === "string") return v.trim().toLowerCase() === "true" || v.trim().toLowerCase().startsWith("yes");
    return v;
  }, z.boolean()),
  refused: z.preprocess((v) => {
    if (typeof v === "string") return ["true", "yes"].includes(v.trim().toLowerCase());
    return v;
  }, z.boolean().optional().default(false)),
  refusal_reason: z.string().trim().max(500).optional(),
  /** Refine calls only — a short human summary of what changed. */
  change_summary: z.string().trim().max(300).optional(),
  /** Fresh generates only — short English photo search phrase for Unsplash. */
  image_query: z.string().trim().min(1).max(120).optional(),
});
export type AiRecipeOutput = z.infer<typeof AiRecipeOutputSchema>;

/** Looser schema accepted when the model refuses — recipe fields may be placeholders. */
export const AiRefusalOutputSchema = z.object({
  refused: z.literal(true),
  refusal_reason: z.string().trim().max(500).optional(),
  title: z.string().optional(),
  servings_base: z.number().optional(),
  ingredients: z.array(z.unknown()).optional(),
  steps: z.array(z.unknown()).optional(),
  insights: z.unknown().optional(),
  persona_applied: z.boolean().optional(),
});
```

---

## 4. Database schema (current, consolidated across all 4 migrations)

Source files: `supabase/migrations/0001_init.sql`, `0002_refund_slot_and_cleanup.sql`, `0003_recipe_refine_chat_log.sql`, `0004_recipe_images.sql`. Shown below as one consolidated "current shape" reference; inline notes mark which migration introduced each later addition.

```sql
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles  (0001)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  allergies text[] not null default '{}',
  diet_type text not null default 'none',
  goals text[] not null default '{}',
  preferences_notes text,
  onboarding_completed boolean not null default false,
  daily_generation_count integer not null default 0,
  generation_count_reset_at timestamptz not null default (date_trunc('day', now() at time zone 'utc') + interval '1 day'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diet_type_check check (
    diet_type in ('none','vegetarian','vegan','pescatarian','keto','paleo','mediterranean')
  ),
  constraint daily_generation_count_nonnegative check (daily_generation_count >= 0)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- recipes  (0001, altered 0003 + 0004)
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  mode text not null,
  persona_query text,
  persona_fallback_used boolean not null default false,
  servings_base integer not null,
  ingredients jsonb not null,
  steps jsonb not null,
  insights jsonb not null,
  source_input jsonb not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  chat_log jsonb not null default '[]'::jsonb,        -- added 0003
  updated_at timestamptz not null default now(),       -- added 0003
  image_url text,                                      -- added 0004
  image_alt text,                                       -- added 0004
  image_credit_name text,                                -- added 0004
  image_credit_url text,                                  -- added 0004
  constraint recipes_mode_check check (mode in ('adapt', 'scratch')),
  constraint recipes_servings_base_check check (servings_base between 1 and 24),
  constraint recipes_title_len check (char_length(title) between 1 and 160),
  constraint recipes_chat_log_is_array check (jsonb_typeof(chat_log) = 'array'),      -- 0003
  constraint recipes_chat_log_len_check check (jsonb_array_length(chat_log) <= 60)    -- 0003
);

create index recipes_user_created_idx on public.recipes (user_id, created_at desc);
create index recipes_user_favorites_idx on public.recipes (user_id, created_at desc) where is_favorite = true;

create trigger recipes_set_updated_at            -- added 0003
before update on public.recipes
for each row execute function public.set_updated_at();

create trigger recipes_cleanup_shopping_list_refs  -- added 0002
after delete on public.recipes
for each row execute function public.strip_deleted_recipe_from_shopping_list();

-- ---------------------------------------------------------------------------
-- shopping_list_items  (0001)
-- ---------------------------------------------------------------------------
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  display_name text not null,
  quantity numeric not null,
  unit text not null default '',
  is_checked boolean not null default false,
  source_recipe_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint shopping_quantity_positive check (quantity > 0),
  constraint shopping_name_len check (char_length(name) between 1 and 120),
  constraint shopping_list_unique_line unique (user_id, name, unit)
);

create index shopping_list_user_checked_idx on public.shopping_list_items (user_id, is_checked);

create trigger shopping_list_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create or replace function public.strip_deleted_recipe_from_shopping_list()  -- added 0002
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.shopping_list_items
  set source_recipe_ids = array_remove(source_recipe_ids, old.id)
  where old.id = any(source_recipe_ids);
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (0001; unchanged since)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- inserts happen via the security-definer handle_new_user trigger; no direct insert policy

create policy "recipes_select_own" on public.recipes for select using (auth.uid() = user_id);
create policy "recipes_insert_own" on public.recipes for insert with check (auth.uid() = user_id);
create policy "recipes_update_own" on public.recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipes_delete_own" on public.recipes for delete using (auth.uid() = user_id);

create policy "shopping_select_own" on public.shopping_list_items for select using (auth.uid() = user_id);
create policy "shopping_insert_own" on public.shopping_list_items for insert with check (auth.uid() = user_id);
create policy "shopping_update_own" on public.shopping_list_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_delete_own" on public.shopping_list_items for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (required for the API to work at all under RLS)
-- ---------------------------------------------------------------------------
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.shopping_list_items to authenticated;
```

### Rate-limit RPC functions

```sql
-- Atomic check-and-increment for generations (0001)
create or replace function public.claim_generation_slot(max_per_day integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ok boolean;
begin
  if uid is null then return false; end if;

  update public.profiles
  set
    daily_generation_count = case
      when generation_count_reset_at <= now() then 1
      else daily_generation_count + 1
    end,
    generation_count_reset_at = case
      when generation_count_reset_at <= now()
        then date_trunc('day', now() at time zone 'utc') + interval '1 day'
      else generation_count_reset_at
    end,
    updated_at = now()
  where id = uid
    and (generation_count_reset_at <= now() or daily_generation_count < max_per_day);

  ok := found;
  return ok;
end;
$$;

revoke all on function public.claim_generation_slot(integer) from public;
grant execute on function public.claim_generation_slot(integer) to authenticated;

-- Atomic decrement on refund — added 0002, called whenever a claimed slot's
-- request ultimately fails (a non-culinary refusal is explicitly NOT refunded)
create or replace function public.refund_generation_slot()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ok boolean;
begin
  if uid is null then return false; end if;

  update public.profiles
  set daily_generation_count = daily_generation_count - 1, updated_at = now()
  where id = uid and daily_generation_count > 0;

  ok := found;
  return ok;
end;
$$;

revoke all on function public.refund_generation_slot() from public;
grant execute on function public.refund_generation_slot() to authenticated;
```

---

## 5. CRUD matrix

| Entity / action | Actor | Where | Create | Read | Update | Delete | Notes |
|---|---|---|---|---|---|---|---|
| Auth user | Anon | Supabase Auth | signup | session | password reset (out of MVP UI) | — | email+password |
| Profile | User | Supabase client | trigger on signup | select own | onboarding + profile form | cascade with auth user | cannot insert manually |
| Recipe (AI generate) | User | `POST /api/generate` | insert after Gemini call | — | — | — | server sets `user_id`; best-effort Unsplash attach |
| Recipe (AI refine) | User | `POST /api/recipes/[id]/refine` | — | (loads recipe + chat_log first) | title/servings/ingredients/steps/insights/chat_log | — | owner-only (404 otherwise) |
| Recipe history | User | Supabase / RSC | — | list paginated | — | — | `order by created_at desc`, page size 12 |
| Recipe detail | User | RSC + client | — | by id | — | — | 404 if RLS hides or not found |
| Favorite toggle | User | client mutation | — | — | `is_favorite` | — | optimistic; reverts on error |
| Recipe delete | User | client mutation | — | — | — | delete row | trigger prunes it from shopping-list `source_recipe_ids` |
| Favorites list | User | RSC | — | filter true | — | — | partial index |
| Shopping item | User | client | upsert merge | list | check / qty | delete row / clear all | unique `(user_id,name,unit)` |
| Generation slot | User | RPC / server | — | — | claim / refund | — | atomic Postgres functions, not app-level counters |

### Pagination

- History & favorites: `range(from, to)` with `HISTORY_PAGE_SIZE = 12`.
- Shopping list: load all items for user (expected small); revisit if >200 rows.

### Idempotent shopping upsert (app logic)

```ts
// lib/shopping/merge.ts (contract)
normalizeName(displayName: string): string  // trim, lower, collapse spaces
normalizeUnit(unit: string): string         // trim, lower; "" if empty
mergeQuantity(existing: number, add: number): number  // existing + add

// Upsert key: (user_id, normalizeName(display_name), normalizeUnit(unit))
// On conflict: quantity = mergeQuantity(...); no unit conversion — a different
// unit for the same ingredient always produces a separate row.
```

Scale before upsert:

```ts
// lib/shopping/scale.ts
roundQuantity(n: number): number  // round to 2 decimals
scaleIngredients(ingredients, servingsBase, uiServings): Ingredient[]
// quantity' = roundQuantity(quantity * uiServings / servingsBase)
```

---

## 6. API design (detailed)

### `GET /api/health`

**Auth:** none. Liveness check only — confirms the app process is running, no external calls (no Supabase, no Gemini).

Response `200`: `{ "ok": true }`

### `POST /api/generate`

**Auth:** session cookie via `getCurrentUserAndProfile()` (Supabase server client).

**Steps (server, in order):**

1. `getCurrentUserAndProfile()` → `401 unauthorized` if no user or no profile row.
2. `!profile.onboarding_completed` → `403 onboarding_required`.
3. Parse JSON body → `400 invalid_json` on throw.
4. `GenerateRequestSchema.safeParse` → `400 validation_error` + `issues` (via `zodIssues()`) on failure.
5. `supabase.rpc("claim_generation_slot", { max_per_day: generationsPerDay() })` → `500 server_error` on RPC error; `429 rate_limited` if it returns false.
6. Build `systemPrompt`/`userPrompt` (`lib/ai/prompt.ts`).
7. `getRecipeProvider()` (picks mock/Gemini via `AI_PROVIDER`) → on throw, refund the slot, `500 server_error`.
8. `runRecipeGeneration({ provider, systemPrompt, userPrompt })` — shared pipeline: call provider → Zod-validate → one repair-retry on failure → classify outcome. A non-`success` outcome is mapped by `outcomeToErrorResponse()`.
9. On success: compute `persona_fallback_used = Boolean(persona_query) && !ai.persona_applied`.
10. Kick off (don't yet await) a best-effort Unsplash lookup keyed on `ai.image_query || ai.title`.
11. Insert the `recipes` row (`user_id, title, mode, persona_query, persona_fallback_used, servings_base, ingredients, steps, insights, source_input` = the full validated request, `is_favorite: false`) → on insert failure or no row, refund the slot, `500 server_error`.
12. Await the image lookup; if a photo was found, `UPDATE` the row's `image_*` columns (failure here just logs a warning — never fails the request; if no Unsplash key is configured, this is skipped entirely).
13. Return `201` with the full recipe row (image fields included, possibly null).

**Every possible error response:**

| Status | error code | When |
|---|---|---|
| 401 | `unauthorized` | no authenticated user or profile |
| 403 | `onboarding_required` | onboarding not completed |
| 400 | `invalid_json` | body isn't valid JSON |
| 400 | `validation_error` | body fails `GenerateRequestSchema` (`issues` array included) |
| 500 | `server_error` | `claim_generation_slot` RPC error, provider misconfigured, or recipe insert failure |
| 429 | `rate_limited` | daily generation cap reached |
| 503 | `ai_unavailable` | Gemini overloaded/timeout (transient 429/502/503/504, or no response before the retry budget is exhausted) |
| 400 | `non_culinary` | model refused (includes a `reason`; slot **not** refunded) |
| 422 | `invalid_ai_output` | AI output still fails schema after the repair retry (slot refunded) |

**Request — adapt mode** (one free-text field):

```json
{
  "mode": "adapt",
  "recipe_text": "Classic beef lasagna: layer pasta sheets with ground beef ragu, bechamel, and mozzarella. Bake 45 minutes at 375F until bubbly and golden.",
  "persona_query": "high protein, low carb"
}
```

**Request — scratch mode:**

```json
{ "mode": "scratch", "dish_name": "Thai green curry with tofu", "persona_query": null }
```

**Success response (`201`):**

```json
{
  "recipe": {
    "id": "uuid", "title": "string", "mode": "adapt | scratch",
    "servings_base": 4, "ingredients": [], "steps": [], "insights": {},
    "persona_query": "string | null", "persona_fallback_used": false,
    "is_favorite": false, "chat_log": [],
    "created_at": "timestamptz", "updated_at": "timestamptz",
    "image_url": "string | null", "image_alt": "string | null",
    "image_credit_name": "string | null", "image_credit_url": "string | null"
  }
}
```

### `POST /api/recipes/[id]/refine`

**Auth:** same as above, plus the recipe must exist and belong to the caller.

**Steps (server, in order):**

1. `getCurrentUserAndProfile()` → `401` if missing.
2. `!onboarding_completed` → `403`.
3. Fetch the target recipe (`id, title, servings_base, ingredients, steps, persona_query, chat_log`) filtered by both `id` and `user_id` → `404 not_found` if missing/not owned.
4. Parse JSON → `400 invalid_json`.
5. `RefineRequestSchema.safeParse` → `400 validation_error`.
6. Claim a generation slot exactly as `/api/generate` → `500`/`429` on failure.
7. Build `systemPrompt`/`userPrompt` via `buildRefinePrompt(profile, recipe, recipe.chat_log, message)`.
8. `getRecipeProvider()` → refund + `500` on throw.
9. `runRecipeGeneration(...)` — identical shared pipeline as generate.
10. On success: `appendChatLog(recipe.chat_log ?? [], message, ai.change_summary ?? ai.insights.summary)` (caps at `MAX_CHAT_LOG_ENTRIES = 40`, keeping the newest).
11. `UPDATE` the recipe's `title, servings_base, ingredients, steps, insights, chat_log` (filtered by `id` + `user_id`) → refund + `500` on failure.
12. Return `200` with the updated recipe. **Never touches the `image_*` columns.**

**Every possible error response:** same table as `/api/generate`, plus `404 not_found` (recipe missing or not owned) in place of any create-time concerns.

**Request** (the entire body — the recipe id comes from the URL path):

```json
{ "message": "Make it dairy-free and cut the sodium in half." }
```

**Success response (`200`):** same shape as generate's response, minus the four `image_*` fields (this select list omits them).

**Guardrail prompt rules (`lib/ai/prompt.ts`, shared by both routes):**

- Only culinary recipe generation/adaptation/refinement.
- Obey allergies (hard exclude), diet_type, goals.
- If `persona_query` is set: apply it if recognizable; else set `persona_applied: false` and still produce a strong general recipe matching the profile.
- Never invent medical claims.
- Output must match the JSON schema exactly (coercions in §3.8 exist specifically because the model doesn't always emit perfectly-typed values).

---

## 7. Component APIs (folder-level)

Props are TypeScript contracts. Client components marked `"use client"`.

### Auth (`components/auth/`)

```ts
// LoginForm.tsx — "use client"
type LoginFormProps = { redirectTo?: string };
// Validates LoginSchema → supabase.auth.signInWithPassword.
// A local safeRedirectPath() guards redirectTo against "//" / "/\" open-redirect
// values before ever passing it to router.push.
// On success without a safe redirectTo: checks profiles.onboarding_completed
// to route to /generate or /onboarding.

// SignupForm.tsx — "use client"
type SignupFormProps = { redirectTo?: string }; // default "/onboarding"
// Validates SignupSchema → supabase.auth.signUp({ email, password,
// options: { data: { display_name } } }) → router.push(redirectTo).
```

### Onboarding / Profile

```ts
// components/onboarding/OnboardingForm.tsx — "use client"
type Props = { initial: ProfileRow | null };
// Wraps PreferencesFields; validates OnboardingSchema → updates profiles,
// sets onboarding_completed: true → router.push("/generate").

// components/profile/PreferencesFields.tsx — "use client"
type PreferencesValues = {
  display_name: string; diet_type: DietType;
  allergies: string[]; goals: string[]; preferences_notes: string;
};
type Props = {
  values: PreferencesValues;
  onChange: (next: PreferencesValues) => void;
  errors?: Record<string, string>;
};
// Shared field group: name, diet Select, allergy/goal CheckboxGroups, notes TextArea.

// components/profile/ProfileForm.tsx — "use client"
type Props = { initial: ProfileRow };
// Same fields via PreferencesFields; validates ProfileUpdateSchema (no
// superRefine — an empty profile is allowed here); shows an inline
// "Preferences saved." success line instead of navigating away.
```

### Generate (`components/generate/`)

```ts
// GenerateTabs.tsx
type Props = { defaultTab?: "adapt" | "scratch" };
// Renders AdaptRecipeForm | ScratchDishForm inside a Tabs bar.

// AdaptRecipeForm.tsx — "use client"
type Props = { onGenerated?: (recipeId: string, fallback: boolean) => void };
// ONE TextArea ("Paste a recipe") + PersonaField → POST /api/generate with
// { mode: "adapt", recipe_text, persona_query } → router.push(`/recipes/${id}`).
// No separate ingredient/step row inputs.

// ScratchDishForm.tsx — "use client"
type Props = { onGenerated?: (recipeId: string, fallback: boolean) => void };
// ONE TextField ("Dish name") + PersonaField → POST /api/generate with
// { mode: "scratch", dish_name, persona_query }.

// PersonaField.tsx — "use client"
type Props = { value: string; onChange: (value: string) => void; error?: string };
// TextField with a <datalist> of KNOWN_CREATORS + quick-pick buttons from
// PERSONA_SHORTCUTS (both forms show a GeneratingOverlay while loading).

// GeneratingOverlay.tsx — "use client"
type Props = { open: boolean };
// Full-screen animated modal cycling reassurance messages every 3.2s;
// swaps to "taking longer than usual" messaging after 60s.
```

### Recipe detail (`components/recipe/`)

```ts
// RecipeDetailClient.tsx — "use client" — top-level orchestrator
type Props = {
  recipeId: string; title: string; mode: "adapt" | "scratch";
  servingsBase: number; personaQuery: string | null; personaFallbackUsed: boolean;
  isFavorite: boolean; ingredients: Ingredient[]; steps: string[];
  insights: RecipeInsights; chatLog: ChatLogEntry[];
  imageUrl?: string | null; imageAlt?: string | null;
  imageCreditName?: string | null; imageCreditUrl?: string | null;
};
// Owns: recipe state (replaced wholesale on a successful refine), uiServings,
// cook-mode toggle, toast state, and submitRefine() — POSTs to
// /api/recipes/[id]/refine and swaps in the response.

// RecipeHeader.tsx
type Props = {
  recipeId: string; title: string; mode: "adapt" | "scratch"; servingsBase: number;
  personaQuery: string | null; isFavorite: boolean; onCookMode?: () => void;
};
// "← History" link + Cook mode / FavoriteButton / DeleteRecipeButton cluster + title/meta.

// ServingScaler.tsx — "use client"
type Props = {
  servingsBase: number; value: number; onChange: (n: number) => void;
  min?: number; max?: number; // default MIN_SERVINGS/MAX_SERVINGS (1/24)
};
// −/+ stepper; a "Reset to {base}" link appears only when value !== servingsBase.

// IngredientList.tsx
type Props = { ingredients: Ingredient[]; servingsBase: number; uiServings: number };
// Renders scaleIngredients(...) output.

// StepList.tsx
type Props = { steps: string[] };
// Numbered ordered list.

// InsightsBox.tsx (re-exports isHttpUrl)
type Props = {
  insights: RecipeInsights; fallbackUsed?: boolean; personaQuery?: string | null;
  onRetryPersona?: () => void; retryLoading?: boolean;
};
// Optional persona-fallback callout with a "Try again" button (re-triggers a
// refine asking the model to search again) → optional Sources list (links
// gated by isHttpUrl, else plain text) → always-present summary + substitutions.

// FavoriteButton.tsx — "use client"
type Props = { recipeId: string; isFavorite: boolean };
// Optimistic toggle of recipes.is_favorite; reverts state on error.

// DeleteRecipeButton.tsx — "use client"
type Props = { recipeId: string; title: string };
// window.confirm() → delete from recipes → router.push("/history").

// AddToShoppingListButton.tsx — "use client"
type Props = {
  recipeId: string; ingredients: Ingredient[]; servingsBase: number; uiServings: number;
};
// Scales ingredients → normalize/merge (lib/shopping/merge) → upsert on
// onConflict: "user_id,name,unit" → Toast + "View list" link to /shopping-list.

// RefineChat.tsx — "use client"
type Props = {
  chatLog: ChatLogEntry[]; loading: boolean; error: string | null;
  onSubmit: (message: string) => Promise<boolean>;
};
// Renders the running "You: … / TasteTailor: …" log (or placeholder guidance
// text when empty) + a TextArea + "Update recipe" submit button.

// CookModeView.tsx — "use client"
type Props = {
  title: string; servings: number; ingredients: Ingredient[]; servingsBase: number;
  steps: string[]; onClose: () => void;
};
// Full-viewport dialog overlay (Escape/Exit button to close, locks body scroll,
// print-friendly): checkable scaled ingredients + clickable-to-strike steps,
// sticky header with a "Print" button (window.print()).
```

### Shopping (`components/shopping/`)

```ts
// ShoppingListClient.tsx — "use client"
type Props = { initialItems: ShoppingListItemRow[] };
// Owns optimistic toggle/delete state; splits rows into "To buy"/"Already have";
// renders EmptyState when the list is empty.

// ShoppingListItem.tsx — "use client"
type Props = {
  item: ShoppingListItemRow;
  onToggle: (checked: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
};
// Checkbox + "{qty} {unit} {display_name}" (strikethrough when checked) + Remove.

// ClearListButton.tsx — "use client"
type Props = { onCleared: () => void };
// window.confirm() → delete all shopping_list_items rows for the user.

// ExportListButton.tsx — "use client"
type Props = { items: ShoppingListItemRow[] };
// clipboard.writeText(formatShoppingListForExport(items)) → Toast "Copied to clipboard.".
```

### History (`components/history/`)

```ts
// RecipeCard.tsx
type RecipeCardProps = RecipeSummary & { imagePosition?: string };
// Full-card link to /recipes/[id]: cover image (safeRecipeImageSrc), favorite
// badge, title, formatted date, mode pill ("Adapted"/"From scratch").

// HistoryFilterChips.tsx
export type HistoryFilter = "all" | "adapt" | "scratch" | "favorites";
type Props = { active: HistoryFilter };
// Pill/tab links driving ?filter= on /history.

// Pagination.tsx
type Props = {
  basePath: string; page: number; hasNext: boolean;
  query?: Record<string, string | undefined>;
};
// "← Previous" / "Next →" links, preserving other query params (e.g. filter).

// HistorySkeleton.tsx
// RecipeCardSkeleton(): no props. HistoryGridSkeleton({ count?: number }, default 6).
```

### Layout (`components/layout/`)

```ts
// AppNav.tsx — "use client", no props
// Sticky authenticated header. Desktop order: Generate → History → Favorites
// → List → Profile → Sign out. Collapses to a slide-in drawer on mobile
// (closes on Escape/backdrop/route change).

// SiteHeader.tsx
type Props = { variant?: "light" | "on-photo" };
// Public/marketing header: "TasteTailor" wordmark (Playfair Display) + Log in link.

// Split.tsx
type Props = {
  media: ReactNode; children: ReactNode;
  mediaSide?: "left" | "right"; className?: string;
};
// Two-column media/content grid (used by the (auth) layout for login/signup).

// PageHeader.tsx
type Props = { eyebrow?: string; title: string; lede?: string; children?: ReactNode };

// Section.tsx
type Props = { children: ReactNode; className?: string; contained?: boolean; id?: string };
```

### UI primitives (`components/ui/`)

```ts
Button        { children, variant?: "primary"|"secondary"|"ghost", loading?: boolean } & ButtonHTMLAttributes
TextField     { label, error? } & InputHTMLAttributes
TextArea      { label, error? } & TextareaHTMLAttributes
Select        { label, options: {value,label}[], error? } & SelectHTMLAttributes
CheckboxGroup { label, options: {value,label}[], values: string[], onChange, error?, name }
Tabs          { items: {id,label}[], value: string, onChange, children }
Spinner       { label?: string }              // default "Loading"
Toast         { message: string | null, onDismiss, tone?: "info"|"error"|"success" }  // auto-dismiss 4s
EmptyState    { title, description?, actionHref?, actionLabel?, children?, showImage? }
```

---

## 8. State management rules

| Concern | Where state lives |
|---|---|
| Session | Supabase cookie + `proxy.ts` → `lib/supabase/middleware.ts` |
| Protected-route redirect | `lib/supabase/middleware.ts` (`PROTECTED_PREFIXES` list) |
| Onboarding gate | `(app)/layout.tsx` server load of `onboarding_completed` (not the middleware) |
| Generate forms | Local React state (`AdaptRecipeForm`/`ScratchDishForm`) |
| Recipe detail (title, ingredients, steps, insights, chat_log) | Local React state in `RecipeDetailClient`, replaced wholesale on a successful refine |
| `uiServings` | Local React state on the recipe page (init = `servings_base`) |
| Cook mode | Local boolean in `RecipeDetailClient` — an overlay, not a route |
| History/favorites lists | RSC fetch; pagination + filter via `?page=`/`?filter=` search params |
| Shopping list | RSC initial load + `ShoppingListClient` local optimistic state |
| Toasts | Local component state (`Toast` component), not a global context |

No Redux/Zustand — React state + Supabase fetches + URL search params.

---

## 9. Validation rules (summary checklist)

### Auth
- Email valid; password ≥ 8 chars on signup.
- Login: generic error ("Invalid email or password") — never leaks which field failed.

### Onboarding
- At least one of: non-`none` diet, allergy, goal, or notes.
- Arrays only from allowed enums.

### Generate — adapt
- `recipe_text`: 20–20,000 chars, trimmed. **Not** a structured title/ingredients/steps form — the model parses the paste.
- `persona_query` optional, max 120 chars.

### Generate — scratch
- `dish_name`: 2–160 chars, trimmed.

### Refine
- `message`: 2–500 chars, trimmed.
- Recipe must exist and belong to the caller.

### Serving scale
- Integer clamps `[MIN_SERVINGS, MAX_SERVINGS]` = `[1, 24]`.
- Display quantities rounded to 2 decimals.

### Shopping
- Merge only on normalized `(name, unit)` — confirmed as intentional, tested behavior; different units never merge, with no unit conversion anywhere.
- Quantity always `> 0`.
- Export includes both sections: "To buy" and "Already have".

### AI output
- Schema must pass Zod (with string→boolean/number coercions) before use.
- One repair retry on failure.
- `refused` → no insert/update, and the claimed generation slot is **not** refunded.
- A busy/overloaded upstream (`ai_unavailable`) **does** refund the slot and may retry once against `GEMINI_FALLBACK_MODEL` if configured.

---

## 10. Error handling UX

| Code / case | User-facing copy (English) |
|---|---|
| 400 `validation_error` | Inline field errors from Zod |
| 400 `invalid_json` | "Something went wrong. Please try again." (generic fallback) |
| 400 `non_culinary` | "TasteTailor only generates recipes. Try a dish or recipe instead." |
| 401 | Redirect to `/login` |
| 403 `onboarding_required` | Redirect to `/onboarding` |
| 404 `not_found` (refine) | "Recipe not found." |
| 429 `rate_limited` | "Daily generation limit reached. Come back tomorrow." |
| 422 `invalid_ai_output` | "Couldn't build a valid recipe. Please try again." |
| 503 `ai_unavailable` | "The AI service is temporarily busy. Please try again in a moment." |
| 500 / network | "Something went wrong. Please try again." |
| Persona fallback | Banner in `InsightsBox`: couldn't apply "{query}" — general profile-based recipe instead, with a "Try again" retry |
| Empty history / favorites / shopping list | `EmptyState` → CTA to `/generate` |

---

## 11. UX wireframes (current, as implemented)

ASCII wireframes reflecting the real shipped layout — not final pixel design, but structurally accurate (real copy, real sections, real nav order). Colors: warm cream background (`#F9F6F0`), terracotta accent (`#C84C09`), white/soft-shadow input fields; fonts: Syne (headings), DM Sans (body), Playfair Display (logo only).

### 11.1 Landing `/`

```text
┌──────────────────────────────────────────────────────┐
│ TasteTailor (Playfair Display)             Log in    │  ← on full-bleed photo
│                                                        │
│                    TasteTailor                        │  ← huge Playfair wordmark
│              Recipes fitted to how you eat.            │
│           [ Get started ]   [ Log in ]                 │
├──────────────────────────────────────────────────────┤
│ HOW IT WORKS                                          │
│ Paste, fit, cook.                                      │
│ 01 Adapt        02 Fit           03 Cook               │
├──────────────────────────────────────────────────────┤
│ EXAMPLE FIT                    Before      Fitted      │
│ Same dish. Made for you.       (pasta)     (dairy-free)│
│ ...                                                    │  ← last section; no
└──────────────────────────────────────────────────────┘    closing CTA or footer
```

### 11.2 Login `/login`

```text
┌───────────────────┬──────────────────────────────────┐
│ (full-bleed photo) │  TasteTailor (mobile-only, small)│
│  TasteTailor        │  ┌──────────────────────────┐   │
│                      │  │ Log in                    │   │
│                      │  │ Welcome back — continue   │   │
│  Recipes fitted to   │  │ to your kitchen.           │   │
│  how you eat.        │  │ Email    [___________]    │   │
│  (hidden on mobile)  │  │ Password [___________]    │   │
│                      │  │ [ Log in ]                │   │
│                      │  │ No account yet? Sign up   │   │
│                      │  └──────────────────────────┘   │
└───────────────────┴──────────────────────────────────┘
```

### 11.3 Signup `/signup`

Same `Split` shell as login. Card: "Create account" / "Set up TasteTailor with email and password." → Display name (optional), Email, Password → "Create account" button → "Already have an account? Log in".

### 11.4 Onboarding `/onboarding`

```text
┌──────────────────────────────────────────────┐
│ TASTETAILOR                                   │
│ Tell us how you eat                            │
│ We use this once to shape every recipe...      │
├──────────────────────────────────────────────┤
│ Display name        [_____________________]   │
│ Diet type            [ No specific diet  ▾]    │
│ Allergies    [Gluten][Lactose][Nuts][Peanuts]  │
│              [Eggs][Soy][Shellfish][Fish][...] │
│ Goals        [High Protein][Low Calorie][...]  │
│ Notes (opt.) [_____________________________]   │
│              [ Save and continue ]              │
└──────────────────────────────────────────────┘
```

### 11.5 Generate `/generate`

```text
┌──────────────────────────────────────────────────────────────┐
│ TasteTailor    Generate History Favorites List Profile SignOut│ ← AppNav
├──────────────────────────────────────────┬───────────────────┤
│ CREATE                                    │ (food photo)      │
│ Generate                                  │                   │
│ Paste a recipe to adapt, or start from    │  ┌─────────────┐  │
│ a dish name...                            │  │ Tips (glass)│  │
│ [ Adapt recipe ][ From scratch ]          │  │ • Paste the │  │
│ Paste a recipe                            │  │   full block│  │
│ [ multi-line paste box               ]    │  │ • Name a    │  │
│ Creator or style (optional)               │  │   creator   │  │
│ [___________________________]             │  │ • Profile   │  │
│ [Gourmet][High-protein][Plant-based][...] │  │   applied   │  │
│ [ Generate recipe ]                       │  └─────────────┘  │
└──────────────────────────────────────────┴───────────────────┘
```

("From scratch" tab swaps the paste box for a single "Dish name" field — same Creator/style row below either tab.)

### 11.6 Recipe detail `/recipes/[id]`

```text
┌──────────────────────────────────────────────────────────────┐
│ ← History              [Cook mode] [♥] [Delete]               │
│ Adapted recipe · base 4 servings · Ottolenghi                 │
│ Dairy-free tomato pasta                                       │
├──────────────────────────────────────────────────────────────┤
│ (hero photo strip — "Photo by X on Unsplash" if credited)     │
├───────────────────────────────┬────────────────────────────────┤
│ Servings  [ − ] 4 [ + ]  Reset │ Steps                          │
│ Ingredients                    │ 01 ...                         │
│  • ...                         │ 02 ...                         │
│ [ Add to shopping list ]       │ Insights                       │
│   View list                    │  (fallback banner if needed)   │
│                                 │  Sources: ...                  │
│                                 │  summary + substitutions       │
│                                 │ Refine this recipe             │
│                                 │  You: ... / TasteTailor: ...   │
│                                 │  [ change request... ]         │
│                                 │  [ Update recipe ]             │
└───────────────────────────────┴────────────────────────────────┘
                     (toast appears bottom-of-page on actions)
```

Clicking "Cook mode" replaces the whole viewport with a full-screen dialog: sticky header ("Cook mode · N servings" / title / Print / Exit), then a two-column checklist (ingredients) + clickable-to-strike steps.

### 11.7 History `/history`

```text
┌──────────────────────────────────────────────┐
│ LIBRARY                                       │
│ History                                       │
│ [All] [Adapted] [From scratch] [Favorites]    │
│ ┌────────┐ ┌────────┐ ┌────────┐              │
│ │ photo  │ │ photo  │ │ photo  │  ♥ badge on   │
│ │ Title  │ │ Title  │ │ Title  │  favorited    │
│ │ date · Adapted │  date · Scratch │ ...        │
│ └────────┘ └────────┘ └────────┘              │
│              ← Previous   Next →              │
└──────────────────────────────────────────────┘
```

Empty state: "No recipes yet" / filtered variant, CTA to `/generate` or "Show all".

### 11.8 Favorites `/favorites`

Same card grid/pagination as History, no filter chips (implicitly `is_favorite = true`). Eyebrow "Library", title "Favorites".

### 11.9 Shopping list `/shopping-list`

```text
┌──────────────────────────────────────────────┐
│ SHOP                                          │
│ Shopping list                                 │
│ N items                  [ Export ][ Clear all ]│
│ TO BUY                                        │
│ [ ] 5 onion                          Remove   │
│ [ ] 3 cup flour                      Remove   │
│ ALREADY HAVE                                  │
│ [x] 2 eggs                           Remove   │
└──────────────────────────────────────────────┘
```

Empty state: "List is empty" + CTA to `/generate`.

### 11.10 Profile `/profile`

```text
┌──────────────────────────────────────────────┐
│ ACCOUNT                                       │
│ Your preferences                              │
│ ┌────────────────────────────────────────┐   │
│ │ (same fields as onboarding)             │   │
│ │ [ Save changes ]                        │   │
│ │ Preferences saved. (on success)         │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### 11.11 App nav (every authenticated page)

Desktop: `TasteTailor | Generate  History  Favorites  List  Profile  Sign out` (sticky, active link underlined). Mobile: hamburger → right-side slide-in drawer with the same 5 links + Sign out, closes on Escape/backdrop/route change.

### 11.12 Motion

Shipped: generate pending overlay (with a "taking longer than usual" state after 60s), homepage hero fade-ups, mobile nav drawer slide, various card/panel fade-ins. Known gap: a couple of these (the primary button's loading pulse, the nav drawer backdrop) animate pure opacity/scale, which `MotionConfig reducedMotion="user"` does not suppress — `prefers-reduced-motion` isn't fully honored for those specific elements.

---

## 12. Route gates (proxy + layouts)

Unlike the original plan, this is **not** one `middleware.ts` file — Next.js 16 renamed the convention to `proxy.ts`, and the onboarding/auth-page redirects actually live in server layouts, not the proxy:

```ts
// proxy.ts (root) — delegates entirely to:
// lib/supabase/middleware.ts → updateSession(request)
//   - refreshes the Supabase session cookie
//   - if (!user && pathname matches PROTECTED_PREFIXES) redirect("/login")
//     PROTECTED_PREFIXES = ["/generate","/favorites","/history","/profile",
//                           "/recipes","/shopping-list","/onboarding"]

// app/(auth)/layout.tsx (server)
//   - if (session) redirect to /generate or /onboarding — keeps logged-in
//     users off /login and /signup

// app/(app)/layout.tsx (server)
//   - if (!profile.onboarding_completed) redirect("/onboarding")

// app/onboarding/page.tsx (server)
//   - if (!user) redirect("/login")
//   - if (profile.onboarding_completed) redirect("/generate")
```

The profile's `onboarding_completed` flag is only ever read in these server layouts/pages, not in `proxy.ts` — keeping the proxy itself limited to session refresh + coarse path gating.

---

## 13. Client helpers (contracts)

```ts
// lib/shopping/scale.ts
export function roundQuantity(n: number): number;
export function scaleIngredients(
  ingredients: IngredientInput[], servingsBase: number, uiServings: number,
): IngredientInput[];

// lib/shopping/exportText.ts
export function formatShoppingListForExport(
  items: { display_name: string; quantity: number; unit: string; is_checked: boolean }[],
): string;
// Example:
// Shopping list - TasteTailor
// To buy:
// - 5 onion
// - 3 cup flour
// Already have:
// - 2 eggs

// lib/format.ts
export function formatQuantity(n: number): string; // 2.5 → "2.5"; 2.0 → "2"

// lib/recipes/chat-log.ts
export function appendChatLog(
  existing: ChatLogEntry[], userMessage: string, assistantMessage: string,
): ChatLogEntry[]; // adds a {user, assistant} pair, caps at MAX_CHAT_LOG_ENTRIES (40)
export function chatLogForPrompt(chatLog: ChatLogEntry[]): ChatLogEntry[];
// trims to MAX_CHAT_LOG_PROMPT_ENTRIES (20), newest last
```

---

## 14. TypeScript DB row shapes

```ts
// types/profile.ts
export type ProfileRow = {
  id: string;
  display_name: string | null;
  allergies: string[];
  diet_type: string;
  goals: string[];
  preferences_notes: string | null;
  onboarding_completed: boolean;
  daily_generation_count: number;
  generation_count_reset_at: string;
  created_at: string;
  updated_at: string;
};

// types/recipe.ts
export type Ingredient = { name: string; quantity: number; unit: string };

export type RecipeSource = { label: string; url?: string; note?: string };

export type RecipeInsights = {
  summary: string;
  substitutions: { original?: string; replacement: string; reason: string }[];
  sources?: RecipeSource[];
};

export type ChatLogEntry = { role: "user" | "assistant"; message: string; created_at: string };

export type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  mode: "adapt" | "scratch";
  persona_query: string | null;
  persona_fallback_used: boolean;
  servings_base: number;
  ingredients: Ingredient[];
  steps: string[];
  insights: RecipeInsights;
  source_input: Record<string, unknown>;
  is_favorite: boolean;
  chat_log: ChatLogEntry[];
  image_url: string | null;
  image_alt: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeSummary = {
  id: string; title: string; created_at: string; is_favorite: boolean;
  mode: "adapt" | "scratch"; image_url?: string | null; image_alt?: string | null;
};

export type ShoppingListItemRow = {
  id: string; user_id: string; name: string; display_name: string;
  quantity: number; unit: string; is_checked: boolean;
  source_recipe_ids: string[]; updated_at: string;
};
```

---

## 15. Testing

The full automated test spec, IDs, and how-to-run instructions live in [`docs/TESTING.md`](./TESTING.md) — a large, implemented suite (Vitest unit/API + Playwright E2E + a client-bundle secret scan), not a future step. Two items remain intentionally manual; see [`docs/TESTING_MANUAL.md`](./TESTING_MANUAL.md).

---

## 16. Implementation order (as it actually happened)

1. Scaffold Next.js + env example + Supabase clients
2. Apply `0001_init.sql` + Auth pages
3. Onboarding + route gates
4. Generate API + recipe detail (scaler, insights) — originally against OpenAI, switched to Gemini during this phase
5. History + favorites
6. Shopping list merge + export
7. Recipe refine (chat) + cook mode + Unsplash image attach — not in the original plan, added afterward
8. Polish empty states / errors / reduced motion
9. Full automated test suite (Vitest + Playwright) — see `docs/TESTING.md`
10. Deploy Vercel + Supabase

---

## 17. Traceability to course step 4

| Required topic | Section |
|---|---|
| Folder structure | §1 |
| Central components | §7 |
| Database structure | §4 |
| CRUD operations | §5 |
| API description | §6 |
| Business logic | §6 + ARCHITECTURE.md §6 |
| State management | §8 |
| Error handling | §10 |
| Input validation | §3, §9 |
| UX of core flows | §11 |
