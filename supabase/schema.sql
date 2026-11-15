-- Dispensina Digitale — schema per login e sincronizzazione (versione web)
-- Da eseguire una sola volta in Supabase: Dashboard → SQL Editor → New query → incolla → Run.

-- Una riga per utente con l'intera dispensa (stesso formato del backup JSON dell'app).
create table if not exists public.pantries (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: ogni utente può leggere e scrivere SOLO la propria riga.
-- Senza un login valido (o con l'account di un altro) il database non restituisce nulla.
alter table public.pantries enable row level security;

drop policy if exists "pantries_select_own" on public.pantries;
drop policy if exists "pantries_insert_own" on public.pantries;
drop policy if exists "pantries_update_own" on public.pantries;
drop policy if exists "pantries_delete_own" on public.pantries;

create policy "pantries_select_own" on public.pantries
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "pantries_insert_own" on public.pantries
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "pantries_update_own" on public.pantries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "pantries_delete_own" on public.pantries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Gli utenti non autenticati non hanno alcun accesso alla tabella.
revoke all on public.pantries from anon;

-- Limite di sicurezza sulla dimensione della dispensa (circa 2 MB), contro abusi dello spazio gratuito.
alter table public.pantries drop constraint if exists pantries_data_size;
alter table public.pantries add constraint pantries_data_size check (pg_column_size(data) < 2000000);

-- "Elimina account" dall'app: cancella l'utente che la chiama (la dispensa viene eliminata a cascata).
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
