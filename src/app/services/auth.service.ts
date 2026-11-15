import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { AuthError, createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/** Chiave in sessionStorage dove main.ts salva il frammento #access_token=... prima che il router lo cancelli. */
export const AUTH_HASH_KEY = 'dispensa_auth_hash';

const LOCAL_DATA_PREFIX = 'dispensa_';
/** Chiavi locali da conservare anche dopo il logout (non sono dati personali della dispensa). */
const KEEP_ON_LOGOUT = new Set(['dispensa_theme']);

/** Account utente (Supabase Auth), su web e Android. Disattivato se la configurazione è vuota. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: SupabaseClient | null = null;

  readonly user$ = new BehaviorSubject<User | null>(null);
  /** True quando l'utente arriva dal link "reimposta password" e deve sceglierne una nuova. */
  readonly passwordRecovery$ = new BehaviorSubject<boolean>(false);
  /** Messaggio di errore arrivato dal link email (es. link scaduto). */
  linkError: string | null = null;

  get enabled(): boolean {
    return !!environment.supabase.url && !!environment.supabase.publishableKey;
  }

  get user(): User | null {
    return this.user$.value;
  }

  /** Nome mostrato agli altri membri della dispensa: la parte dell'email prima della @. */
  get displayName(): string {
    return (this.user?.email ?? '').split('@')[0].slice(0, 60);
  }

  get supabase(): SupabaseClient {
    if (!this.client) throw new Error('Login non configurato');
    return this.client;
  }

  async init(): Promise<User | null> {
    if (!this.enabled) return null;

    this.client = createClient(environment.supabase.url, environment.supabase.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Il frammento dell'URL lo gestiamo noi (vedi main.ts), per non entrare in conflitto con il router.
        detectSessionInUrl: false,
        storageKey: 'sb-dispensina-auth',
      },
    });

    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') this.passwordRecovery$.next(true);
      this.user$.next(session?.user ?? null);
    });

    await this.consumeEmailLink();

    const { data } = await this.client.auth.getSession();
    this.user$.next(data.session?.user ?? null);
    return this.user;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(this.translate(error));
  }

  /** @returns true se serve confermare l'email prima di poter accedere. */
  async signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: this.siteUrl() },
    });
    if (error) throw new Error(this.translate(error));
    // Supabase non segnala un'email già registrata (per non rivelare chi è iscritto): identities vuote.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('Esiste già un account con questa email. Prova ad accedere.');
    }
    return !data.session;
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: this.siteUrl(),
    });
    if (error) throw new Error(this.translate(error));
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw new Error(this.translate(error));
    this.passwordRecovery$.next(false);
  }

  /** Esce dall'account e cancella dal dispositivo tutti i dati della dispensa. */
  async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } finally {
      this.clearLocalData();
      location.reload();
    }
  }

  /** Elimina definitivamente account e dati online (funzione SQL delete_my_account). */
  async deleteAccount(): Promise<void> {
    const { error } = await this.supabase.rpc('delete_my_account');
    if (error) throw new Error('Eliminazione non riuscita, riprova più tardi');
    await this.signOut();
  }

  clearLocalData(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_DATA_PREFIX) && !KEEP_ON_LOGOUT.has(k)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  private siteUrl(): string {
    // Nell'app Android l'indirizzo interno è https://localhost: i link email devono aprire la web app.
    return Capacitor.isNativePlatform() ? environment.webUrl : new URL('./', document.baseURI).href;
  }

  /** Gestisce i link ricevuti via email (conferma registrazione / reimposta password). */
  private async consumeEmailLink(): Promise<void> {
    let hash: string | null = null;
    try {
      hash = sessionStorage.getItem(AUTH_HASH_KEY);
      sessionStorage.removeItem(AUTH_HASH_KEY);
    } catch { /* sessionStorage non disponibile */ }
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      this.linkError = params.get('error_code') === 'otp_expired'
        ? 'Il link è scaduto o è già stato usato. Richiedine uno nuovo.'
        : 'Link non valido: ' + errorDescription.replace(/\+/g, ' ');
      return;
    }

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;

    const { error } = await this.supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      this.linkError = 'Link non valido o scaduto. Richiedine uno nuovo.';
      return;
    }
    if (params.get('type') === 'recovery') this.passwordRecovery$.next(true);
  }

  private translate(error: AuthError): string {
    switch (error.code) {
      case 'invalid_credentials': return 'Email o password non corretti';
      case 'email_not_confirmed': return 'Devi prima confermare l\'email: controlla la posta (anche lo spam)';
      case 'user_already_exists':
      case 'email_exists': return 'Esiste già un account con questa email. Prova ad accedere.';
      case 'weak_password': return 'Password troppo debole: usa almeno 8 caratteri con lettere e numeri';
      case 'same_password': return 'La nuova password deve essere diversa da quella attuale';
      case 'email_address_invalid':
      case 'validation_failed': return 'Indirizzo email non valido';
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit': return 'Troppi tentativi: riprova tra qualche minuto';
      case 'signup_disabled': return 'Le nuove registrazioni sono disattivate';
    }
    if (!navigator.onLine) return 'Nessuna connessione a internet';
    return 'Si è verificato un errore, riprova';
  }
}
