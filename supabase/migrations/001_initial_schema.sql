-- Filipino Dama (Dama King) - initial schema + RLS
-- This migration is designed for Supabase Postgres.

begin;

-- Extensions
create extension if not exists "pgcrypto";

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Players (extends auth.users)
create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

-- Player statistics
create table if not exists public.player_stats (
  player_id uuid primary key references public.players(id) on delete cascade,
  games_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  rating int not null default 1000,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_player_stats_updated_at on public.player_stats;
create trigger trg_player_stats_updated_at
before update on public.player_stats
for each row execute function public.set_updated_at();

-- Games
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  red_player_id uuid references public.players(id) on delete set null,
  black_player_id uuid references public.players(id) on delete set null,
  current_turn text not null check (current_turn in ('red', 'black')),
  board_state jsonb not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  winner_id uuid references public.players(id) on delete set null,
  room_code text unique,
  is_public boolean not null default true,
  is_ranked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_games_updated_at on public.games;
create trigger trg_games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

create index if not exists idx_games_status_public on public.games (status, is_public);
create index if not exists idx_games_room_code on public.games (room_code);
create index if not exists idx_games_players on public.games (red_player_id, black_player_id);

-- Moves (history/replay)
create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  move_number int not null,
  from_pos jsonb not null,
  to_pos jsonb not null,
  captures jsonb,
  created_at timestamptz not null default now(),
  constraint moves_unique_move_number unique (game_id, move_number)
);

create index if not exists idx_moves_game_id on public.moves (game_id);
create index if not exists idx_moves_game_id_created_at on public.moves (game_id, created_at);

-- Chat messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  message text not null check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_game_id_created_at on public.chat_messages (game_id, created_at);

-- Matchmaking queue
create table if not exists public.matchmaking_queue (
  player_id uuid primary key references public.players(id) on delete cascade,
  rating int not null,
  joined_at timestamptz not null default now()
);

create index if not exists idx_matchmaking_queue_rating_joined on public.matchmaking_queue (rating, joined_at);

-- Spectators
create table if not exists public.game_spectators (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create index if not exists idx_game_spectators_game_id on public.game_spectators (game_id);

-- -----------------------------------------------------------------------------
-- Auth bootstrap: create player + stats row on new auth.users insert
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_try int := 0;
begin
  -- Prefer explicit username in metadata. Otherwise derive from email or id prefix.
  v_username :=
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');

  if v_username is null then
    v_username :=
      nullif(trim(coalesce(split_part(new.email, '@', 1), '')), '');
  end if;

  if v_username is null then
    v_username := 'user_' || substr(new.id::text, 1, 8);
  end if;

  -- Ensure username uniqueness (retry with suffix on collision).
  while v_try < 10 loop
    begin
      insert into public.players (id, username, avatar_url, is_guest)
      values (
        new.id,
        v_username,
        nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), ''),
        coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false)
      )
      on conflict (id) do nothing;
      exit;
    exception
      when unique_violation then
        v_try := v_try + 1;
        v_username := v_username || '_' || substr(gen_random_uuid()::text, 1, 4);
    end;
  end loop;

  insert into public.player_stats (player_id)
  values (new.id)
  on conflict (player_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS helpers
-- -----------------------------------------------------------------------------
-- Note: avoid helper functions that reference tables with RLS in a way that can
-- create policy recursion (e.g. games policy -> spectators policy -> games).

-- -----------------------------------------------------------------------------
-- Secure RPC: join game (prevents arbitrary UPDATE payloads)
-- -----------------------------------------------------------------------------
create or replace function public.join_game(p_game_id uuid, p_room_code text default null)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.games g
  set
    black_player_id = auth.uid(),
    status = case when g.status = 'waiting' then 'active' else g.status end,
    updated_at = now()
  where g.id = p_game_id
    and g.status = 'waiting'
    and g.black_player_id is null
    and g.red_player_id is not null
    and (
      g.is_public
      or (g.room_code is not null and g.room_code = p_room_code)
    )
  returning * into v_game;

  if not found then
    raise exception 'Game not joinable';
  end if;

  return v_game;
end;
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS + policies
-- -----------------------------------------------------------------------------

-- Players
alter table public.players enable row level security;

drop policy if exists "players_select_public" on public.players;
create policy "players_select_public"
on public.players
for select
using (true);

drop policy if exists "players_update_own" on public.players;
create policy "players_update_own"
on public.players
for update
using (id = auth.uid())
with check (id = auth.uid());

-- player_stats
alter table public.player_stats enable row level security;

drop policy if exists "player_stats_select_public" on public.player_stats;
create policy "player_stats_select_public"
on public.player_stats
for select
using (true);

-- games
alter table public.games enable row level security;

drop policy if exists "games_select_visible" on public.games;
create policy "games_select_visible"
on public.games
for select
using (
  is_public
  or red_player_id = auth.uid()
  or black_player_id = auth.uid()
  or exists (
    select 1
    from public.game_spectators gs
    where gs.game_id = id and gs.player_id = auth.uid()
  )
);

drop policy if exists "games_insert_create_as_red" on public.games;
create policy "games_insert_create_as_red"
on public.games
for insert
with check (
  auth.uid() is not null
  and red_player_id = auth.uid()
  and black_player_id is null
  and status = 'waiting'
);

drop policy if exists "games_update_participants_only" on public.games;
create policy "games_update_participants_only"
on public.games
for update
using (
  auth.uid() is not null
  and (red_player_id = auth.uid() or black_player_id = auth.uid())
)
with check (
  auth.uid() is not null
  and (red_player_id = auth.uid() or black_player_id = auth.uid())
);

-- moves
alter table public.moves enable row level security;

drop policy if exists "moves_select_visible_game" on public.moves;
create policy "moves_select_visible_game"
on public.moves
for select
using (
  exists (
    select 1
    from public.games g
    where g.id = game_id
      and (
        g.is_public
        or g.red_player_id = auth.uid()
        or g.black_player_id = auth.uid()
        or exists (
          select 1
          from public.game_spectators gs
          where gs.game_id = g.id and gs.player_id = auth.uid()
        )
      )
  )
);

drop policy if exists "moves_insert_participants" on public.moves;
create policy "moves_insert_participants"
on public.moves
for insert
with check (
  auth.uid() is not null
  and player_id = auth.uid()
  and exists (
    select 1
    from public.games g
    where g.id = game_id
      and (g.red_player_id = auth.uid() or g.black_player_id = auth.uid())
  )
);

-- chat_messages
alter table public.chat_messages enable row level security;

drop policy if exists "chat_select_visible_game" on public.chat_messages;
create policy "chat_select_visible_game"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.games g
    where g.id = game_id
      and (
        g.is_public
        or g.red_player_id = auth.uid()
        or g.black_player_id = auth.uid()
        or exists (
          select 1
          from public.game_spectators gs
          where gs.game_id = g.id and gs.player_id = auth.uid()
        )
      )
  )
);

