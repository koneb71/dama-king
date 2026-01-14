-- Auto-close idle active games after N minutes (default 10).
-- Implemented via:
-- - games.ended_reason (so we can skip stats/ELO for idle timeouts)
-- - close_idle_games() function
-- - (recommended) a Supabase Edge Function scheduled by cron

begin;

alter table public.games
  add column if not exists ended_reason text;

-- -----------------------------------------------------------------------------
-- Close idle games: marks active games finished with ended_reason='idle_timeout'
-- -----------------------------------------------------------------------------
create or replace function public.close_idle_games(p_idle_minutes int default 10)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  if p_idle_minutes is null or p_idle_minutes <= 0 then
    p_idle_minutes := 10;
  end if;

  update public.games g
  set
    status = 'finished',
    winner_id = null,
    ended_reason = 'idle_timeout',
    updated_at = now()
  where g.status = 'active'
    and g.updated_at < (now() - make_interval(mins => p_idle_minutes))
    and coalesce(g.ended_reason, '') = '';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Allow calling from server/cron. You can also call from a service-role job.
grant execute on function public.close_idle_games(int) to authenticated;

-- -----------------------------------------------------------------------------
-- Update stats trigger to ignore idle timeouts
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

  -- Ignore idle timeouts (don't count in stats/elo)
  if coalesce(new.ended_reason, '') = 'idle_timeout' then
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

