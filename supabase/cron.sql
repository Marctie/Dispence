-- Avvisi giornalieri push: chiama la funzione daily-reminders ogni 15 minuti.
-- Sostituire __CRON_SECRET__ con il valore di CRON_SECRET (keystore-privato/supabase-push-secrets.json)
-- prima di eseguirlo. Il segreto viene salvato cifrato nel Vault di Supabase, non nel codice.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Segreto condiviso con la funzione (aggiornato se esiste già).
do $$
declare sid uuid;
begin
  select id into sid from vault.secrets where name = 'daily_reminders_cron_secret';
  if sid is null then
    perform vault.create_secret('__CRON_SECRET__', 'daily_reminders_cron_secret');
  else
    perform vault.update_secret(sid, '__CRON_SECRET__');
  end if;
end $$;

-- (Ri)pianifica il job.
select cron.unschedule(jobid) from cron.job where jobname = 'daily-reminders';
select cron.schedule(
  'daily-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://yzufrpbmraqmacodcsza.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
