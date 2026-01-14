-- Add players.email to mirror auth.users email for convenience
-- (Useful for UI/leaderboards; auth.users remains the source of truth.)

begin;

alter table public.players
add column if not exists email text;

-- Backfill existing rows
update public.players p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

-- Ensure uniqueness for non-null emails (case-insensitive)
create unique index if not exists players_email_unique
on public.players (lower(email))
where email is not null;

-- Update the new-user bootstrap function to populate email
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
      insert into public.players (id, username, avatar_url, is_guest, email)
      values (
        new.id,
        v_username,
        nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), ''),
        coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false),
        new.email
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

-- Keep players.email synced if auth.users email changes
create or replace function public.handle_auth_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.players
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.handle_auth_user_email_update();

commit;

