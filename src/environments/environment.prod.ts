export const environment = {
  production: true,
  /**
   * Login e sincronizzazione (solo versione web, mai nell'app Android).
   * Vuoti = nessun login, dati solo locali come prima. Vedi docs/SETUP_LOGIN_SUPABASE.md.
   * La publishable key è pubblica per definizione: la protezione dei dati è data dalle policy RLS.
   */
  supabase: {
    url: '',
    publishableKey: '',
  },
};
