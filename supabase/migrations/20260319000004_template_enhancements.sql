-- Templates table for DB-backed template storage
-- Replaces the hardcoded TEMPLATE_REGISTRY for imported templates
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text not null default 'General',
  description text default '',
  google_slides_id text,
  slides jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  cover_url text,
  tags text[] default '{}',
  is_premium boolean default false,
  slide_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster category queries
create index if not exists idx_templates_category on public.templates (category);

-- RLS: public read, admin write
alter table public.templates enable row level security;

create policy "Public read templates" on public.templates
  for select using (true);

create policy "Auth insert templates" on public.templates
  for insert with check (true);

create policy "Auth update templates" on public.templates
  for update using (true);

-- Updated at trigger
drop trigger if exists templates_updated_at on public.templates;
create trigger templates_updated_at
  before update on public.templates
  for each row
  execute function public.handle_updated_at();
