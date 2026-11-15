-- Dispensina Digitale — telemetria: coda durevole di eventi ed errori dell'app per il bot Telegram "Dispence-Track".
-- Da eseguire in Supabase: Dashboard → SQL Editor → New query → incolla → Run.
-- È ADDITIVO e rieseguibile: crea solo oggetti nuovi (tabella app_events e funzioni telemetry_*),
-- non tocca le tabelle esistenti (pantries, pantry_members, user_settings, push_subscriptions).
--
-- Flusso: app (web/Android) → INSERT in app_events (solo inserimento, mai lettura) → il bot, con la chiave
-- segreta del progetto, legge le righe con delivered_at nullo, le invia su Telegram e le marca come consegnate.
-- Se il bot è spento le righe restano in attesa qui: all'avvio il bot smaltisce tutto l'arretrato.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabella

create table if not exists public.app_events (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),             -- arrivo sul server
  client_at    timestamptz,                                    -- quando è successo sul dispositivo (la coda locale può ritardare l'invio)
  kind         text not null check (kind in ('event', 'error')),
  name         text not null check (name ~ '^[a-z0-9_]{1,60}$'),
  platform     text not null default 'web' check (platform in ('android', 'ios-app', 'ios-safari', 'web')),
  app_version  text not null default '' check (char_length(app_version) <= 20),
  user_id      uuid,                                           -- nessun vincolo verso auth.users: lo storico resta anche se l'account viene eliminato
  user_label   text check (char_length(user_label) <= 120),    -- email presa dal server (trigger), non dal client
  device_id    text check (char_length(device_id) <= 40),      -- identificativo casuale dell'installazione (non personale)
  detail       jsonb not null default '{}'::jsonb
               check (jsonb_typeof(detail) = 'object' and pg_column_size(detail) < 4000),
  delivered_at timestamptz,                                    -- inviato su Telegram dal bot
  resolved_at  timestamptz                                     -- errore segnato come risolto (/risolto nel bot)
);

create index if not exists app_events_pending_idx on public.app_events (id) where delivered_at is null;
create index if not exists app_events_created_idx on public.app_events (created_at);
create index if not exists app_events_device_idx  on public.app_events (device_id, created_at);
create index if not exists app_events_errors_idx  on public.app_events (created_at) where kind = 'error' and resolved_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: dati affidabili decisi dal server, limiti contro gli abusi

create or replace function public.telemetry_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  -- Questi campi li decide solo il server.
  new.created_at   := now();
  new.delivered_at := null;
  new.resolved_at  := null;

  -- Ora del dispositivo: accettata solo se plausibile (ultimi 30 giorni, non nel futuro).
  if new.client_at is null or new.client_at > now() + interval '5 minutes'
     or new.client_at < now() - interval '30 days' then
    new.client_at := now();
  end if;

  -- Nome utente: per gli utenti collegati si prende l'email vera da auth.users (il client non può falsificarla).
  if new.user_id is not null then
    select u.email into v_email from auth.users u where u.id = new.user_id;
  end if;
  if v_email is not null then
    new.user_label := left(v_email, 120);
  elsif new.user_label is not null then
    -- (anche: account appena eliminato, l'email non esiste più)
    -- Senza account (o sessione scaduta) l'app può solo suggerire un nome: viene marcato come non verificato.
    new.user_label := left(new.user_label, 60);
    new.detail := new.detail || '{"etichetta_non_verificata": true}'::jsonb;
  end if;

  -- Limiti di frequenza: le righe oltre soglia vengono scartate in silenzio (return null), senza errori per l'app.
  if new.device_id is not null and (
       select count(*) from public.app_events e
       where e.device_id = new.device_id and e.created_at > now() - interval '1 minute') >= 60 then
    return null;
  end if;
  if (select count(*) from public.app_events e where e.created_at > now() - interval '1 minute') >= 600 then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists app_events_before_insert on public.app_events;
create trigger app_events_before_insert before insert on public.app_events
  for each row execute function public.telemetry_before_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- Regole di accesso (RLS): i client possono SOLO inserire. Nessuna lettura, modifica o cancellazione,
-- nemmeno dei propri eventi. Il bot usa la chiave segreta (service_role), che ignora le RLS.

alter table public.app_events enable row level security;

drop policy if exists app_events_insert_auth on public.app_events;
drop policy if exists app_events_insert_anon on public.app_events;
create policy app_events_insert_auth on public.app_events
  for insert to authenticated with check (user_id is null or user_id = auth.uid());
create policy app_events_insert_anon on public.app_events
  for insert to anon with check (user_id is null);

-- Supabase concede per default tutti i privilegi su public ad anon/authenticated: si tolgono e si concede solo
-- l'inserimento delle colonne che il client può valorizzare.
revoke all on public.app_events from anon, authenticated;
grant insert (client_at, kind, name, platform, app_version, user_id, user_label, device_id, detail)
  on public.app_events to anon, authenticated;
revoke all on sequence public.app_events_id_seq from public, anon, authenticated;
grant usage on sequence public.app_events_id_seq to anon, authenticated;
grant all on public.app_events to service_role;
grant all on sequence public.app_events_id_seq to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Funzioni per il bot (solo service_role)

-- Elenco degli account registrati, per il comando /utenti del bot.
create or replace function public.telemetry_users()
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at
  from auth.users u
  order by u.last_sign_in_at desc nulls last;
$$;

-- Pulizia: eventi consegnati più vecchi di N giorni; gli errori solo se risolti (quelli aperti restano).
create or replace function public.telemetry_purge(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.app_events
  where delivered_at is not null
    and created_at < now() - make_interval(days => greatest(p_days, 7))
    and (kind = 'event' or resolved_at is not null);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.telemetry_users() from public, anon, authenticated;
revoke all on function public.telemetry_purge(integer) from public, anon, authenticated;
revoke all on function public.telemetry_before_insert() from public, anon, authenticated;
grant execute on function public.telemetry_users() to service_role;
grant execute on function public.telemetry_purge(integer) to service_role;
