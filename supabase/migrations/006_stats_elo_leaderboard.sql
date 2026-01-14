-- Player stats + ELO updates + leaderboard view
-- Updates player_stats exactly once when a game transitions to finished.

begin;

-- -----------------------------------------------------------------------------
-- ELO helpers
-- -----------------------------------------------------------------------------
create or replace function public.elo_expected(p_ra int, p_rb int)
returns double precision
language sql
immutable
as $$
  select 1.0 / (1.0 + power(10.0, ((p_rb - p_ra)::double precision) / 400.0));
$$;

-- -----------------------------------------------------------------------------
-- Trigger: apply finished game result to player_stats
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

  -- Ensure both stats rows exist (defensive).
  insert into public.player_stats (player_id) values (v_red)
  on conflict (player_id) do nothing;
  insert into public.player_stats (player_id) values (v_black)
  on conflict (player_id) do nothing;

  -- Lock stats rows + read ratings.
  select ps.rating into v_r_red
  from public.player_stats ps
  where ps.player_id = v_red
  for update;

  select ps.rating into v_r_black
  from public.player_stats ps
  where ps.player_id = v_black
  for update;

  v_r_red := coalesce(v_r_red, 1000);
  v_r_black := coalesce(v_r_black, 1000);

  -- Update W/L/D counters (always).
  update public.player_stats
  set
    games_played = games_played + 1,
    wins = wins + case when (not v_is_draw and v_winner = v_red) then 1 else 0 end,
    losses = losses + case when (not v_is_draw and v_winner = v_black) then 1 else 0 end,
    draws = draws + case when v_is_draw then 1 else 0 end
  where player_id = v_red;

  update public.player_stats
  set
    games_played = games_played + 1,
    wins = wins + case when (not v_is_draw and v_winner = v_black) then 1 else 0 end,
    losses = losses + case when (not v_is_draw and v_winner = v_red) then 1 else 0 end,
    draws = draws + case when v_is_draw then 1 else 0 end
  where player_id = v_black;

  -- Only ranked games affect ELO.
  if v_is_ranked then
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

drop trigger if exists trg_games_apply_finished_stats on public.games;
create trigger trg_games_apply_finished_stats
after update of status on public.games
for each row
execute function public.apply_finished_game_to_stats();

create index if not exists idx_player_stats_rating_desc on public.player_stats (rating desc);

-- -----------------------------------------------------------------------------
-- Leaderboard view
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
  on ps.player_id = p.id;

grant select on public.leaderboard to anon, authenticated;

commit;

