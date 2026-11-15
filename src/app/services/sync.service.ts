import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, debounceTime, filter, tap } from 'rxjs';
import { BackupPayload } from '../models/backup.model';
import { AuthService } from './auth.service';
import { BackupService } from './backup.service';
import { StorageService } from './storage.service';

const TABLE = 'pantries';
const OWNER_KEY = 'dispensa_sync_owner';
const LAST_SYNC_KEY = 'dispensa_sync_at';
const DIRTY_KEY = 'dispensa_sync_dirty';

/** Chiavi locali che fanno parte della dispensa dell'utente e vanno sincronizzate. */
const SYNCED_KEYS = new Set([
  'dispensa_products',
  'dispensa_purchase_history',
  'dispensa_custom_categories',
  'dispensa_shopping',
  'dispensa_preferences',
  'dispensa_barcode_cache',
]);

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface PantryRow {
  data: BackupPayload;
  updated_at: string;
}

/**
 * Sincronizza la dispensa dell'utente con il suo spazio online (una riga per utente, protetta da RLS).
 * localStorage resta la fonte di lavoro, così l'app funziona anche offline. Le modifiche vengono
 * inviate dopo una breve attesa; all'apertura e al ritorno in primo piano si scaricano quelle fatte
 * da altri dispositivi. In caso di modifiche contemporanee vince la più recente.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly status$ = new BehaviorSubject<SyncStatus>('idle');

  private userId: string | null = null;
  private applying = false;
  private pushing = false;
  private pushAgain = false;
  private sub: Subscription | null = null;

  constructor(
    private auth: AuthService,
    private backup: BackupService,
    private storage: StorageService,
  ) {}

  async start(userId: string): Promise<void> {
    if (this.userId === userId) return;
    this.userId = userId;

    const owner = this.storage.get<string>(OWNER_KEY);
    const firstLoginOnDevice = !owner;
    if (owner && owner !== userId) {
      // Dati di un altro account rimasti sul dispositivo: non devono finire in questo account.
      this.apply(this.emptyPayload());
      this.storage.remove(LAST_SYNC_KEY);
      this.storage.remove(DIRTY_KEY);
    }
    this.storage.set(OWNER_KEY, userId);

    await this.pull(firstLoginOnDevice);

    this.sub = this.storage.changes$
      .pipe(
        filter(key => SYNCED_KEYS.has(key) && !this.applying),
        // segna subito la modifica, invia dopo 1,5 s di inattività
        tap(() => this.storage.set(DIRTY_KEY, new Date().toISOString())),
        debounceTime(1500),
      )
      .subscribe(() => this.push());

    window.addEventListener('online', this.onOnline);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this.userId = null;
    window.removeEventListener('online', this.onOnline);
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  /** Scarica la versione online; al primo accesso sul dispositivo unisce i dati locali già presenti. */
  async pull(mergeLocal = false): Promise<void> {
    if (!this.userId) return;
    if (!navigator.onLine) { this.status$.next('offline'); return; }
    this.status$.next('syncing');

    const { data: row, error } = await this.auth.supabase
      .from(TABLE)
      .select('data, updated_at')
      .eq('user_id', this.userId)
      .maybeSingle<PantryRow>();

    if (error) { this.status$.next('error'); return; }

    const local = this.backup.collectPayload();

    if (!row) {
      // Primo accesso in assoluto: i dati già presenti sul telefono diventano la dispensa dell'account.
      if (this.hasContent(local)) await this.push();
      else this.status$.next('synced');
      return;
    }

    if (mergeLocal && this.hasContent(local)) {
      // Dati sia locali (usati prima del login) sia online: si uniscono senza perdere nulla.
      this.apply(this.merge(row.data, local));
      await this.push();
      return;
    }

    const remoteAt = Date.parse(row.updated_at);
    const dirtyAt = this.storage.get<string>(DIRTY_KEY);
    if (dirtyAt && Date.parse(dirtyAt) >= remoteAt) {
      // Modifiche locali non ancora inviate e più recenti di quelle online.
      await this.push();
      return;
    }

    const lastSync = this.storage.get<string>(LAST_SYNC_KEY);
    if (!lastSync || Date.parse(lastSync) !== remoteAt) {
      this.apply(row.data);
    }
    this.storage.set(LAST_SYNC_KEY, new Date(remoteAt).toISOString());
    this.storage.remove(DIRTY_KEY);
    this.status$.next('synced');
  }

  async push(): Promise<void> {
    if (!this.userId) return;
    if (this.pushing) { this.pushAgain = true; return; }
    if (!navigator.onLine) { this.status$.next('offline'); return; }

    this.pushing = true;
    this.status$.next('syncing');
    try {
      const updatedAt = new Date().toISOString();
      const { error } = await this.auth.supabase
        .from(TABLE)
        .upsert({ user_id: this.userId, data: this.backup.collectPayload(), updated_at: updatedAt });
      if (error) { this.status$.next('error'); return; }

      this.storage.set(LAST_SYNC_KEY, updatedAt);
      if (!this.pushAgain) this.storage.remove(DIRTY_KEY);
      this.status$.next('synced');
    } catch {
      this.status$.next(navigator.onLine ? 'error' : 'offline');
    } finally {
      this.pushing = false;
      if (this.pushAgain) { this.pushAgain = false; this.push(); }
    }
  }

  private onOnline = () => {
    if (this.storage.get<string>(DIRTY_KEY)) this.push(); else this.pull();
  };

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.pull();
  };

  private apply(data: BackupPayload): void {
    this.applying = true;
    try { this.backup.applyPayload(data); }
    finally { this.applying = false; }
  }

  private hasContent(p: BackupPayload): boolean {
    return (p.products?.length ?? 0) > 0
      || (p.shoppingItems?.length ?? 0) > 0
      || (p.customCategories?.length ?? 0) > 0;
  }

  /** Unione per id: a parità di id prevale la versione online. */
  private merge(remote: BackupPayload, local: BackupPayload): BackupPayload {
    const byId = <T extends { id: string }>(a: T[] = [], b: T[] = []): T[] => {
      const map = new Map<string, T>();
      b.forEach(x => map.set(x.id, x));
      a.forEach(x => map.set(x.id, x));
      return [...map.values()];
    };
    return {
      products: byId(remote.products, local.products),
      shoppingItems: byId(remote.shoppingItems, local.shoppingItems),
      customCategories: byId(remote.customCategories, local.customCategories),
      preferences: remote.preferences ?? local.preferences,
      barcodeCache: { ...(local.barcodeCache ?? {}), ...(remote.barcodeCache ?? {}) },
      purchaseHistory: { ...(local.purchaseHistory ?? {}), ...(remote.purchaseHistory ?? {}) },
    };
  }

  private emptyPayload(): BackupPayload {
    return {
      products: [],
      shoppingItems: [],
      customCategories: [],
      preferences: this.backup.collectPayload().preferences,
      barcodeCache: {},
      purchaseHistory: {},
    };
  }
}
