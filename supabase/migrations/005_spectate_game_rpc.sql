-- Secure RPC: spectate game (register as spectator for private visibility)
-- Allows authenticated users to add themselves to game_spectators, optionally
-- requiring the room code for private rooms.

begin;

create or replace function public.spectate_game(p_game_id uuid, p_room_code text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_room_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select g.is_public, g.room_code
    into v_is_public, v_room_code
  from public.games g
  where g.id = p_game_id;

  if not found then
    raise exception 'Game not found';
  end if;

  -- For private rooms with a code, require the code to be provided/match.
  if coalesce(v_is_public, false) = false and v_room_code is not null then
    if p_room_code is null or v_room_code <> p_room_code then
      raise exception 'Room code required';
    end if;
  end if;

  insert into public.game_spectators (game_id, player_id)
  values (p_game_id, auth.uid())
  on conflict (game_id, player_id) do nothing;
end;
$$;

grant execute on function public.spectate_game(uuid, text) to authenticated;

commit;

