-- Dispensina Digitale — schema per account, dispensa condivisa e notifiche push.
-- Da eseguire in Supabase: Dashboard → SQL Editor → New query → incolla → Run.
-- È rieseguibile: non cancella dati esistenti (tranne la vecchia tabella v1 "pantries" con user_id, se presente e vuota).

-- ─────────────────────────────────────────────────────────────────────────────
-- Migrazione dalla v1 (una riga per utente): la vecchia tabella viene rimossa solo se vuota.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'pantries' and column_name = 'user_id') then
    if exists (select 1 from public.pantries) then
      raise exception 'La tabella pantries v1 contiene dati: migrarli prima di applicare lo schema v2';
    end if;
    drop table public.pantries cascade;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabelle

-- Una dispensa (condivisibile). "data" ha lo stesso formato del backup, senza le preferenze personali.
create table if not exists public.pantries (
  id          uuid primary key default gen_random_uuid(),
  data        jsonb       not null default '{}'::jsonb,
  version     integer     not null default 0,          -- per salvataggi concorrenti (optimistic locking)
  invite_code text        not null unique,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint pantries_data_size check (pg_column_size(data) < 2000000)
);

-- Chi fa parte di quale dispensa (ogni account appartiene a una sola dispensa).
create table if not exists public.pantry_members (
  pantry_id    uuid not null references public.pantries (id) on delete cascade,
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (pantry_id, user_id)
);

-- Preferenze personali (notifiche, fuso orario): non condivise con gli altri membri.
create table if not exists public.user_settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  prefs           jsonb not null default '{}'::jsonb check (pg_column_size(prefs) < 20000),
  timezone        text  not null default 'Europe/Rome' check (char_length(timezone) <= 64),
  last_daily_push date,
  updated_at      timestamptz not null default now()
);

