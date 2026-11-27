-- HanFlash (韓文快刷) Supabase PostgreSQL Schema
-- Run this SQL in your Supabase Dashboard -> SQL Editor.

create table if not exists public.decks (
  id text primary key,
  title text not null,
  description text not null default '',
  is_system boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id text primary key,
  deck_id text not null references public.decks(id) on delete cascade,
  korean text not null,
  pronunciation text,
  hanja text,
  part_of_speech text,
  meaning text not null,
  example_ko text,
  example_zh text,
  mnemonic text,
  created_at timestamptz not null default now()
);

-- Stores each user's current bucket (new / fuzzy / known).
-- Intentionally omits a strict FK on card_id so progress on built-in client seed cards
-- syncs seamlessly even before system decks are manually seeded into Postgres.
create table if not exists public.user_card_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  bucket text not null check (bucket in ('new', 'fuzzy', 'known')),
  review_count integer not null default 0,
  last_reviewed_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- Keeps immutable review history so upgrading to FSRS later preserves every review.
create table if not exists public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  bucket text not null check (bucket in ('new', 'fuzzy', 'known')),
  reviewed_at timestamptz not null default now()
);

create index if not exists idx_cards_deck_id on public.cards(deck_id);
create index if not exists idx_progress_user_bucket on public.user_card_progress(user_id, bucket);
create index if not exists idx_review_logs_user_time on public.review_logs(user_id, reviewed_at desc);

-- Enable Row Level Security (RLS)
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.user_card_progress enable row level security;
alter table public.review_logs enable row level security;

-- Decks policies: everyone reads system decks; users manage their own decks.
drop policy if exists "decks_select" on public.decks;
create policy "decks_select" on public.decks
  for select using (is_system = true or auth.uid() = owner_id);

drop policy if exists "decks_insert" on public.decks;
create policy "decks_insert" on public.decks
  for insert with check (is_system = false and auth.uid() = owner_id);

drop policy if exists "decks_update" on public.decks;
create policy "decks_update" on public.decks
  for update using (is_system = false and auth.uid() = owner_id);

drop policy if exists "decks_delete" on public.decks;
create policy "decks_delete" on public.decks
  for delete using (is_system = false and auth.uid() = owner_id);

-- Cards policies: readable if parent deck is system or owned by user; writable only in owned decks.
drop policy if exists "cards_select" on public.cards;
create policy "cards_select" on public.cards
  for select using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id
        and (d.is_system = true or d.owner_id = auth.uid())
    )
  );

drop policy if exists "cards_insert" on public.cards;
create policy "cards_insert" on public.cards
  for insert with check (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id
        and d.is_system = false
        and d.owner_id = auth.uid()
    )
  );

drop policy if exists "cards_update" on public.cards;
create policy "cards_update" on public.cards
  for update using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id
        and d.is_system = false
        and d.owner_id = auth.uid()
    )
  );

drop policy if exists "cards_delete" on public.cards;
create policy "cards_delete" on public.cards
  for delete using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id
        and d.is_system = false
        and d.owner_id = auth.uid()
    )
  );

-- Progress & review logs: strictly per-user.
drop policy if exists "progress_all_own" on public.user_card_progress;
create policy "progress_all_own" on public.user_card_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "review_logs_select_own" on public.review_logs;
create policy "review_logs_select_own" on public.review_logs
  for select using (auth.uid() = user_id);

drop policy if exists "review_logs_insert_own" on public.review_logs;
create policy "review_logs_insert_own" on public.review_logs
  for insert with check (auth.uid() = user_id);
