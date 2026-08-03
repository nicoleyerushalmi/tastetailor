# TasteTailor — Detailed Technical Design

Status: draft for MVP (course step 4)  
Depends on: [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
UI language: English  
Auth: email + password  

This document is the implementation blueprint: folder layout, component contracts, Zod schemas, SQL DDL, CRUD matrix, validation rules, and UX wireframe notes. Implement against this file; change architecture first if scope shifts.

---

## 1. Project folder structure

```text
tastetailor/
├── app/
│   ├── layout.tsx                 # root shell, fonts, providers
│   ├── page.tsx                   # marketing landing
│   ├── globals.css
│   ├── middleware.ts              # session refresh + route gates
│   ├── (auth)/
│   │   ├── layout.tsx             # centered auth chrome
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx             # app nav (History, Favorites, List, Profile)
│   │   ├── onboarding/page.tsx
│   │   ├── generate/page.tsx
│   │   ├── recipes/[id]/page.tsx
│   │   ├── history/page.tsx
│   │   ├── favorites/page.tsx
│   │   ├── shopping-list/page.tsx
│   │   └── profile/page.tsx
│   └── api/
│       ├── generate/route.ts
│       └── health/route.ts
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── onboarding/
│   │   └── OnboardingForm.tsx
│   ├── generate/
│   │   ├── GenerateTabs.tsx
│   │   ├── AdaptRecipeForm.tsx
│   │   ├── ScratchDishForm.tsx
│   │   └── PersonaField.tsx
│   ├── recipe/
│   │   ├── RecipeHeader.tsx
│   │   ├── IngredientList.tsx
│   │   ├── StepList.tsx
│   │   ├── InsightsBox.tsx
│   │   ├── ServingScaler.tsx
│   │   ├── FavoriteButton.tsx
│   │   └── AddToShoppingListButton.tsx
│   ├── history/
│   │   └── RecipeCard.tsx
│   ├── shopping/
│   │   ├── ShoppingListView.tsx
│   │   ├── ShoppingListItemRow.tsx
│   │   └── ExportListButton.tsx
│   ├── profile/
│   │   └── ProfileForm.tsx
│   ├── layout/
│   │   ├── AppNav.tsx
│   │   └── AuthGateMessage.tsx
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
│   │   ├── client.ts              # browser client
│   │   ├── server.ts              # RSC / route handler client
│   │   └── middleware.ts          # cookie session helper
│   ├── ai/
│   │   ├── prompt.ts              # system + user prompt builders
│   │   ├── openai.ts              # OpenAI client wrapper
│   │   └── schema.ts              # AI output Zod (+ parse helpers)
│   ├── shopping/
│   │   ├── merge.ts               # normalize name/unit + merge math
│   │   ├── scale.ts               # scaleIngredients(ings, base, ui)
│   │   └── exportText.ts          # clipboard payload formatter
│   ├── validation/
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── generate.ts
│   │   └── common.ts              # IngredientInputSchema, etc.
│   ├── rate-limit.ts
│   ├── persona-shortcuts.ts       # optional prefills only
│   ├── constants.ts               # GENERATIONS_PER_DAY defaults, diet enums
│   └── format.ts                  # quantity display rounding
├── types/
│   ├── database.ts                # generated or hand-written DB row types
│   ├── recipe.ts
│   └── profile.ts
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
├── docs/
│   ├── ARCHITECTURE.md
│   └── TECHNICAL_DESIGN.md
├── .env.local.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 2. Shared constants & enums

```ts
// lib/constants.ts
export const DIET_TYPES = [
  "none",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "paleo",
  "mediterranean",
] as const;

export const ALLERGY_OPTIONS = [
  "gluten",
  "lactose",
  "nuts",
  "peanuts",
  "eggs",
  "soy",
  "shellfish",
  "fish",
  "sesame",
] as const;

export const GOAL_OPTIONS = [
  "high_protein",
  "low_calorie",
  "low_carb",
  "high_fiber",
  "balanced",
] as const;

export const RECIPE_MODES = ["adapt", "scratch"] as const;

export const DEFAULT_GENERATIONS_PER_DAY = 20;
export const HISTORY_PAGE_SIZE = 12;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 24;
```

Optional persona shortcuts (UI only — always stored as `persona_query` text):

```ts
// lib/persona-shortcuts.ts
export const PERSONA_SHORTCUTS = [
  "Gourmet / fine dining",
  "High-protein / fitness coach",
  "Plant-based specialist",
  "Weeknight quick & easy",
  "Comfort food classic",
] as const;
```

---

## 3. Exact Zod schemas

All request/response validation lives under `lib/validation` and `lib/ai/schema`. Forms and API share the same schemas.

### 3.1 Common ingredient

```ts
// lib/validation/common.ts
import { z } from "zod";

export const IngredientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().positive().max(100_000),
  unit: z
    .string()
    .trim()
    .max(40)
    .transform((u) => u.toLowerCase())
    .default(""),
});

