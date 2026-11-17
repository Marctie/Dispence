// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /** Versione dell'app inviata con la telemetria (unico punto da aggiornare a ogni rilascio). */
  appVersion: '1.2.1',
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
