-- Preserve moves across best-of rounds for history/replay.
-- - Add round_number to moves
-- - Do NOT delete moves on start_next_round

begin;

alter table public.moves
  add column if not exists round_number int not null default 1;

create index if not exists idx_moves_game_round_move on public.moves (game_id, round_number, move_number);

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

