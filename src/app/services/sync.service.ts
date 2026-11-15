import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, debounceTime, filter, tap } from 'rxjs';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { BackupService } from './backup.service';
import { PreferencesService } from './preferences.service';
import { StorageService } from './storage.service';
import { EMPTY_SHARED, SharedData, addedProducts, mergeShared, normalize, sharedEquals } from './merge.util';

const OWNER_KEY = 'dispensa_sync_owner';
const PANTRY_KEY = 'dispensa_sync_pantry';
const BASE_KEY = 'dispensa_sync_base';
const DIRTY_KEY = 'dispensa_sync_dirty';
const PREFS_KEY = 'dispensa_preferences';

/** Chiavi locali che formano la dispensa condivisa. Le preferenze sono personali e vanno a parte. */
const SHARED_KEYS = new Set([
  'dispensa_products',
  'dispensa_purchase_history',
  'dispensa_custom_categories',
  'dispensa_shopping',
  'dispensa_barcode_cache',
]);

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface PantryInfo {
  id: string;
  inviteCode: string;
  role: 'owner' | 'member';
}

export interface PantryMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
  isMe: boolean;
}

/** Prodotti aggiunti da un altro membro (per la notifica locale su Android). */
export interface RemoteAdditions {
  by: string;
  names: string[];
}

interface SyncBase {
  pantryId: string;
  version: number;
  data: SharedData;
}

interface PantryRow {
  data: Partial<SharedData>;
  version: number;
  updated_by: string | null;
}

