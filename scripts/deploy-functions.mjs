// Pubblica le funzioni server (notifiche push) su Supabase tramite la Management API.
//
// Uso:  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/deploy-functions.mjs
//
// Prima del deploy copia src/app/notifications/planner.ts in supabase/functions/_shared/planner.ts,
// così app e server usano esattamente la stessa logica per decidere quali avvisi inviare.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = 'yzufrpbmraqmacodcsza';
const FUNCTIONS = ['notify-additions', 'push-test', 'daily-reminders', 'recover-password'];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Imposta SUPABASE_ACCESS_TOKEN (token personale Supabase, sbp_...)');
  process.exit(1);
}

const fnDir = join(ROOT, 'supabase', 'functions');
const planner = readFileSync(join(ROOT, 'src', 'app', 'notifications', 'planner.ts'), 'utf8');
writeFileSync(join(fnDir, '_shared', 'planner.ts'),
  '// GENERATO da scripts/deploy-functions.mjs a partire da src/app/notifications/planner.ts: non modificare qui.\n'
  + planner);

const sharedFiles = readdirSync(join(fnDir, '_shared')).filter(f => f.endsWith('.ts'));

for (const name of FUNCTIONS) {
  const form = new FormData();
  form.append('metadata', JSON.stringify({
    name,
    entrypoint_path: `${name}/index.ts`,
    verify_jwt: false,           // l'autenticazione è verificata dentro la funzione
  }));
  const add = rel => {
    const abs = join(fnDir, rel);
    if (statSync(abs).isFile()) form.append('file', new Blob([readFileSync(abs)]), rel.replace(/\\/g, '/'));
  };
  add(`${name}/index.ts`);
  sharedFiles.forEach(f => add(`_shared/${f}`));

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${name}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  const text = await res.text();
  console.log(`${res.ok ? 'OK  ' : 'ERRORE'} ${name} (${res.status}) ${res.ok ? '' : text.slice(0, 500)}`);
  if (!res.ok) process.exitCode = 1;
}
