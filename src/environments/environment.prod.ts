export const environment = {
  production: true,
  /** Versione dell'app inviata con la telemetria (unico punto da aggiornare a ogni rilascio). */
  appVersion: '1.4.1',
  /** Indirizzo pubblico della web app: i link nelle email (conferma, nuova password) portano qui. */
  webUrl: 'https://marctie.github.io/Dispence/',
  /**
   * Login, dispensa condivisa e notifiche push (web e Android).
   * Vuoti = nessun login, dati solo locali come prima. Vedi docs/SETUP_LOGIN_SUPABASE.md.
   * La publishable key è pubblica per definizione: la protezione dei dati è data dalle policy RLS.
   */
  /** Chiave pubblica VAPID per le notifiche push del browser (la privata è solo sul server). */
  vapidPublicKey: 'BOXvRu5GiBwwctenFC95ivke_-gr_wOXL1aExIOHv6T1FRIJ_zDHB0tGTjnas16bKeGUtzeIJlTRk5loNJ4EZ7Q',
  supabase: {
    url: 'https://yzufrpbmraqmacodcsza.supabase.co',
    publishableKey: 'sb_publishable_eoAUzJxyyIc3SsaZ_A5etA_0hV2tqVb',
  },
};
