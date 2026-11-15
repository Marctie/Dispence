// Notifica di prova inviata ai dispositivi dell'utente che la richiede (Impostazioni → "Invia una notifica di prova").
import { cors, json, sendToUsers, userFromRequest } from '../_shared/push.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const me = await userFromRequest(req);
  if (!me) return json({ error: 'unauthorized' }, 401);

  const sent = await sendToUsers([me], {
    title: 'Dispensina Digitale',
    body: 'Le notifiche funzionano 👍',
    tag: 'test',
  });
  return json({ sent });
});