-- Iscrizioni alle notifiche push del browser (Web Push, es. iPhone con app nella schermata Home).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique check (char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Funzioni di supporto

-- Codice invito leggibile (niente 0/O/1/I), 8 caratteri casuali crittograficamente sicuri.
create or replace function public.gen_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

-- True se l'utente corrente è membro della dispensa indicata (security definer: evita ricorsione RLS).
create or replace function public.is_pantry_member(p_pantry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pantry_members
    where pantry_id = p_pantry_id and user_id = (select auth.uid())
  );
$$;

-- Ogni salvataggio registra chi e quando.
create or replace function public.pantries_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists pantries_touch on public.pantries;
create trigger pantries_touch before update on public.pantries
  for each row execute function public.pantries_touch();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security

alter table public.pantries           enable row level security;
alter table public.pantry_members     enable row level security;
alter table public.user_settings      enable row level security;
alter table public.push_subscriptions enable row level security;

-- Dispense: le vedono e modificano solo i membri. Creazione/cancellazione solo tramite le funzioni sotto.
drop policy if exists pantries_select_member on public.pantries;
drop policy if exists pantries_update_member on public.pantries;
create policy pantries_select_member on public.pantries
  for select to authenticated using (public.is_pantry_member(id));
create policy pantries_update_member on public.pantries
  for update to authenticated
  using (public.is_pantry_member(id)) with check (public.is_pantry_member(id));

-- Membri: visibili solo agli altri membri della stessa dispensa; ognuno può cambiare solo il proprio nome.
drop policy if exists members_select_same_pantry on public.pantry_members;
drop policy if exists members_update_self on public.pantry_members;
create policy members_select_same_pantry on public.pantry_members
  for select to authenticated using (public.is_pantry_member(pantry_id));
create policy members_update_self on public.pantry_members
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Preferenze e iscrizioni push: solo le proprie.
drop policy if exists settings_own on public.user_settings;
create policy settings_own on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Permessi a livello di colonna: i membri possono cambiare solo il contenuto della dispensa
-- (non il codice invito, l'id o chi l'ha modificata) e solo il proprio nome visualizzato.
revoke all on public.pantries, public.pantry_members, public.user_settings, public.push_subscriptions from anon;
revoke insert, update, delete on public.pantries from authenticated;
grant select on public.pantries to authenticated;
grant update (data, version) on public.pantries to authenticated;
revoke insert, update, delete on public.pantry_members from authenticated;
grant select on public.pantry_members to authenticated;
grant update (display_name) on public.pantry_members to authenticated;
grant select, insert, update, delete on public.user_settings, public.push_subscriptions to authenticated;
revoke update (last_daily_push) on public.user_settings from authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Funzioni chiamate dall'app

-- Restituisce la dispensa dell'utente, creandone una personale al primo accesso.
create or replace function public.my_pantry(p_display_name text default null)
returns table (pantry_id uuid, invite_code text, role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  pid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;

  select m.pantry_id into pid from public.pantry_members m where m.user_id = me;
  if pid is null then
    insert into public.pantries (invite_code) values (public.gen_invite_code()) returning id into pid;
    insert into public.pantry_members (pantry_id, user_id, display_name, role)
      values (pid, me, left(coalesce(p_display_name, ''), 60), 'owner');
  elsif p_display_name is not null then
    update public.pantry_members set display_name = left(p_display_name, 60)
      where user_id = me and display_name = '';
  end if;

  return query
    select p.id, p.invite_code, m.role
    from public.pantries p join public.pantry_members m on m.pantry_id = p.id
    where m.user_id = me;
end $$;

-- Entra nella dispensa di qualcun altro con il codice invito.
-- La dispensa personale precedente viene eliminata se non ha altri membri
-- (l'app unisce prima i prodotti locali nella dispensa condivisa, quindi non si perde nulla).
create or replace function public.join_pantry(p_code text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  old_pid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;

  select id into target from public.pantries
    where invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if target is null then raise exception 'invalid_invite_code'; end if;

  select pantry_id into old_pid from public.pantry_members where user_id = me;
  if old_pid = target then return target; end if;

  delete from public.pantry_members where user_id = me;
  if old_pid is not null and not exists (select 1 from public.pantry_members where pantry_id = old_pid) then
    delete from public.pantries where id = old_pid;
  end if;

  insert into public.pantry_members (pantry_id, user_id, display_name, role)
    values (target, me, left(coalesce(p_display_name, ''), 60), 'member');
  return target;
end $$;

-- Esce dalla dispensa condivisa e ne crea una nuova personale (l'app ci copia i prodotti che aveva).
create or replace function public.leave_pantry(p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  old_pid uuid;
  was_owner boolean;
  pid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;

  select pantry_id, role = 'owner' into old_pid, was_owner from public.pantry_members where user_id = me;
  delete from public.pantry_members where user_id = me;

  if old_pid is not null then
    if not exists (select 1 from public.pantry_members where pantry_id = old_pid) then
      delete from public.pantries where id = old_pid;
    elsif was_owner then
      -- passa la proprietà al membro più "anziano"
      update public.pantry_members set role = 'owner'
        where (pantry_id, user_id) = (
          select pantry_id, user_id from public.pantry_members
          where pantry_id = old_pid order by joined_at limit 1);
    end if;
  end if;

  insert into public.pantries (invite_code) values (public.gen_invite_code()) returning id into pid;
  insert into public.pantry_members (pantry_id, user_id, display_name, role)
    values (pid, me, left(coalesce(p_display_name, ''), 60), 'owner');
  return pid;
end $$;

-- Genera un nuovo codice invito (quello vecchio smette di funzionare). Solo il proprietario.
create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  pid uuid;
  code text := public.gen_invite_code();
begin
  select pantry_id into pid from public.pantry_members where user_id = me and role = 'owner';
  if pid is null then raise exception 'not_owner'; end if;
  update public.pantries set invite_code = code where id = pid;
  return code;
end $$;

-- Il proprietario può togliere un membro dalla dispensa (il membro si ritroverà una dispensa personale vuota).
create or replace function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  pid uuid;
begin
  select pantry_id into pid from public.pantry_members where user_id = me and role = 'owner';
  if pid is null then raise exception 'not_owner'; end if;
  if p_user_id = me then raise exception 'cannot_remove_self'; end if;
  delete from public.pantry_members where pantry_id = pid and user_id = p_user_id;
end $$;

-- "Elimina account": cancella l'utente; la sua dispensa viene eliminata se non resta nessun altro membro.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  old_pid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select pantry_id into old_pid from public.pantry_members where user_id = me;
  delete from public.pantry_members where user_id = me;
  if old_pid is not null and not exists (select 1 from public.pantry_members where pantry_id = old_pid) then
    delete from public.pantries where id = old_pid;
  end if;
  delete from auth.users where id = me;
end $$;

-- Solo gli utenti autenticati possono chiamare le funzioni dell'app.
revoke execute on function
  public.my_pantry(text), public.join_pantry(text, text), public.leave_pantry(text),
  public.regenerate_invite_code(), public.remove_member(uuid), public.delete_my_account(),
  public.is_pantry_member(uuid), public.gen_invite_code()
  from public, anon;
grant execute on function
  public.my_pantry(text), public.join_pantry(text, text), public.leave_pantry(text),
  public.regenerate_invite_code(), public.remove_member(uuid), public.delete_my_account(),
  public.is_pantry_member(uuid)
  to authenticated;

-- Aggiornamenti in tempo reale della dispensa per gli altri membri (rispettano le regole RLS).
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pantries') then
    alter publication supabase_realtime add table public.pantries;
  end if;
end $$;
