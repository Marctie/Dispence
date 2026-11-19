-- Dispensina Digitale — "Inserimento con l'assistente": coda delle liste di prodotti da far leggere all'LLM sul PC.
-- Da eseguire in Supabase: Dashboard → SQL Editor → New query → incolla → Run.
-- È ADDITIVO e rieseguibile: crea solo oggetti nuovi (tabelle ai_import_jobs e ai_worker_status, funzioni ai_*),
-- non tocca le tabelle esistenti.
--
-- Flusso (nessuna porta aperta sul PC):
--   app (web/Android)  ──INSERT──▶  ai_import_jobs (status 'pending')  ◀──ai_import_claim()──  programma sul PC (chiave segreta)
--   l'app rilegge le proprie richieste       il programma chiama Ollama, scrive result e status 'done' (o rimette in coda)
--   e mostra il riepilogo da confermare      e aggiorna ai_worker_status (online/offline) ogni pochi secondi
-- Se il PC, Ollama o il programma sono spenti, le richieste restano 'pending' qui e vengono elaborate appena tornano.
-- I prodotti NON vengono scritti dal server: li inserisce l'app solo dopo la conferma dell'utente.
-- Ogni passaggio (ricevuto, pronto, errore, confermato con cosa è stato inserito, scartato) viene notificato su Telegram
-- dal programma sul PC: la colonna notified_state dice quale stato è già stato notificato (coda durevole anche per i messaggi).

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabelle

create table if not exists public.ai_import_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  input_text  text not null check (char_length(input_text) between 2 and 4000),
  -- data di oggi sul dispositivo e categorie disponibili (anche quelle personali): servono all'LLM
  context     jsonb not null default '{}'::jsonb
              check (jsonb_typeof(context) = 'object' and pg_column_size(context) < 8000),
  status      text not null default 'pending',
  attempts    integer not null default 0,
  result      jsonb check (result is null or pg_column_size(result) < 200000),
  error       text check (error is null or char_length(error) <= 500),
  model       text check (model is null or char_length(model) <= 80),
  started_at  timestamptz,
  finished_at timestamptz
);

-- Aggiunte rieseguibili: stati di chiusura decisi dall'utente, esito della conferma, notifiche Telegram.
alter table public.ai_import_jobs add column if not exists outcome jsonb
  check (outcome is null or pg_column_size(outcome) < 60000);
alter table public.ai_import_jobs add column if not exists notified_state text;
alter table public.ai_import_jobs drop constraint if exists ai_import_jobs_status_check;
alter table public.ai_import_jobs add constraint ai_import_jobs_status_check
  check (status in ('pending', 'processing', 'done', 'error', 'applied', 'discarded'));

create index if not exists ai_import_jobs_open_idx on public.ai_import_jobs (created_at) where status in ('pending', 'processing');
create index if not exists ai_import_jobs_user_idx on public.ai_import_jobs (user_id, created_at desc);

