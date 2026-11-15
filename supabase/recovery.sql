-- Dispensina Digitale — recupero password con codice personale (funziona senza invio di email).
-- Rieseguibile. Da eseguire dopo schema.sql.
--
-- Ogni utente può generare un codice di recupero (mostrato una sola volta, salvato solo come hash bcrypt).
-- La funzione server recover-password verifica email + codice e imposta la nuova password;
-- i tentativi falliti sono limitati per email e il codice usato viene sostituito da uno nuovo.

create table if not exists public.recovery_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code_hash  text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recovery_attempts (
  id         bigserial primary key,
  email      text not null,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists recovery_attempts_email_idx on public.recovery_attempts (email, created_at);

-- Nessun accesso diretto dai client: solo tramite le funzioni qui sotto.
alter table public.recovery_codes enable row level security;
alter table public.recovery_attempts enable row level security;
revoke all on public.recovery_codes, public.recovery_attempts from anon, authenticated;

-- Codice leggibile: 16 caratteri senza 0/O/1/I, mostrato come XXXX-XXXX-XXXX-XXXX.
create or replace function public.gen_recovery_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(16);
  code text := '';
begin
  for i in 0..15 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

create or replace function public.normalize_recovery_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$ select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); $$;

create or replace function public.format_recovery_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$ select substr(p_code, 1, 4) || '-' || substr(p_code, 5, 4) || '-' || substr(p_code, 9, 4) || '-' || substr(p_code, 13, 4); $$;

-- (Ri)genera il codice dell'utente corrente; il precedente smette di funzionare.
create or replace function public.set_recovery_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  code text := public.gen_recovery_code();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  insert into public.recovery_codes (user_id, code_hash, created_at)
    values (me, extensions.crypt(code, extensions.gen_salt('bf', 8)), now())
    on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return public.format_recovery_code(code);
end $$;

-- Data di creazione del codice dell'utente corrente (null se non l'ha mai creato).
create or replace function public.recovery_code_created_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$ select created_at from public.recovery_codes where user_id = (select auth.uid()); $$;

-- Solo per la funzione server (service_role): verifica email + codice con limite di tentativi.
-- Restituisce l'id utente se corretto; solleva 'too_many_attempts' dopo 5 errori in un'ora per quell'email.
create or replace function public.verify_recovery_code(p_email text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
  uid uuid;
  stored text;
  ok boolean := false;
begin
  if (select count(*) from public.recovery_attempts
      where email = em and not success and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_attempts';
  end if;

  select u.id, r.code_hash into uid, stored
    from auth.users u join public.recovery_codes r on r.user_id = u.id
    where lower(u.email) = em;

  if stored is not null then
    ok := extensions.crypt(public.normalize_recovery_code(p_code), stored) = stored;
  end if;

  insert into public.recovery_attempts (email, success) values (em, ok);
  delete from public.recovery_attempts where created_at < now() - interval '30 days';
  return case when ok then uid else null end;
end $$;

-- Solo per la funzione server: sostituisce il codice usato con uno nuovo e lo restituisce.
create or replace function public.rotate_recovery_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare code text := public.gen_recovery_code();
begin
  update public.recovery_codes
    set code_hash = extensions.crypt(code, extensions.gen_salt('bf', 8)), created_at = now()
    where user_id = p_user_id;
  return public.format_recovery_code(code);
end $$;

revoke execute on function
  public.gen_recovery_code(), public.normalize_recovery_code(text), public.format_recovery_code(text),
  public.set_recovery_code(), public.recovery_code_created_at(),
  public.verify_recovery_code(text, text), public.rotate_recovery_code(uuid)
  from public, anon, authenticated;
grant execute on function public.set_recovery_code(), public.recovery_code_created_at() to authenticated;
grant execute on function public.verify_recovery_code(text, text), public.rotate_recovery_code(uuid) to service_role;
