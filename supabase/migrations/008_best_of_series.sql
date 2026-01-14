-- Best-of (1/3/5) series support for online games.
-- Implemented as a single game row that can advance rounds via RPC:
-- - On finish, we increment series scores (trigger, idempotent per round).
-- - Players can start the next round which resets board + clears moves.

begin;

-- -----------------------------------------------------------------------------
-- Schema: series fields on games
-- -----------------------------------------------------------------------------
alter table public.games
  add column if not exists best_of int not null default 1 check (best_of in (1, 3, 5)),
  add column if not exists round_number int not null default 1,
  add column if not exists series_red_wins int not null default 0,
  add column if not exists series_black_wins int not null default 0,
  add column if not exists series_draws int not null default 0,
  add column if not exists series_over boolean not null default false,
  add column if not exists last_scored_round int not null default 0;

create index if not exists idx_games_series_over on public.games (series_over) where best_of > 1;

-- -----------------------------------------------------------------------------
-- Trigger: when a game finishes, update series score once per round
-- -----------------------------------------------------------------------------
create or replace function public.apply_finished_game_to_series()
returns trigger
language plpgsql
as $$
declare
  v_needed int;
  v_round int;
  v_winner uuid;
  v_red uuid;
  v_black uuid;
  v_is_draw boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if old.status = 'finished' then
    return new;
  end if;
  if new.status <> 'finished' then
    return new;
  end if;

  -- Only series games.
  if coalesce(new.best_of, 1) <= 1 then
    return new;
  end if;

  -- Don't update if already over.
  if coalesce(new.series_over, false) then
    return new;
  end if;

  v_round := coalesce(new.round_number, 1);

  -- Idempotency: ensure we only score once per round.
  if coalesce(new.last_scored_round, 0) >= v_round then
    return new;
  end if;

  v_winner := new.winner_id;
  v_red := new.red_player_id;
  v_black := new.black_player_id;
  v_is_draw := (v_winner is null);

  -- Need both players for series scoring.
  if v_red is null or v_black is null then
    return new;
  end if;

  -- Best-of N: first to ceil(N/2)
  v_needed := ((coalesce(new.best_of, 1) + 1) / 2);

  if v_is_draw then
    update public.games
    set
      series_draws = series_draws + 1,
      last_scored_round = v_round
    where id = new.id;
  elsif v_winner = v_red then
    update public.games
    set
      series_red_wins = series_red_wins + 1,
      last_scored_round = v_round
    where id = new.id;
  elsif v_winner = v_black then
    update public.games
    set
      series_black_wins = series_black_wins + 1,
      last_scored_round = v_round
    where id = new.id;
  else
    -- Winner is not a participant; ignore.
    update public.games
    set last_scored_round = v_round
    where id = new.id;
  end if;

  -- Mark series as over if someone reached needed wins.
  update public.games
  set series_over = (
    series_red_wins >= v_needed or series_black_wins >= v_needed
  )
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_games_apply_finished_series on public.games;
create trigger trg_games_apply_finished_series
after update of status on public.games
for each row
execute function public.apply_finished_game_to_series();

-- -----------------------------------------------------------------------------
-- RPC: start next round (resets board, clears moves)
-- -----------------------------------------------------------------------------
create or replace function public.start_next_round(p_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_game public.games;
  v_needed int;
begin
  v_me := auth.uid();
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if v_game.red_player_id <> v_me and v_game.black_player_id <> v_me then
    raise exception 'Not a participant';
  end if;

  if v_game.status <> 'finished' then
    raise exception 'Game is not finished';
  end if;

  if coalesce(v_game.best_of, 1) <= 1 then
    raise exception 'Not a series game';
  end if;

  v_needed := ((coalesce(v_game.best_of, 1) + 1) / 2);
  if coalesce(v_game.series_red_wins, 0) >= v_needed or coalesce(v_game.series_black_wins, 0) >= v_needed then
    raise exception 'Series is over';
  end if;

  -- Ensure the last finished round was scored.
  if coalesce(v_game.last_scored_round, 0) < coalesce(v_game.round_number, 1) then
    raise exception 'Series score not updated yet';
  end if;

  -- Clear moves for a fresh round (security definer).
  delete from public.moves where game_id = p_game_id;

  update public.games
  set
    round_number = round_number + 1,
    board_state = public.dama_initial_board(),
    current_turn = 'black',
    status = 'active',
    winner_id = null,
    updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

grant execute on function public.start_next_round(uuid) to authenticated;

commit;