export type IngredientInput = z.infer<typeof IngredientInputSchema>;
```

### 3.2 Auth

```ts
// lib/validation/auth.ts
import { z } from "zod";

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
import { z } from "zod";
import { ALLERGY_OPTIONS, DIET_TYPES, GOAL_OPTIONS } from "@/lib/constants";

export const ProfileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(80).nullable().optional(),
  allergies: z.array(z.enum(ALLERGY_OPTIONS)).max(20).default([]),
  diet_type: z.enum(DIET_TYPES).default("none"),
  goals: z.array(z.enum(GOAL_OPTIONS)).max(10).default([]),
  preferences_notes: z.string().trim().max(1000).nullable().optional(),
});

export const OnboardingSchema = ProfileUpdateSchema.superRefine((val, ctx) => {
  if (
    val.diet_type === "none" &&
    val.allergies.length === 0 &&
    val.goals.length === 0 &&
    !val.preferences_notes
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one preference (diet, allergy, goal, or note).",
      path: ["diet_type"],
    });
  }
});
```

### 3.4 Generate API request

```ts
// lib/validation/generate.ts
import { z } from "zod";
import { IngredientInputSchema } from "./common";

const PersonaQuerySchema = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const AdaptBodySchema = z.object({
  mode: z.literal("adapt"),
  title: z.string().trim().min(1).max(160),
  ingredients: z.array(IngredientInputSchema).min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(60),
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

### 3.5 AI output (must match OpenAI structured output)

```ts
// lib/ai/schema.ts
import { z } from "zod";
import { IngredientInputSchema } from "@/lib/validation/common";

export const InsightsSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  substitutions: z
    .array(
      z.object({
        original: z.string().trim().max(200).optional(),
        replacement: z.string().trim().min(1).max(200),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .max(40)
    .default([]),
});

export const AiRecipeOutputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  servings_base: z.number().int().min(1).max(24),
  ingredients: z.array(IngredientInputSchema).min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(60),
  insights: InsightsSchema,
  persona_applied: z.boolean(),
  /** When true, server should treat as non-culinary refusal */
  refused: z.boolean().optional().default(false),
  refusal_reason: z.string().trim().max(500).optional(),
});

export type AiRecipeOutput = z.infer<typeof AiRecipeOutputSchema>;
```

### 3.6 Generate API response (client-facing)

```ts
export const GenerateSuccessSchema = z.object({
  recipe: z.object({
    id: z.string().uuid(),
    title: z.string(),
    mode: z.enum(["adapt", "scratch"]),
    servings_base: z.number().int(),
    ingredients: z.array(IngredientInputSchema),
    steps: z.array(z.string()),
    insights: InsightsSchema,
    persona_query: z.string().nullable(),
    persona_fallback_used: z.boolean(),
    is_favorite: z.boolean(),
    created_at: z.string(),
  }),
});
```

### 3.7 Shopping list item (client upsert payload)

```ts
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

---

## 4. SQL migration DDL

File: `supabase/migrations/0001_init.sql`

```sql
-- TasteTailor MVP schema
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
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
    diet_type in (
      'none', 'vegetarian', 'vegan', 'pescatarian',
      'keto', 'paleo', 'mediterranean'
    )
  ),
  constraint daily_generation_count_nonnegative check (daily_generation_count >= 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- recipes
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
  constraint recipes_mode_check check (mode in ('adapt', 'scratch')),
  constraint recipes_servings_base_check check (servings_base between 1 and 24),
  constraint recipes_title_len check (char_length(title) between 1 and 160)
);

create index recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

create index recipes_user_favorites_idx
  on public.recipes (user_id, created_at desc)
  where is_favorite = true;

-- ---------------------------------------------------------------------------
-- shopping_list_items
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

create index shopping_list_user_checked_idx
  on public.shopping_list_items (user_id, is_checked);

create trigger shopping_list_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- inserts happen via security definer trigger; no direct insert policy for users

create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "recipes_insert_own"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "recipes_update_own"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recipes_delete_own"
  on public.recipes for delete
  using (auth.uid() = user_id);

create policy "shopping_select_own"
  on public.shopping_list_items for select
  using (auth.uid() = user_id);

create policy "shopping_insert_own"
  on public.shopping_list_items for insert
  with check (auth.uid() = user_id);

create policy "shopping_update_own"
  on public.shopping_list_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "shopping_delete_own"
  on public.shopping_list_items for delete
  using (auth.uid() = user_id);
```

### Rate-limit helper (SQL function, called from API)

```sql
-- Atomic check-and-increment for generations
create or replace function public.claim_generation_slot(max_per_day integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ok boolean;
begin
  if uid is null then
    return false;
  end if;

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
    and (
      generation_count_reset_at <= now()
      or daily_generation_count < max_per_day
    );

  ok := found;
  return ok;
end;
$$;

revoke all on function public.claim_generation_slot(integer) from public;
grant execute on function public.claim_generation_slot(integer) to authenticated;
```

---

## 5. CRUD matrix

| Entity / action | Actor | Where | Create | Read | Update | Delete | Notes |
|---|---|---|---|---|---|---|---|
| Auth user | Anon | Supabase Auth | signup | session | password reset (out of MVP UI OK) | — | email+password |
| Profile | User | Supabase client | trigger on signup | select own | onboarding + profile form | cascade with auth user | cannot insert manually |
| Recipe (AI) | User | `POST /api/generate` | insert after AI | — | — | — | server sets `user_id` |
| Recipe history | User | Supabase / RSC | — | list paginated | — | optional later | `order by created_at desc` |
| Recipe detail | User | RSC + client | — | by id | — | optional | 404 if RLS hides |
| Favorite toggle | User | client mutation | — | — | `is_favorite` | — | boolean flag |
| Favorites list | User | RSC | — | filter true | — | — | partial index |
| Shopping item | User | client | upsert merge | list | check / qty | delete row / clear all | unique `(user_id,name,unit)` |
| Generation slot | User | RPC / server | — | — | claim slot | — | before OpenAI call |

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
// On conflict: quantity = mergeQuantity(...); append source_recipe_id to array if new
```

Scale before upsert:

```ts
scaleIngredients(ingredients, servingsBase, uiServings)
// quantity' = round(quantity * uiServings / servingsBase, 2)
```

---

## 6. API design (detailed)

### `GET /api/health`

- Auth: none  
- Response `200`: `{ "ok": true }`

### `POST /api/generate`

**Auth:** session cookie via Supabase server client.

**Steps (server):**

1. `getUser()` → else `401`  
2. Load profile → else `401`  
3. If `!onboarding_completed` → `403` `{ error: "onboarding_required" }`  
4. Parse JSON → `GenerateRequestSchema.safeParse` → else `400` + Zod issues  
5. `claim_generation_slot(GENERATIONS_PER_DAY)` → else `429`  
6. Build prompts (`lib/ai/prompt.ts`) from profile + request  
7. Call OpenAI; parse with `AiRecipeOutputSchema`  
8. If parse fails → one retry with “repair to schema” instruction  
9. If still invalid → `422` `{ error: "invalid_ai_output" }`  
10. If `refused === true` → `400` `{ error: "non_culinary", message }` (do not insert recipe; **do not refund** generation slot — abuse deterrence)  
11. `persona_fallback_used = Boolean(persona_query) && !persona_applied`  
12. Insert into `recipes`  
13. Return `201` + `GenerateSuccessSchema` shape  

**Guardrail prompt rules (summary for `prompt.ts`):**

- Only culinary recipe generation/adaptation.  
- Obey allergies (hard exclude), diet_type, goals.  
- If `persona_query` set: apply if you know the style; else set `persona_applied: false` and produce a strong general recipe still matching the profile.  
- Never invent medical claims.  
- Output must match JSON schema exactly.

---

## 7. Component APIs (folder-level)

Props are TypeScript contracts. Client components marked `"use client"`.

### Auth

```ts
// LoginForm
type Props = { redirectTo?: string };
// on submit → supabase.auth.signInWithPassword(LoginSchema)
// success → router.push(redirectTo ?? "/generate" or "/onboarding")

// SignupForm
type Props = { redirectTo?: string };
// signUp({ email, password, options: { data: { display_name } } })
```

### Onboarding / Profile

```ts
// OnboardingForm
type Props = {
  initial: ProfileRow | null;
  onCompleted: () => void; // navigate to /generate
};
// validates OnboardingSchema → update profiles set ..., onboarding_completed=true

// ProfileForm
type Props = { initial: ProfileRow };
// validates ProfileUpdateSchema → update (does not flip onboarding flag)
```

### Generate

```ts
// GenerateTabs
type Props = {
  defaultTab?: "adapt" | "scratch";
};
// renders AdaptRecipeForm | ScratchDishForm

// PersonaField
type Props = {
  value: string;
  onChange: (v: string) => void;
  shortcuts?: readonly string[]; // PERSONA_SHORTCUTS
};

// AdaptRecipeForm
type Props = {
  onGenerated: (recipeId: string, fallback: boolean) => void;
};
// dynamic ingredient/step rows → POST /api/generate

// ScratchDishForm
type Props = {
  onGenerated: (recipeId: string, fallback: boolean) => void;
};
```

### Recipe detail

```ts
// ServingScaler
type Props = {
  servingsBase: number;
  value: number;           // uiServings
  onChange: (n: number) => void;
  min?: number;            // default 1
  max?: number;            // default 24
};

// IngredientList
type Props = {
  ingredients: IngredientInput[];
  servingsBase: number;
  uiServings: number;
};
// displays scaleIngredients(...)

// InsightsBox
type Props = { insights: AiRecipeOutput["insights"]; fallbackUsed?: boolean };

// FavoriteButton
type Props = { recipeId: string; isFavorite: boolean };
// optimistic toggle → supabase.from('recipes').update({ is_favorite })

// AddToShoppingListButton
type Props = {
  recipeId: string;
  ingredients: IngredientInput[];
  servingsBase: number;
  uiServings: number;
};
// scales → merge upserts → toast + link to /shopping-list
```

### Shopping

```ts
// ShoppingListView
type Props = { initialItems: ShoppingListItemRow[] };

// ShoppingListItemRow
type Props = {
  item: ShoppingListItemRow;
  onToggleChecked: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
};

// ExportListButton
type Props = { items: ShoppingListItemRow[] };
// exportText(items) → clipboard → toast "Copied"
```

### History

```ts
// RecipeCard
type Props = {
  id: string;
  title: string;
  createdAt: string;
  isFavorite: boolean;
  mode: "adapt" | "scratch";
};
```

---

## 8. State management rules

| Concern | Where state lives |
|---|---|
| Session | Supabase cookie + middleware |
| Profile gate | Server layout load `onboarding_completed` |
| Generate form | Local React state |
| `uiServings` | Local React state on recipe page (init = `servings_base`) |
| History/favorites lists | RSC fetch; client pagination via `?page=` search param |
| Shopping list | RSC initial + client mutations with local list copy |
| Toasts | Lightweight client context or local component state |

No Redux/Zustand required for MVP.

---

## 9. Validation rules (summary checklist)

### Auth
- Email valid; password ≥ 8 chars on signup.  
- Login: show generic error (“Invalid email or password”) — do not leak which field failed.

### Onboarding
- At least one of: non-`none` diet, allergy, goal, or notes.  
- Arrays only from allowed enums.

### Generate — adapt
- Title required.  
- ≥1 ingredient with positive quantity.  
- ≥1 step.  
- `persona_query` optional, max 120.

### Generate — scratch
- `dish_name` min 2 chars.  
- Reject empty/whitespace.

### Serving scale
- Integer clamps `[1, 24]`.  
- Display quantities rounded to 2 decimals (strip trailing zeros in UI).

### Shopping
- Merge only on normalized `(name, unit)`.  
- Different units → separate rows.  
- Quantity always `> 0`.  
- Export includes both sections: “To buy” and “Already have”.

### AI output
- Schema must pass Zod before DB insert.  
- One repair retry.  
- `refused` → no insert.

---

## 10. Error handling UX

| Code / case | User-facing copy (English) |
|---|---|
| 400 validation | Inline field errors from Zod |
| 400 non_culinary | “TasteTailor only generates recipes. Try a dish or recipe instead.” |
| 401 | Redirect to `/login` |
| 403 onboarding | Redirect to `/onboarding` |
| 429 | “Daily generation limit reached. Come back tomorrow.” |
| 422 | “Couldn’t build a valid recipe. Please try again.” |
| 500 / network | “Something went wrong. Please try again.” |
| Persona fallback | Banner: “We couldn’t apply ‘{query}’ — here’s a recipe tailored to your profile instead.” |
| Empty history | EmptyState → CTA to `/generate` |
| Empty shopping list | EmptyState → CTA to history/generate |

---

## 11. UX wireframe notes

ASCII wireframes — layout intent for implementation, not final visual design. Copy is English.

### 11.1 Landing `/`

```text
┌──────────────────────────────────────────────┐
│ TasteTailor                          Log in  │
│                                              │
│  Recipes that fit your diet — and your style │
│  Adapt any recipe or start from a dish name. │
│                                              │
│  [ Get started ]     [ Log in ]              │
│                                              │
│  (single hero atmosphere — no feature cards) │
└──────────────────────────────────────────────┘
```

### 11.2 Login / Signup

```text
┌─────────────────────┐
│ TasteTailor         │
│ Email               │
│ Password            │
│ [ Continue ]        │
│ Link to other mode  │
└─────────────────────┘
```

### 11.3 Onboarding

```text
┌──────────────────────────────────────────────┐
│ Tell us how you eat                          │
│ Display name                                 │
│ Diet type          [ select ]                │
│ Allergies          [ ] gluten [ ] lactose …  │
│ Goals              [ ] high protein …        │
│ Notes (optional)                             │
│ [ Save and continue ]                        │
└──────────────────────────────────────────────┘
```

### 11.4 Generate

```text
┌──────────────────────────────────────────────┐
│ Nav: Generate | History | Favorites | List   │
│                                              │
│ [ Adapt recipe ]  [ From scratch ]           │
│                                              │
│ Adapt:                                       │
│   Title                                      │
│   Ingredients (name | qty | unit) [+ Add]    │
│   Steps                       [+ Add]        │
│                                              │
│ Style / creator (optional)                   │
│   [text field]  shortcuts: [chip] [chip]     │
│                                              │
│ [ Generate recipe ]   (spinner while waiting)│
└──────────────────────────────────────────────┘
```

Primary action: one generate CTA. Persona is secondary.

### 11.5 Recipe detail `/recipes/[id]`

```text
┌──────────────────────────────────────────────┐
│ ← History          Title              ♥ Fav  │
│ Servings  [ − ] 4 [ + ]                      │
│                                              │
│ Ingredients (scaled live)                    │
│ Steps                                        │
│                                              │
│ Insights                                     │
│  summary…                                    │
│  • butter → olive oil — reason…              │
│                                              │
│ [ fallback banner if needed ]                │
│                                              │
│ [ Add to shopping list ]                     │
└──────────────────────────────────────────────┘
```

First viewport: title + scaler + ingredients. Insights below fold OK.

### 11.6 History / Favorites

```text
┌──────────────────────────────────────────────┐
│ History                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐             │
│ │ Title  │ │ Title  │ │ Title  │             │
│ │ date   │ │ date   │ │ date   │             │
│ └────────┘ └────────┘ └────────┘             │
│              [ Load more ]                   │
└──────────────────────────────────────────────┘
```

Favorites same grid, filtered. Cards are navigation targets only.

### 11.7 Shopping list

```text
┌──────────────────────────────────────────────┐
│ My shopping list          [ Export ] [ Clear]│
│                                              │
│ [ ] 5 onion                                  │
│ [ ] 3 cup flour                              │
│ [x] 2 eggs                                   │
│                                              │
│ Export copies plain text for price bots.     │
└──────────────────────────────────────────────┘
```

### 11.8 Profile

Same fields as onboarding; title “Your preferences”; button “Save changes”.

### 11.9 Motion (implementation note)

Ship 2–3 intentional motions later: generate pending state, insights fade-in, shopping check-off. Not required to block backend work.

---

## 12. Middleware & route gates

```ts
// Pseudo-logic in middleware.ts + (app)/layout.tsx
publicPaths = ["/", "/login", "/signup", "/api/health"]
authPaths = ["/login", "/signup"]

if (!session && path starts with private) redirect /login
if (session && path in authPaths) redirect /generate or /onboarding
if (session && !onboarding_completed && path not in ["/onboarding", "/profile", "/api/..."])
  redirect /onboarding
if (session && onboarding_completed && path === "/onboarding")
  redirect /generate
```

Profile fetch for onboarding flag: prefer server layout query; middleware may only handle cookie session to keep edge light.

---

## 13. Client helpers (contracts)

```ts
// lib/shopping/scale.ts
export function scaleIngredients(
  ingredients: IngredientInput[],
  servingsBase: number,
  uiServings: number,
): IngredientInput[];

// lib/shopping/exportText.ts
export function formatShoppingListForExport(
  items: { display_name: string; quantity: number; unit: string; is_checked: boolean }[],
): string;
// Example:
// Shopping list — TasteTailor
// To buy:
// - 5 onion
// - 3 cup flour
// Already have:
// - 2 eggs
```

```ts
// lib/format.ts
export function formatQuantity(n: number): string;
// 2.5 → "2.5"; 2.0 → "2"
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
export type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  mode: "adapt" | "scratch";
  persona_query: string | null;
  persona_fallback_used: boolean;
  servings_base: number;
  ingredients: IngredientInput[];
  steps: string[];
  insights: {
    summary: string;
    substitutions: {
      original?: string;
      replacement: string;
      reason: string;
    }[];
  };
  source_input: Record<string, unknown>;
  is_favorite: boolean;
  created_at: string;
};

export type ShoppingListItemRow = {
  id: string;
  user_id: string;
  name: string;
  display_name: string;
  quantity: number;
  unit: string;
  is_checked: boolean;
  source_recipe_ids: string[];
  updated_at: string;
};
```

---

## 15. Testing hooks (for later step 6–7)

Design so these are easy to unit-test without UI:

| Module | Tests |
|---|---|
| `lib/shopping/merge.ts` | normalize + merge same unit; no merge across units |
| `lib/shopping/scale.ts` | 4→8 doubles qty; clamp edge |
| `lib/validation/*` | Zod accept/reject matrices |
| `lib/ai/schema.ts` | fixture JSON parse |
| `POST /api/generate` | mock OpenAI: auth, 429, fallback flag, refuse |
| Playwright | signup → onboard → scratch generate → favorite → add list → export |

---

## 16. Implementation order (recommended)

1. Scaffold Next.js + env example + Supabase clients  
2. Apply `0001_init.sql` + Auth pages  
3. Onboarding + middleware gates  
4. Generate API + recipe detail (scaler, insights)  
5. History + favorites  
6. Shopping list merge + export  
7. Polish empty states / errors  
8. Deploy Vercel + Supabase  

---

## 17. Traceability to course step 4

| Required topic | Section |
|---|---|
| Folder structure | §1 |
| Central components | §7 |
| Database structure | §4 |
| CRUD operations | §5 |
| API description | §6 |
| Business logic | §6 + Arch §6 |
| State management | §8 |
| Error handling | §10 |
| Input validation | §3, §9 |
| UX of core flows | §11 |
