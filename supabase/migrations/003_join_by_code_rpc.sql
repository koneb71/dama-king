-- Join a private game using a room code (works with RLS).
-- This is required because private rooms are not selectable under current RLS
-- unless you are already a participant or spectator.

begin;

create or replace function public.join_game_by_code(p_room_code text)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
  v_game public.games;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Find an open waiting room with this code (case-insensitive).
  select g.id
    into v_game_id
  from public.games g
  where g.status = 'waiting'
    and g.black_player_id is null
    and g.red_player_id is not null
    and g.room_code is not null
    and upper(g.room_code) = upper(p_room_code)
  order by g.created_at desc
  limit 1;

  if v_game_id is null then
    raise exception 'Game not found';
  end if;

  -- Delegate to existing secure join_game RPC.
  select * into v_game
  from public.join_game(v_game_id, p_room_code);

  return v_game;
end;
$$;

grant execute on function public.join_game_by_code(text) to authenticated;

commit;

