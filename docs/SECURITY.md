# TasteTailor — Security

Status: reflects the implemented app. Every claim below is either backed by an automated test (`SEC-*` / `PRIV-*` IDs referencing [`TESTING.md`](./TESTING.md) §7–8) or explicitly disclosed as a known gap in §8 — nothing here is aspirational.

---

## 1. Authentication

TasteTailor uses **Supabase Auth with email + password** (no OAuth in the MVP).

- Sessions are HTTP-only cookies managed entirely by `@supabase/ssr` — the app never handles a raw JWT itself. `lib/supabase/client.ts` creates the browser client; `lib/supabase/server.ts` creates the server/RSC client, both wired to Next's cookie store.
- **Signup** (`components/auth/SignupForm.tsx`): client-validates with `SignupSchema` (email format, password 8–72 chars, optional display name) before calling `supabase.auth.signUp()`. The `display_name` is passed through `options.data` so a `security definer` DB trigger (`handle_new_user`) can read it when auto-creating the matching `profiles` row.
- **Login** (`components/auth/LoginForm.tsx`): client-validates with `LoginSchema`, calls `supabase.auth.signInWithPassword()`, and shows one generic "Invalid email or password" message on failure — it never reveals whether the email or the password was wrong, which would otherwise let an attacker enumerate registered emails.
- **Sign out**: `AppNav.tsx` calls `supabase.auth.signOut()` and routes to `/login`, clearing the session cookie.
- **Email confirmation**: Supabase's built-in confirmation requirement is currently **off**, a deliberate choice for local/demo convenience (`docs/IMPLEMENTATION_PLAN.md`, "Open dilemmas" #3). This is called out again in §8 as something to change before any real production use.

## 2. Authorization

Authorization in this app is enforced almost entirely at the **database layer via Postgres Row Level Security (RLS)**, not by application-level role checks — there is only one role (authenticated end-user; no admin role exists in the MVP), so authorization here means "can this authenticated user touch this specific row," not "does this user have permission X."

- All three tables (`profiles`, `recipes`, `shopping_list_items`) have RLS **enabled**, with a policy for every operation the app performs, each scoped to `auth.uid() = <owner column>` (full policy list in `TECHNICAL_DESIGN.md` §4). This means even a client that bypasses the UI and calls the Supabase REST API directly with a valid session still cannot read or write another user's row — the database itself refuses it, independent of any application code.
- `profiles` has **no direct insert policy at all** — the only way a row is created is the `security definer` `handle_new_user()` trigger firing on `auth.users` insert, so no client request, however crafted, can create a profile for a different user id.
- Route-level authorization is layered on top as a UX/defense-in-depth concern (see §3), but the RLS layer is the actual authority — it holds even if a route-level check is ever missed.

## 3. Protected actions (require an authenticated session)

| Action | How it's gated |
|---|---|
| View/generate on `/generate` | Redirects to `/login` if unauthenticated; redirects to `/onboarding` if onboarding incomplete |
| `POST /api/generate` | `401 unauthorized` if no session; `403 onboarding_required` if onboarding incomplete |
| `POST /api/recipes/[id]/refine` | Same as above, plus `404 not_found` if the recipe doesn't exist or isn't owned by the caller |
| View/edit `/recipes/[id]`, `/history`, `/favorites`, `/shopping-list`, `/profile`, `/onboarding` | Redirected to `/login` if unauthenticated (see §2/§4 for how "owned" is enforced) |
| Favorite toggle, delete recipe, shopping-list add/check/remove/clear | Direct Supabase client calls from the browser, each covered by an RLS write policy scoped to the caller's own rows |

Public, unauthenticated routes are limited to: `/` (landing), `/login`, `/signup`, and `GET /api/health` (a liveness check with no session logic or data access — see `TECHNICAL_DESIGN.md` §6). Everything else requires a session, enforced by two independent layers (§2 above, and the route-gate mechanics in §6).

## 4. Data isolation between users

This is the most heavily tested guarantee in the app, because a personal-recipe app leaking one user's data to another would be a severe failure.

