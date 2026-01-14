-- Public site stats (for landing page live numbers)
-- Returns counts that are otherwise blocked by RLS (matchmaking_queue, spectators).

begin;

create or replace function public.site_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'live_games',
      (select count(*)::int from public.games g where g.status = 'active'),
    'open_public_games',
      (select count(*)::int
       from public.games g
       where g.status = 'waiting'
         and g.is_public = true
         and g.black_player_id is null
         and g.red_player_id is not null),
    'players_total',
      (select count(*)::int from public.players p where p.is_guest = false),
    -- "Online" is an estimate based on players currently in:
    -- active/waiting games, matchmaking queue, and spectator list.
    'players_online_estimate',
      (select count(*)::int
       from (
         select distinct pid
         from (
           select g.red_player_id as pid
           from public.games g
           where g.status in ('waiting','active') and g.red_player_id is not null
           union
           select g.black_player_id as pid
           from public.games g
           where g.status = 'active' and g.black_player_id is not null
           union
           select q.player_id as pid
           from public.matchmaking_queue q
           union
           select gs.player_id as pid
           from public.game_spectators gs
         ) u
         where u.pid is not null
       ) d)
  );
$$;

grant execute on function public.site_stats() to anon, authenticated;

commit;

