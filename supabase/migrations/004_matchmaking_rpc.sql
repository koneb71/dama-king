-- Rating-based random matchmaking:
-- - enqueue caller (auth.uid) with current rating
-- - pick opponent within rating window using row locks (FOR UPDATE SKIP LOCKED)
-- - create an active game with initial board state
--
-- This is implemented as SECURITY DEFINER so it can safely create a game row
-- without exposing arbitrary UPDATE/INSERT privileges to the client.

begin;

-- -----------------------------------------------------------------------------
-- Initial board generator (8x8 standard checkers placement)
-- Matches src/game/engine.ts createInitialBoard() shape:
-- Board = Square[][] where Square = null | { color: 'red'|'black', kind: 'man'|'king' }
-- -----------------------------------------------------------------------------
create or replace function public.dama_initial_board()
returns jsonb
language plpgsql
immutable
as $$
declare
  r int;
  c int;
  row jsonb;
  board jsonb := '[]'::jsonb;
  sq jsonb;
begin
  for r in 0..7 loop
    row := '[]'::jsonb;
    for c in 0..7 loop
      -- Dark squares are (row + col) odd.
      if ((r + c) % 2) = 1 then
        if r <= 2 then
          sq := jsonb_build_object('color', 'black', 'kind', 'man');
        elsif r >= 5 then
          sq := jsonb_build_object('color', 'red', 'kind', 'man');
        else
          sq := 'null'::jsonb;
        end if;
      else
        sq := 'null'::jsonb;
      end if;

      row := row || jsonb_build_array(sq);
    end loop;
    board := board || jsonb_build_array(row);
  end loop;

  return board;
end;
$$;

-- -----------------------------------------------------------------------------
-- Matchmake: returns a created game when paired, otherwise NULL.
-- -----------------------------------------------------------------------------
create or replace function public.matchmake(
  p_is_ranked boolean default false,
  p_rating_window int default 200
)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_my_rating int;
  v_opponent_id uuid;
  v_opponent_rating int;
  v_flip boolean;
  v_red uuid;
  v_black uuid;
  v_game public.games;
begin
  v_me := auth.uid();
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  -- Defensive bounds.
  if p_rating_window is null or p_rating_window < 0 then
    p_rating_window := 200;
  end if;

  select ps.rating into v_my_rating
  from public.player_stats ps
  where ps.player_id = v_me;

  if v_my_rating is null then
    v_my_rating := 1000;
  end if;

  -- Ensure caller is queued.
  insert into public.matchmaking_queue (player_id, rating, joined_at)
  values (v_me, v_my_rating, now())
  on conflict (player_id) do update
    set rating = excluded.rating;

  -- Lock my own row so two tabs can't match twice.
  perform 1
  from public.matchmaking_queue
  where player_id = v_me
  for update;

  -- Find and lock an opponent within rating window, prefer closest rating, then oldest.
  select q.player_id, q.rating
    into v_opponent_id, v_opponent_rating
  from public.matchmaking_queue q
  where q.player_id <> v_me
    and abs(q.rating - v_my_rating) <= p_rating_window
  order by abs(q.rating - v_my_rating) asc, q.joined_at asc, random()
  limit 1
  for update skip locked;

  if v_opponent_id is null then
    return null;
  end if;

  -- Remove both from the queue (idempotent).
  delete from public.matchmaking_queue where player_id in (v_me, v_opponent_id);

  -- Randomize colors.
  v_flip := (random() < 0.5);
  if v_flip then
    v_red := v_me;
    v_black := v_opponent_id;
  else
    v_red := v_opponent_id;
    v_black := v_me;
  end if;

  -- Create the game as active. Black moves first per engine.ts.
  insert into public.games (
    red_player_id,
    black_player_id,
    current_turn,
    board_state,
    status,
    winner_id,
    room_code,
    is_public,
    is_ranked
  )
  values (
    v_red,
    v_black,
    'black',
    public.dama_initial_board(),
    'active',
    null,
    null,
    false,
    coalesce(p_is_ranked, false)
  )
  returning * into v_game;

  return v_game;
end;
$$;

grant execute on function public.matchmake(boolean, int) to authenticated;

commit;