drop policy if exists "chat_insert_participant_or_spectator" on public.chat_messages;
create policy "chat_insert_participant_or_spectator"
on public.chat_messages
for insert
with check (
  auth.uid() is not null
  and player_id = auth.uid()
  and (
    exists (
      select 1
      from public.games g
      where g.id = game_id
        and (
          g.is_public
          or g.red_player_id = auth.uid()
          or g.black_player_id = auth.uid()
        )
    )
    or exists (
      select 1
      from public.game_spectators gs
      where gs.game_id = game_id and gs.player_id = auth.uid()
    )
  )
);

-- matchmaking_queue
alter table public.matchmaking_queue enable row level security;

drop policy if exists "mmq_select_self" on public.matchmaking_queue;
create policy "mmq_select_self"
on public.matchmaking_queue
for select
using (player_id = auth.uid());

drop policy if exists "mmq_insert_self" on public.matchmaking_queue;
create policy "mmq_insert_self"
on public.matchmaking_queue
for insert
with check (player_id = auth.uid());

drop policy if exists "mmq_update_self" on public.matchmaking_queue;
create policy "mmq_update_self"
on public.matchmaking_queue
for update
using (player_id = auth.uid())
with check (player_id = auth.uid());

drop policy if exists "mmq_delete_self" on public.matchmaking_queue;
create policy "mmq_delete_self"
on public.matchmaking_queue
for delete
using (player_id = auth.uid());

-- game_spectators
alter table public.game_spectators enable row level security;

drop policy if exists "spectators_select_visible_game" on public.game_spectators;
create policy "spectators_select_visible_game"
on public.game_spectators
for select
using (player_id = auth.uid());

drop policy if exists "spectators_insert_authenticated" on public.game_spectators;
create policy "spectators_insert_authenticated"
on public.game_spectators
for insert
with check (
  auth.uid() is not null
  and player_id = auth.uid()
);

drop policy if exists "spectators_delete_self" on public.game_spectators;
create policy "spectators_delete_self"
on public.game_spectators
for delete
using (player_id = auth.uid());

-- Allow authenticated users to execute join_game (RPC)
grant execute on function public.join_game(uuid, text) to authenticated;

commit;
