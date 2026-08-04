-- TasteTailor MVP schema — recipe refinement chat log
-- Apply in Supabase Dashboard → SQL Editor → New query → Run
--
-- Depends on 0001_init.sql and 0002_refund_slot_and_cleanup.sql being applied first.
--
-- If run by hand (not via `supabase db push`), also register it:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('0003', 'recipe_refine_chat_log');

-- ---------------------------------------------------------------------------
-- Persistent chat/change log for the "refine this recipe" feature, plus
-- updated_at (recipes previously only ever got is_favorite toggles; refine
-- now genuinely mutates recipe content, so track last-edited time using the
-- same trigger already used by profiles / shopping_list_items).
-- Each chat_log entry: { role: "user" | "assistant", message: text, created_at: iso8601 }.
-- App layer trims to a fixed cap before every write (lib/recipes/chat-log.ts);
-- the length check below is a generous safety net, not the primary control.
-- ---------------------------------------------------------------------------
alter table public.recipes
  add column chat_log jsonb not null default '[]'::jsonb,
  add column updated_at timestamptz not null default now();

alter table public.recipes
  add constraint recipes_chat_log_is_array check (jsonb_typeof(chat_log) = 'array'),
  add constraint recipes_chat_log_len_check check (jsonb_array_length(chat_log) <= 60);

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();