/**
 * Sincronizza la dispensa (anche condivisa tra più account) con Supabase.
 *
 * localStorage resta la fonte di lavoro: l'app funziona offline e i servizi esistenti non cambiano.
 * A ogni sincronizzazione si confrontano tre versioni: l'ultima sincronizzata da questo dispositivo
 * ("base"), quella locale e quella online, e si uniscono prodotto per prodotto. Il salvataggio
 * riesce solo se nel frattempo nessun altro ha salvato (campo `version`); altrimenti si riparte
 * con i dati aggiornati. Così due persone che modificano insieme non si cancellano a vicenda.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly status$ = new BehaviorSubject<SyncStatus>('idle');
  readonly pantry$ = new BehaviorSubject<PantryInfo | null>(null);
  readonly members$ = new BehaviorSubject<PantryMember[]>([]);
  readonly remoteAdditions$ = new Subject<RemoteAdditions>();

  private userId: string | null = null;
  private applying = false;
  private running: Promise<void> | null = null;
  private again = false;
  private subs: Subscription[] = [];
  private channel: RealtimeChannel | null = null;

  constructor(
    private auth: AuthService,
    private backup: BackupService,
    private preferences: PreferencesService,
    private storage: StorageService,
  ) {}

  get isShared(): boolean {
    return this.members$.value.length > 1;
  }

  async start(userId: string): Promise<void> {
    if (this.userId === userId) return;
    this.userId = userId;

    const owner = this.storage.get<string>(OWNER_KEY);
    if (owner && owner !== userId) {
      // Dati di un altro account rimasti sul dispositivo: non devono finire in questo account.
      this.applyShared(EMPTY_SHARED);
      [BASE_KEY, PANTRY_KEY, DIRTY_KEY].forEach(k => this.storage.remove(k));
    }
    this.storage.set(OWNER_KEY, userId);

    if (navigator.onLine) {
      try {
        await this.loadPantry();
        await this.pullSettings();
      } catch (e) {
        console.error('Caricamento dispensa non riuscito', e);
      }
    }
    await this.sync();

    this.subs.push(
      this.storage.changes$.pipe(
        filter(key => SHARED_KEYS.has(key) && !this.applying),
        tap(() => this.storage.set(DIRTY_KEY, new Date().toISOString())),
        debounceTime(1200),
      ).subscribe(() => this.sync()),
      this.storage.changes$.pipe(
        filter(key => key === PREFS_KEY && !this.applying),
        debounceTime(1500),
      ).subscribe(() => this.pushSettings()),
    );

    window.addEventListener('online', this.onWake);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.unsubscribeRealtime();
    this.userId = null;
    this.pantry$.next(null);
    this.members$.next([]);
    window.removeEventListener('online', this.onWake);
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  /** Sincronizza adesso (le chiamate ravvicinate vengono raggruppate). */
  sync(): Promise<void> {
    if (!this.userId) return Promise.resolve();
    if (this.running) { this.again = true; return this.running; }
    this.running = (async () => {
      do {
        this.again = false;
        await this.syncOnce();
      } while (this.again);
    })().finally(() => { this.running = null; });
    return this.running;
  }

  // ── Dispensa condivisa ──────────────────────────────────────────────────────

  async joinPantry(code: string): Promise<void> {
    const { data, error } = await this.auth.supabase.rpc('join_pantry', {
      p_code: code, p_display_name: this.auth.displayName,
    });
    if (error) {
      throw new Error(error.message.includes('invalid_invite_code')
        ? 'Codice invito non valido o scaduto'
        : 'Non è stato possibile entrare nella dispensa, riprova');
    }
    // I prodotti di esempio non vanno portati nella dispensa di qualcun altro.
    const local = this.collectShared();
    if (local.products.some(p => p.isDemo)) {
      this.applyShared({ ...local, products: local.products.filter(p => !p.isDemo) });
    }
    await this.switchPantry(data as string);
  }

  async leavePantry(): Promise<void> {
    const { data, error } = await this.auth.supabase.rpc('leave_pantry', { p_display_name: this.auth.displayName });
    if (error) throw new Error('Non è stato possibile uscire dalla dispensa, riprova');
    await this.switchPantry(data as string);
  }

  async regenerateInviteCode(): Promise<void> {
    const { data, error } = await this.auth.supabase.rpc('regenerate_invite_code');
    if (error) throw new Error('Solo chi ha creato la dispensa può cambiare il codice');
    const p = this.pantry$.value;
    if (p) this.pantry$.next({ ...p, inviteCode: data as string });
  }

  async removeMember(userId: string): Promise<void> {
    const { error } = await this.auth.supabase.rpc('remove_member', { p_user_id: userId });
    if (error) throw new Error('Non è stato possibile rimuovere il membro');
    await this.loadMembers();
  }

  async loadMembers(): Promise<void> {
    const p = this.pantry$.value;
    if (!p) return;
    const { data, error } = await this.auth.supabase
      .from('pantry_members')
      .select('user_id, display_name, role, joined_at')
      .eq('pantry_id', p.id)
      .order('joined_at');
    if (error || !data) return;
    this.members$.next(data.map(m => ({
      userId: m.user_id,
      displayName: m.display_name || 'Utente',
      role: m.role,
      isMe: m.user_id === this.userId,
    })));
  }

  /** Dopo essere entrati o usciti da una dispensa: i prodotti locali vengono uniti a quella nuova. */
  private async switchPantry(pantryId: string): Promise<void> {
    this.storage.remove(BASE_KEY);
    this.storage.set(PANTRY_KEY, pantryId);
    await this.loadPantry();
    await this.sync();
  }

  private async loadPantry(): Promise<void> {
    const { data, error } = await this.auth.supabase.rpc('my_pantry', { p_display_name: this.auth.displayName });
    if (error || !data?.[0]) throw error ?? new Error('Dispensa non disponibile');
    const row = data[0] as { pantry_id: string; invite_code: string; role: 'owner' | 'member' };

    if (this.storage.get<string>(PANTRY_KEY) !== row.pantry_id) {
      // Dispensa diversa da quella sincronizzata l'ultima volta: niente base, si uniscono i dati.
      this.storage.remove(BASE_KEY);
      this.storage.set(PANTRY_KEY, row.pantry_id);
    }
    this.pantry$.next({ id: row.pantry_id, inviteCode: row.invite_code, role: row.role });
    this.subscribeRealtime(row.pantry_id);
    await this.loadMembers();
  }

  // ── Sincronizzazione ────────────────────────────────────────────────────────

  private async syncOnce(): Promise<void> {
    if (!navigator.onLine) { this.status$.next('offline'); return; }
    this.status$.next('syncing');
    try {
      if (!this.pantry$.value) await this.loadPantry();

      for (let attempt = 0; attempt < 4; attempt++) {
        const pantryId = this.pantry$.value!.id;
        const { data: row, error } = await this.auth.supabase
          .from('pantries')
          .select('data, version, updated_by')
          .eq('id', pantryId)
          .maybeSingle<PantryRow>();
        if (error) { this.status$.next('error'); return; }
        if (!row) {
          // Non siamo più membri (es. rimossi dal proprietario): si torna alla propria dispensa.
          this.pantry$.next(null);
          await this.loadPantry();
          continue;
        }

        const remote = normalize(row.data);
        const storedBase = this.storage.get<SyncBase>(BASE_KEY);
        const base = storedBase?.pantryId === pantryId ? normalize(storedBase.data) : null;
        const local = this.collectShared();
        const merged = mergeShared(base, local, remote);

        // Prodotti aggiunti da altri dall'ultima sincronizzazione.
        if (base && storedBase!.version !== row.version && row.updated_by && row.updated_by !== this.userId) {
          const names = addedProducts(base, remote).map(p => p.name);
          if (names.length) this.remoteAdditions$.next({ by: this.memberName(row.updated_by), names });
        }

        let version = row.version;
        if (!sharedEquals(merged, remote)) {
          const { data: saved, error: saveError } = await this.auth.supabase
            .from('pantries')
            .update({ data: merged, version: row.version + 1 })
            .eq('id', pantryId)
            .eq('version', row.version)
            .select('version');
          if (saveError) { this.status$.next('error'); return; }
          if (!saved?.length) continue;          // qualcuno ha salvato nel frattempo: si riprova
          version = row.version + 1;
          this.notifyAdditions(addedProducts(remote, merged).map(p => p.name));
        }

        if (!sharedEquals(merged, local)) this.applyShared(merged);
        this.storage.set(BASE_KEY, { pantryId, version, data: merged } satisfies SyncBase);
        this.storage.remove(DIRTY_KEY);
        this.status$.next('synced');
        return;
      }
      this.status$.next('error');
    } catch (e) {
      console.error('Sincronizzazione non riuscita', e);
      this.status$.next(navigator.onLine ? 'error' : 'offline');
    }
  }

  /** Avvisa gli altri membri (notifica push) dei prodotti appena aggiunti da questo dispositivo. */
  private notifyAdditions(names: string[]): void {
    if (!names.length || !this.isShared) return;
    this.auth.supabase.functions
      .invoke('notify-additions', { body: { names: names.slice(0, 20) } })
      .catch(() => undefined);
  }

  private memberName(userId: string): string {
    return this.members$.value.find(m => m.userId === userId)?.displayName || 'Qualcuno';
  }

  private collectShared(): SharedData {
    const { preferences: _ignored, ...shared } = this.backup.collectPayload();
    return normalize(shared);
  }

  private applyShared(data: SharedData): void {
    this.applying = true;
    try {
      this.backup.applyPayload({ ...normalize(data), preferences: undefined as never });
    } finally {
      this.applying = false;
    }
  }

  // ── Preferenze personali ────────────────────────────────────────────────────

  private async pullSettings(): Promise<void> {
    const { data, error } = await this.auth.supabase
      .from('user_settings')
      .select('prefs')
      .eq('user_id', this.userId!)
      .maybeSingle<{ prefs: Record<string, unknown> }>();
    if (error) return;
    if (!data || !data.prefs || Object.keys(data.prefs).length === 0) {
      await this.pushSettings();
      return;
    }
    this.applying = true;
    try { this.preferences.update(data.prefs); }
    finally { this.applying = false; }
  }

  async pushSettings(): Promise<void> {
    if (!this.userId || !navigator.onLine) return;
    let timezone = 'Europe/Rome';
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone; } catch { /* default */ }
    await this.auth.supabase.from('user_settings').upsert({
      user_id: this.userId,
      prefs: this.preferences.get(),
      timezone,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Tempo reale ─────────────────────────────────────────────────────────────

  private subscribeRealtime(pantryId: string): void {
    if (this.channel?.topic === `realtime:pantry-${pantryId}`) return;
    this.unsubscribeRealtime();
    this.channel = this.auth.supabase
      .channel(`pantry-${pantryId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pantries', filter: `id=eq.${pantryId}` },
        payload => {
          const version = (payload.new as { version?: number })?.version;
          const base = this.storage.get<SyncBase>(BASE_KEY);
          if (version === undefined || version !== base?.version) this.sync();
        })
      .subscribe();
  }

  private unsubscribeRealtime(): void {
    if (this.channel) {
      this.auth.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  private onWake = () => this.sync();

  private onVisible = () => {
    if (document.visibilityState === 'visible') {
      this.sync();
      this.loadMembers();
    }
  };
}
