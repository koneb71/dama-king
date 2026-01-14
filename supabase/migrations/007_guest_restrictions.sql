-- Guest restrictions:
-- 1. Guests cannot play ranked matches via matchmaking
-- 2. Guests are excluded from the leaderboard
-- 3. Guests don't get stats recorded for ranked games

begin;

-- -----------------------------------------------------------------------------
-- Update matchmake: Block guests from ranked games
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
  v_is_guest boolean;
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

  -- Check if caller is a guest
  select p.is_guest into v_is_guest
  from public.players p
  where p.id = v_me;

  -- Guests cannot play ranked matches
  if coalesce(v_is_guest, false) and coalesce(p_is_ranked, false) then
    raise exception 'Guests cannot play ranked matches. Please sign in to play ranked.';
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

-- -----------------------------------------------------------------------------
-- Update leaderboard view: Exclude guests
-- -----------------------------------------------------------------------------
drop view if exists public.leaderboard;
create view public.leaderboard as
select
  row_number() over (
    order by ps.rating desc, ps.wins desc, ps.games_played desc, p.username asc
  ) as rank,
  p.id as player_id,
  p.username,
  p.avatar_url,
  p.is_guest,
  ps.rating,
  ps.games_played,
  ps.wins,
  ps.losses,
  ps.draws,
  case
    when ps.games_played > 0 then round((ps.wins::numeric / ps.games_played::numeric) * 100.0, 1)::double precision
    else 0::double precision
  end as win_rate_pct
from public.players p
join public.player_stats ps
  on ps.player_id = p.id
where p.is_guest = false;

grant select on public.leaderboard to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Update stats trigger: Don't update stats for guests in any games
-- Guests can still play lobby games but their stats won't be tracked
-- -----------------------------------------------------------------------------
create or replace function public.apply_finished_game_to_stats()
returns trigger
language plpgsql
as $$
declare
  v_red uuid;
  v_black uuid;
  v_winner uuid;
  v_is_ranked boolean;
  v_is_draw boolean;
  v_red_is_guest boolean;
  v_black_is_guest boolean;

  v_k int := 32;
  v_r_red int;
  v_r_black int;
  v_exp_red double precision;
  v_exp_black double precision;
  v_score_red double precision;
  v_score_black double precision;
  v_new_r_red int;
  v_new_r_black int;
begin
  -- Only run on the first transition into finished.
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if old.status = 'finished' then
    return new;
  end if;
  if new.status <> 'finished' then
    return new;
  end if;

  v_red := new.red_player_id;
  v_black := new.black_player_id;
  v_winner := new.winner_id;
  v_is_ranked := coalesce(new.is_ranked, false);
  v_is_draw := (v_winner is null);

  -- If the game never had two players, don't count it.
  if v_red is null or v_black is null then
    return new;
  end if;

  -- Check if either player is a guest
  select p.is_guest into v_red_is_guest
  from public.players p
  where p.id = v_red;

  select p.is_guest into v_black_is_guest
  from public.players p
  where p.id = v_black;

  v_red_is_guest := coalesce(v_red_is_guest, false);
  v_black_is_guest := coalesce(v_black_is_guest, false);

  -- Skip stats entirely if both players are guests
  if v_red_is_guest and v_black_is_guest then
    return new;
  end if;

  -- Ensure stats rows exist for non-guest players only
  if not v_red_is_guest then
    insert into public.player_stats (player_id) values (v_red)
    on conflict (player_id) do nothing;
  end if;
  
  if not v_black_is_guest then
    insert into public.player_stats (player_id) values (v_black)
    on conflict (player_id) do nothing;
  end if;

  -- Lock stats rows + read ratings for non-guest players.
  if not v_red_is_guest then
    select ps.rating into v_r_red
    from public.player_stats ps
    where ps.player_id = v_red
    for update;
  end if;

  if not v_black_is_guest then
    select ps.rating into v_r_black
    from public.player_stats ps
    where ps.player_id = v_black
    for update;
  end if;

  v_r_red := coalesce(v_r_red, 1000);
  v_r_black := coalesce(v_r_black, 1000);

  -- Update W/L/D counters for non-guest players only
  if not v_red_is_guest then
    update public.player_stats
    set
      games_played = games_played + 1,
      wins = wins + case when (not v_is_draw and v_winner = v_red) then 1 else 0 end,
      losses = losses + case when (not v_is_draw and v_winner = v_black) then 1 else 0 end,
      draws = draws + case when v_is_draw then 1 else 0 end
    where player_id = v_red;
  end if;

  if not v_black_is_guest then
    update public.player_stats
    set
      games_played = games_played + 1,
      wins = wins + case when (not v_is_draw and v_winner = v_black) then 1 else 0 end,
      losses = losses + case when (not v_is_draw and v_winner = v_red) then 1 else 0 end,
      draws = draws + case when v_is_draw then 1 else 0 end
    where player_id = v_black;
  end if;

  -- Only ranked games affect ELO, and only for non-guest players
  -- Skip ELO updates entirely if any player is a guest
  if v_is_ranked and not v_red_is_guest and not v_black_is_guest then
    v_exp_red := public.elo_expected(v_r_red, v_r_black);
    v_exp_black := 1.0 - v_exp_red;

    if v_is_draw then
      v_score_red := 0.5;
      v_score_black := 0.5;
    elsif v_winner = v_red then
      v_score_red := 1.0;
      v_score_black := 0.0;
    else
      v_score_red := 0.0;
      v_score_black := 1.0;
    end if;

    v_new_r_red := round(v_r_red + (v_k * (v_score_red - v_exp_red)))::int;
    v_new_r_black := round(v_r_black + (v_k * (v_score_black - v_exp_black)))::int;

    -- Clamp at 0 to avoid negative ratings.
    if v_new_r_red < 0 then v_new_r_red := 0; end if;
    if v_new_r_black < 0 then v_new_r_black := 0; end if;

    update public.player_stats
    set rating = v_new_r_red
    where player_id = v_red;

    update public.player_stats
    set rating = v_new_r_black
    where player_id = v_black;
  end if;

  return new;
end;
$$;

commit;
