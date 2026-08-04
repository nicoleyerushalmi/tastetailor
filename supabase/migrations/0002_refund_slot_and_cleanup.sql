-- TasteTailor MVP schema — hardening pass
-- Apply in Supabase Dashboard → SQL Editor → New query → Run
--
-- If run by hand (not via `supabase db push`), also register it so the CLI
-- doesn't try to re-apply it later:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('0002', 'refund_slot_and_cleanup');

-- ---------------------------------------------------------------------------
-- Atomic refund counterpart to claim_generation_slot.
-- Previously done as a non-atomic read-then-write from application code
-- (lib/ai/rate-limit.ts), which could race under concurrent requests and
-- violate the daily_generation_count_nonnegative check constraint.
-- ---------------------------------------------------------------------------
create or replace function public.refund_generation_slot()
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
    daily_generation_count = daily_generation_count - 1,
    updated_at = now()
  where id = uid
    and daily_generation_count > 0;

  ok := found;
  return ok;
end;
$$;

revoke all on function public.refund_generation_slot() from public;
grant execute on function public.refund_generation_slot() to authenticated;

-- ---------------------------------------------------------------------------
-- Deleting a recipe should not leave dangling ids in shopping list rows'
-- source_recipe_ids array.
-- ---------------------------------------------------------------------------
create or replace function public.strip_deleted_recipe_from_shopping_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shopping_list_items
  set source_recipe_ids = array_remove(source_recipe_ids, old.id)
  where old.id = any(source_recipe_ids);
  return old;
end;
$$;

create trigger recipes_cleanup_shopping_list_refs
after delete on public.recipes
for each row execute function public.strip_deleted_recipe_from_shopping_list();
