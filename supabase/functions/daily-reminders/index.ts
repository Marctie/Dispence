// Avvisi giornalieri (scadenze, scorte basse) per chi ha attivato le notifiche push.
// Chiamata ogni 15 minuti da pg_cron (vedi supabase/cron.sql) con l'intestazione x-cron-secret.
// Ogni utente riceve gli avvisi una volta al giorno, all'orario scelto nel proprio fuso orario.
import { DEFAULT_NOTIFICATION_PREFS, notificationsForDay, parseTime } from '../_shared/planner.ts';
import { admin, json, sendToUsers } from '../_shared/push.ts';

const MAX_PER_USER = 6;

/** Data (AAAA-MM-GG) e minuti dalla mezzanotte nel fuso orario indicato. */
function localNow(timeZone: string): { day: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
  } catch {
    return localNow('Europe/Rome');
  }
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

Deno.serve(async req => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'unauthorized' }, 401);

  const { data: subs } = await admin.from('push_subscriptions').select('user_id');
  const userIds = [...new Set((subs ?? []).map(s => s.user_id))];
  if (!userIds.length) return json({ users: 0, sent: 0 });

  const { data: settings } = await admin.from('user_settings')
    .select('user_id, prefs, timezone, last_daily_push').in('user_id', userIds);
  const byUser = new Map((settings ?? []).map(s => [s.user_id, s]));

  let sent = 0, processed = 0;
  for (const userId of userIds) {
    const s = byUser.get(userId);
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(s?.prefs ?? {}) };
    if (!prefs.notificationsEnabled) continue;

    const { day, minutes } = localNow(s?.timezone ?? 'Europe/Rome');
    const { hour, minute } = parseTime(prefs.notifyTime);
    if (s?.last_daily_push === day || minutes < hour * 60 + minute) continue;

    const { data: member } = await admin.from('pantry_members').select('pantry_id').eq('user_id', userId).maybeSingle();
    const { data: pantry } = member
      ? await admin.from('pantries').select('data').eq('id', member.pantry_id).maybeSingle()
      : { data: null };
    const products = (pantry?.data?.products ?? []) as Parameters<typeof notificationsForDay>[0];

    const notifications = notificationsForDay(products, prefs, day, true).slice(0, MAX_PER_USER);
    for (const n of notifications) {
      sent += await sendToUsers([userId], { title: n.title, body: n.body, tag: `daily-${day}-${n.id}` });
    }

    await admin.from('user_settings').upsert({ user_id: userId, last_daily_push: day }, { onConflict: 'user_id' });
    processed++;
  }
  return json({ users: processed, sent });
});
