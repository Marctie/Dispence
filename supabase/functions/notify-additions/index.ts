// Avvisa gli altri membri della dispensa che sono stati aggiunti dei prodotti.
// Chiamata dall'app dopo un salvataggio riuscito: { names: string[] }.
import { DEFAULT_NOTIFICATION_PREFS } from '../_shared/planner.ts';
import { admin, cors, json, sendToUsers, userFromRequest } from '../_shared/push.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const me = await userFromRequest(req);
  if (!me) return json({ error: 'unauthorized' }, 401);

  let names: string[] = [];
  try {
    const body = await req.json();
    names = (Array.isArray(body?.names) ? body.names : [])
      .filter((n: unknown) => typeof n === 'string')
      .map((n: string) => n.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);
  } catch { /* corpo non valido */ }
  if (!names.length) return json({ sent: 0 });

  const { data: mine } = await admin.from('pantry_members')
    .select('pantry_id, display_name').eq('user_id', me).maybeSingle();
  if (!mine) return json({ sent: 0 });

  const { data: others } = await admin.from('pantry_members')
    .select('user_id').eq('pantry_id', mine.pantry_id).neq('user_id', me);
  const otherIds = (others ?? []).map(o => o.user_id);
  if (!otherIds.length) return json({ sent: 0 });

  const { data: settings } = await admin.from('user_settings').select('user_id, prefs').in('user_id', otherIds);
  const muted = new Set((settings ?? [])
    .filter(s => {
      const p = { ...DEFAULT_NOTIFICATION_PREFS, ...(s.prefs ?? {}) };
      return !p.notificationsEnabled || !p.notifyAdditions;
    })
    .map(s => s.user_id));
  const targets = otherIds.filter(id => !muted.has(id));

  const who = mine.display_name || 'Qualcuno';
  const list = names.length <= 4 ? names.join(', ') : `${names.slice(0, 4).join(', ')} e altri ${names.length - 4}`;
  const sent = await sendToUsers(targets, {
    title: `${who} ha aggiunto alla dispensa`,
    body: list,
    tag: 'additions',
  });
  return json({ sent });
});
