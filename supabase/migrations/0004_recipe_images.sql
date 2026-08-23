-- Per-recipe Unsplash image metadata (nullable; ambient UI fallback when null).

alter table public.recipes
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists image_credit_name text,
  add column if not exists image_credit_url text;