-- Una sola riga: il programma sul PC la aggiorna a ogni giro, l'app la legge per dire "assistente acceso/spento".
create table if not exists public.ai_worker_status (
  id         integer primary key default 1 check (id = 1),
  last_seen  timestamptz not null default now(),
  ollama_ok  boolean not null default false,
  busy       boolean not null default false,
  model      text check (model is null or char_length(model) <= 80)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: dati decisi dal server e limiti contro gli abusi

create or replace function public.ai_import_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Serve un account';
  end if;
  new.user_id     := auth.uid();
  new.created_at  := now();
  new.status      := 'pending';
  new.attempts    := 0;
  new.result      := null;
  new.error       := null;
  new.model       := null;
  new.started_at  := null;
  new.finished_at := null;
  new.outcome     := null;
  new.notified_state := null;
  if (select count(*) from public.ai_import_jobs j
      where j.user_id = new.user_id and j.status in ('pending', 'processing')) >= 10 then
    raise exception 'Hai già 10 elenchi in coda: aspetta che l''assistente li elabori';
  end if;
  if (select count(*) from public.ai_import_jobs j
      where j.user_id = new.user_id and j.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Troppi elenchi nell''ultima ora: riprova più tardi';
  end if;
  return new;
end $$;

drop trigger if exists ai_import_before_insert on public.ai_import_jobs;
create trigger ai_import_before_insert before insert on public.ai_import_jobs
  for each row execute function public.ai_import_before_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- Regole di accesso: ognuno vede e crea solo i propri elenchi; li chiude solo con ai_import_close() (così ogni
-- conferma o scarto arriva anche su Telegram). Nessuna modifica o cancellazione diretta dall'app.

alter table public.ai_import_jobs   enable row level security;
alter table public.ai_worker_status enable row level security;

drop policy if exists ai_jobs_select_own on public.ai_import_jobs;
drop policy if exists ai_jobs_insert_own on public.ai_import_jobs;
drop policy if exists ai_jobs_delete_own on public.ai_import_jobs;
create policy ai_jobs_select_own on public.ai_import_jobs for select to authenticated using (user_id = auth.uid());
create policy ai_jobs_insert_own on public.ai_import_jobs for insert to authenticated with check (user_id = auth.uid());

drop policy if exists ai_worker_select on public.ai_worker_status;
create policy ai_worker_select on public.ai_worker_status for select to authenticated using (true);

revoke all on public.ai_import_jobs, public.ai_worker_status from anon, authenticated;
grant select on public.ai_import_jobs to authenticated;
grant insert (input_text, context) on public.ai_import_jobs to authenticated;
grant select on public.ai_worker_status to authenticated;
grant all on public.ai_import_jobs, public.ai_worker_status to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Funzioni del programma sul PC (solo con la chiave segreta)

-- Prende la richiesta più vecchia in attesa (o rimasta "in elaborazione" da oltre 15 minuti: programma chiuso a metà)
-- e la segna come in elaborazione. Ne fa anche la pulizia: elenchi conclusi più vecchi di 30 giorni.
create or replace function public.ai_import_claim()
returns setof public.ai_import_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ai_import_jobs
   where finished_at < now() - interval '30 days' and notified_state is not distinct from status;
  return query
  update public.ai_import_jobs j
     set status = 'processing', attempts = j.attempts + 1, started_at = now()
   where j.id = (
     select x.id from public.ai_import_jobs x
      where x.status = 'pending'
         or (x.status = 'processing' and x.started_at < now() - interval '15 minutes')
      order by x.created_at
      limit 1
      for update skip locked)
  returning j.*;
end $$;

-- Numero di richieste in attesa (per i log del programma).
create or replace function public.ai_import_pending_count()
returns integer
language sql
security definer
set search_path = ''
as $$ select count(*)::integer from public.ai_import_jobs where status in ('pending', 'processing') $$;

-- Chiusura di un elenco da parte dell'utente: 'applied' (ha confermato, p_outcome = cosa è stato inserito)
-- oppure 'discarded' (l'ha eliminato o rimandato). Solo i propri elenchi, solo se non già chiusi.
create or replace function public.ai_import_close(p_id uuid, p_status text, p_outcome jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Serve un account'; end if;
  if p_status not in ('applied', 'discarded') then raise exception 'Stato non valido'; end if;
  if p_outcome is null or jsonb_typeof(p_outcome) <> 'object' or pg_column_size(p_outcome) >= 60000 then
    p_outcome := '{}'::jsonb;
  end if;
  update public.ai_import_jobs
     set status = p_status, outcome = p_outcome, finished_at = now()
   where id = p_id and user_id = auth.uid()
     and status in ('pending', 'processing', 'done', 'error')
     and (p_status = 'discarded' or status = 'done');
  if not found then raise exception 'Elenco non trovato o già chiuso'; end if;
end $$;

-- Elenchi con uno stato non ancora notificato su Telegram (il programma sul PC li manda e poi aggiorna notified_state).
create or replace function public.ai_import_to_notify()
returns table (id uuid, user_id uuid, email text, created_at timestamptz, input_text text, status text,
               attempts integer, result jsonb, error text, model text, outcome jsonb, notified_state text,
               started_at timestamptz, finished_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select j.id, j.user_id, u.email::text, j.created_at, j.input_text, j.status, j.attempts, j.result, j.error,
         j.model, j.outcome, j.notified_state, j.started_at, j.finished_at
    from public.ai_import_jobs j left join auth.users u on u.id = j.user_id
   where j.status is distinct from j.notified_state and j.status <> 'processing'
   order by j.created_at
   limit 20;
$$;

revoke all on function public.ai_import_close(uuid, text, jsonb) from public, anon;
grant execute on function public.ai_import_close(uuid, text, jsonb) to authenticated;
revoke all on function public.ai_import_to_notify() from public, anon, authenticated;
grant execute on function public.ai_import_to_notify() to service_role;
revoke all on function public.ai_import_claim() from public, anon, authenticated;
revoke all on function public.ai_import_pending_count() from public, anon, authenticated;
revoke all on function public.ai_import_before_insert() from public, anon, authenticated;
grant execute on function public.ai_import_claim() to service_role;
grant execute on function public.ai_import_pending_count() to service_role;