- **Mechanism**: RLS policies (§2) mean every query — list history, read a recipe by id, read/write the shopping list, read/update a profile — is silently filtered to the caller's own rows by Postgres itself, not by an `if` statement in application code that could be forgotten on a new route.
- **Ownership double-check on refine**: `POST /api/recipes/[id]/refine` explicitly filters its initial fetch by `.eq("id", id).eq("user_id", user.id)` and returns a generic `404 not_found` if that fails — an attacker probing another user's recipe id gets "not found," never a permission-denied response that would confirm the id exists.
- **Verified end-to-end, not just declared**: the `PRIV-*` Playwright suite (`e2e/privilege.spec.ts`) runs two real authenticated users (A and B) in parallel browser contexts and asserts, concretely:
  - `PRIV-01/02/03`: B cannot read, refine, or delete A's recipe by id.
  - `PRIV-04`: A's history never lists a title belonging to B.
  - `PRIV-05/06`: B cannot see or modify A's shopping-list rows.
  - `PRIV-07`: B cannot update A's `profiles` row.
  - `PRIV-08`: every recipe insert stamps the authenticated caller's own `user_id`, never a client-supplied one.

  This is real proof the isolation holds in practice, not just that policies exist on paper.

## 5. Input validation & sanitization

Every form and every API request body is validated with **Zod**, and — critically — **server-side validation is authoritative**: client-side Zod checks are a UX convenience, but every API route re-validates the exact same schema against the raw request body regardless of what the client claims to have sent.

| Input | Schema | Key limits |
|---|---|---|
| Signup | `SignupSchema` | email format, password 8–72 chars, display name ≤ 80 chars |
| Login | `LoginSchema` | email format |
| Onboarding / profile | `OnboardingSchema` / `ProfileUpdateSchema` | diet/allergy/goal values restricted to fixed enums (`lib/constants.ts`) — arbitrary strings rejected; onboarding requires at least one real preference set |
| Generate (adapt) | `GenerateRequestSchema` | `recipe_text` 20–20,000 chars, trimmed |
| Generate (scratch) | `GenerateRequestSchema` | `dish_name` 2–160 chars, trimmed |
| Persona/creator | (shared) | optional, ≤ 120 chars |
| Refine | `RefineRequestSchema` | `message` 2–500 chars, trimmed |
| Shopping upsert | `ShoppingUpsertItemSchema` | name ≤ 120 chars, quantity finite/positive/≤ 100,000, unit ≤ 40 chars |

A request that fails validation gets a `400 validation_error` with field-level Zod issues — never a stack trace or raw parser error.

**The AI's own output is treated as untrusted input, not a trusted internal value.** `AiRecipeOutputSchema` validates every field Gemini returns (including coercing loosely-typed values like a stringified boolean or number, since models don't always emit perfectly-typed JSON) before anything is inserted into the database. A response that fails validation even after one repair-retry is rejected outright (`422 invalid_ai_output`) rather than stored.

**Sanitization on the way out** matters as much as validation on the way in, since recipe content and image URLs originate outside the app's control:
- Recipe text is rendered as plain React children (never `dangerouslySetInnerHTML`), so React's default escaping neutralizes any HTML/script content a title or step might contain — verified by `SEC-03`, which seeds a hostile title directly into the database and asserts no script executes and no extra DOM node is injected.
- AI-supplied citation links only render as clickable if `lib/security/isHttpUrl.ts` confirms an `http:`/`https:` URL — a `javascript:`/`data:`/`file:` value renders as inert plain text instead (`SEC-01`), and real links carry `target="_blank" rel="noopener noreferrer"` (`SEC-02`).
- Recipe image URLs are allowlisted (`lib/images/safeRecipeImage.ts`) to local paths or `https://images.unsplash.com` only — anything else falls back to a local placeholder (`SEC-09`). **A real bug was found and fixed here during development**: the local-path check originally also matched protocol-relative URLs like `//evil.example.com/x.jpg` (which start with a single `/` too), letting them bypass the allowlist; the fix explicitly rejects values starting with `//` or `/\` before treating them as safe local paths.

## 6. API security

- **Auth is re-checked at the point of data access, not just at a route boundary.** Both `POST /api/generate` and `POST /api/recipes/[id]/refine` independently call `getCurrentUserAndProfile()` and return `401`/`403` themselves — they don't trust that the request already passed through the proxy layer.
- **`proxy.ts`** (root file — Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; confirmed against the real upgrade guide shipped in `node_modules/next/dist/docs`) delegates to `lib/supabase/middleware.ts`, which refreshes the session cookie and redirects unauthenticated requests away from a fixed `PROTECTED_PREFIXES` list. This was **added during this project's security hardening** specifically as a backstop: a review found the middleware previously only refreshed cookies and provided no actual gate, meaning a future protected page added without its own server-side check would otherwise be silently reachable by anyone.
- **Rate limiting as abuse/cost control**: `claim_generation_slot`/`refund_generation_slot` are atomic Postgres `security definer` RPC functions (not an app-level read-then-increment, which would race under concurrent requests). A claimed slot is refunded on any failure after the fact (upstream error, invalid AI output, DB write failure) — except a non-culinary refusal, which is **deliberately not refunded**, so a jailbreak/abuse attempt costs the attacker's own quota rather than being free to retry indefinitely. See `SCALE.md` §2 and `STRESS-01`–`03` in `TESTING.md`.
- **Prompt injection defenses**: the system prompt (`lib/ai/prompt.ts`) restricts the model to culinary tasks and instructs it to refuse anything else; every AI call (generate and refine) runs through the same classifier (`lib/ai/run-generation.ts`) that treats `refused: true` as a hard `400 non_culinary`, inserting/updating nothing. Tested both with mock AI (`SEC-04`, asserting the response never contains real system-prompt marker strings even when the paste explicitly asks the model to print them) and, opt-in, against live Gemini (`SEC-05`, using the persona field as a second injection surface).
- **No internal leakage in errors**: `outcomeToErrorResponse()` maps every failure to a fixed error code and copy — never the raw upstream response body, a stack trace, a request URL, or a key — even when the underlying cause was a direct Gemini HTTP failure (`SEC-07`). Full detail only ever reaches server-side logs, gated further behind `AI_DEBUG` for the most verbose tier.
- **Open-redirect guard**: `LoginForm.tsx`'s optional `redirectTo` prop is passed through a `safeRedirectPath()` check rejecting `//`- and `/\`-prefixed values before ever reaching `router.push()` — proactive hardening, since no current caller wires an untrusted query param into it yet, but one could be added later.

## 7. Secrets management

| Variable | Exposure | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design | Safe to ship to the browser — RLS (§2/§4) is what actually protects data, not keeping this key secret |
| `GEMINI_API_KEY` | Server-only | Read only in `lib/ai/gemini.ts`, called only from route handlers |
| `UNSPLASH_ACCESS_KEY` | Server-only | Read only in `lib/images/unsplash.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, minimal use | Not read by any application request path at all — used only by one E2E test helper that needs to bypass RLS for setup/teardown |

- **Enforced by an automated test, not just review discipline**: `npm run test:client-secrets` (`lib/security/client-bundle.test.ts`) builds the app and scans the real compiled `.next/static` client bundle for the literal secret values, failing the build's test suite if either key ever ends up in code the browser can download (`SEC-06`).
- **Server-only import boundary**: `lib/ai/*` and `lib/images/unsplash.ts` are checked (`SEC-10`) to never be imported from a `"use client"` module — an accidental client import would be a second, independent way for a secret to leak, on top of the bundle scan.
- **Git hygiene**: `.gitignore` excludes `.env*` except `*.example` files, so `.env.local` (real keys) never enters git history while `.env.local.example` (blank placeholders) is the one committed. Checked by an automated repo scan (`SEC-08`). This exact failure mode — a real secret accidentally landing in the tracked example file — was caught by hand and reverted at least once during development, which is precisely the class of mistake this automated check exists to catch going forward without relying on someone noticing manually.

## 8. Known risks & future improvements

Disclosed honestly rather than assumed away:

| Risk | Current state | Planned improvement |
|---|---|---|
| Email confirmation disabled | Off for local/demo convenience | Enable before any real production deployment |
| `SignupForm` doesn't verify a session exists before redirecting to onboarding | If email confirmation were turned on, a new user would be bounced back to `/login` from `/onboarding` with no explanation | Check `data.session` before redirecting; show a "check your email" state instead |
| No CSRF token scheme | Relies on the default same-site cookie behavior from Supabase's SSR helpers; no state-changing endpoint accepts cross-origin form posts today | Add an explicit CSRF token if any cross-origin-triggerable mutation is ever introduced |
| No login-attempt rate limiting in application code | Relies entirely on Supabase Auth's own backend protections, outside this repo's test coverage | Add app-level lockout/backoff if brute-force attempts become a concern |
| No admin/moderation role | Every account is a fully isolated, equal tenant; no staff path to inspect or act on another user's data short of direct database access | Add a scoped, audited admin role if support/moderation needs arise |
| Live jailbreak test (`SEC-05`) is opt-in only, not default CI | Real model behavior is non-deterministic and requires a live `GEMINI_API_KEY` | Consider a scheduled (not per-PR) CI run against live Gemini for ongoing regression coverage |
| Reduced-motion isn't a security issue but is a disclosed UX gap | Two animated elements (`components/ui/Button.tsx` loading pulse, the mobile nav drawer backdrop) animate pure opacity/scale, which `MotionConfig reducedMotion="user"` doesn't suppress | Tracked in `TECHNICAL_DESIGN.md` §11.12 as a known UI gap, not repeated here beyond this pointer |
