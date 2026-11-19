import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AiItem, AiJob, AiJobStatus, AiWorkerState } from '../models/ai-import.model';
import { Product, UNIT_OPTIONS } from '../models/product.model';
import { AuthService } from './auth.service';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { StorageService } from './storage.service';
import { TelemetryService } from './telemetry.service';

/** Elenchi scritti senza rete: restano qui e partono appena torna (chiave "dispensa_": si cancella al logout). */
const OUTBOX_KEY = 'dispensa_ai_outbox';
/** Elenchi pronti già segnalati con l'avviso "è pronto". */
const NOTIFIED_KEY = 'dispensa_ai_notified';
export const AI_MAX_TEXT = 4000;
const LOCATIONS = ['pantry', 'fridge', 'freezer'] as const;
const OPEN: AiJobStatus[] = ['outbox', 'pending', 'processing'];

interface OutboxEntry { id: string; text: string; createdAt: string; }

/** Come finirà un prodotto in dispensa: nuovo, oppure sommato a uno uguale già presente. */
export interface AiPlanRow {
  item: AiItem;
  include: boolean;
  /** Prodotto già in dispensa (stesso nome, posto, unità e scadenza) a cui verrà sommata la quantità. */
  mergeWith: Product | null;
  /** Modificato a mano dall'utente prima della conferma. */
  edited?: boolean;
}

/**
 * Inserimento con l'assistente: l'utente scrive un elenco libero, che va in coda su Supabase; il programma sul PC
 * lo fa leggere all'LLM locale e scrive il risultato; l'app mostra il riepilogo e inserisce solo dopo la conferma.
 */
@Injectable({ providedIn: 'root' })
export class AiImportService {
  private auth = inject(AuthService);
  private storage = inject(StorageService);
  private products = inject(ProductService);
  private categories = inject(CategoryService);
  private telemetry = inject(TelemetryService);
  private zone = inject(NgZone);

  readonly jobs$ = new BehaviorSubject<AiJob[]>([]);
  readonly worker$ = new BehaviorSubject<AiWorkerState>({ online: false, ready: false, busy: false, lastSeen: null });
  /** False se sul progetto Supabase non è ancora stato eseguito supabase/ai-import.sql. */
  readonly available$ = new BehaviorSubject<boolean>(true);
  /** Ultimo errore di rete nel leggere la coda (null se tutto ok). */
  readonly offline$ = new BehaviorSubject<boolean>(false);

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private polling = 0;
  private remote: AiJob[] = [];
  private onlineListener = false;

  get enabled(): boolean {
    return this.auth.enabled && !!this.auth.user;
  }

  // ── invio ────────────────────────────────────────────────────────────────

  /** Mette in coda un elenco. Ritorna 'queued' (su Supabase) o 'outbox' (sul telefono, senza rete). */
  async submit(text: string): Promise<'queued' | 'outbox'> {
    const clean = text.trim().slice(0, AI_MAX_TEXT);
    if (clean.length < 2) throw new Error('Scrivi almeno un prodotto');
    if (!this.enabled) throw new Error('Serve un account: accedi da Impostazioni');
    this.listenOnline();
    const res = await this.insert(clean);
    if (res === 'network') {
      const box = this.outbox();
      box.push({ id: `local-${Date.now()}`, text: clean, createdAt: new Date().toISOString() });
      this.storage.set(OUTBOX_KEY, box.slice(-10));
      this.publish();
      this.telemetry.track('ai_elenco_in_attesa_rete');
      return 'outbox';
    }
    this.telemetry.track('ai_elenco_inviato');
    await this.refresh();
    return 'queued';
  }

  private async insert(text: string): Promise<'ok' | 'network'> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network';
    const context = {
      today: AiImportService.localDate(new Date()),
      categories: this.categories.getAll().map(c => ({ id: c.id, name: c.name })),
    };
    try {
      const { error } = await this.auth.supabase.from('ai_import_jobs').insert({ input_text: text, context });
      if (!error) return 'ok';
      if (AiImportService.isMissingTable(error)) {
        this.available$.next(false);
        throw new Error('L\'assistente non è ancora attivo sul server');
      }
      if (AiImportService.isNetwork(error)) return 'network';
      throw new Error(error.message || 'Invio non riuscito');
    } catch (e) {
      if (AiImportService.isNetwork(e)) return 'network';
      throw e;
    }
  }

  /** Invia gli elenchi rimasti sul telefono. */
  async flushOutbox(): Promise<void> {
    if (!this.enabled) return;
    const box = this.outbox();
    if (!box.length) return;
    const left: OutboxEntry[] = [];
    for (const entry of box) {
      try {
        if ((await this.insert(entry.text)) === 'network') left.push(entry);
        else this.telemetry.track('ai_elenco_inviato');
      } catch {
        left.push(entry); // limite raggiunto o server non pronto: si riprova più tardi
      }
    }
    this.storage.set(OUTBOX_KEY, left);
  }

  // ── lettura della coda ───────────────────────────────────────────────────

  async refresh(): Promise<void> {
    if (!this.enabled) { this.remote = []; this.publish(); return; }
    await this.flushOutbox();
    try {
      const [jobs, worker] = await Promise.all([
        this.auth.supabase.from('ai_import_jobs')
          .select('id,status,input_text,created_at,attempts,result,error,model')
          .in('status', ['pending', 'processing', 'done', 'error'])
          .order('created_at', { ascending: false }).limit(30),
        this.auth.supabase.from('ai_worker_status').select('last_seen,ollama_ok,busy').eq('id', 1).maybeSingle(),
      ]);
      if (jobs.error) {
        if (AiImportService.isMissingTable(jobs.error)) { this.available$.next(false); return; }
        throw jobs.error;
      }
      this.available$.next(true);
      this.offline$.next(false);
      this.remote = (jobs.data ?? []).map(r => AiImportService.toJob(r));
      const w = worker.data as { last_seen?: string; ollama_ok?: boolean; busy?: boolean } | null;
      const online = !!w?.last_seen && Date.now() - new Date(w.last_seen).getTime() < 60_000;
      this.worker$.next({ online, ready: online && !!w?.ollama_ok, busy: online && !!w?.busy, lastSeen: w?.last_seen ?? null });
    } catch {
      this.offline$.next(true);
    } finally {
      this.publish();
    }
  }

  /** Aggiornamento periodico mentre la pagina è aperta (più fitto se ci sono elenchi in lavorazione). */
  startPolling(): void {
    this.polling++;
    if (this.polling === 1) this.tick();
  }

  stopPolling(): void {
    this.polling = Math.max(0, this.polling - 1);
    if (!this.polling && this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
  }

  private async tick(): Promise<void> {
    if (!this.polling) return;
    await this.refresh();
    if (!this.polling) return;
    const busy = this.jobs$.value.some(j => OPEN.includes(j.status));
    this.zone.runOutsideAngular(() => {
      this.pollTimer = setTimeout(() => this.zone.run(() => this.tick()), busy ? 5000 : 30000);
    });
  }

  /** Elenchi pronti non ancora segnalati (per l'avviso all'apertura dell'app); li segna come segnalati. */
  takeNewlyReady(): AiJob[] {
    const seen = new Set(this.storage.get<string[]>(NOTIFIED_KEY) ?? []);
    const fresh = this.jobs$.value.filter(j => j.status === 'done' && !seen.has(j.id));
    if (fresh.length) {
      const ids = this.jobs$.value.filter(j => j.status === 'done').map(j => j.id);
      this.storage.set(NOTIFIED_KEY, ids.slice(0, 50));
    }
    return fresh;
  }

  getJob(id: string): AiJob | undefined {
    return this.jobs$.value.find(j => j.id === id);
  }

  /** Elimina un elenco (anche già elaborato): sul server resta chiuso come "scartato" e arriva la notifica. */
  async remove(job: AiJob, reason: 'deleted' | 'retry' = 'deleted'): Promise<void> {
    if (job.status === 'outbox') {
      this.storage.set(OUTBOX_KEY, this.outbox().filter(e => e.id !== job.id));
    } else {
      await this.close(job, 'discarded', { reason });
      this.telemetry.track('ai_elenco_scartato');
    }
    this.publish();
  }

  private async close(job: AiJob, status: 'applied' | 'discarded', outcome: Record<string, unknown>): Promise<void> {
    const { error } = await this.auth.supabase.rpc('ai_import_close', { p_id: job.id, p_status: status, p_outcome: outcome });
    if (error) throw new Error(AiImportService.isNetwork(error) ? 'Serve la connessione' : error.message);
    this.remote = this.remote.filter(j => j.id !== job.id);
  }

  /** Rimanda all'assistente un elenco andato in errore (stesso testo, nuova richiesta). */
  async retry(job: AiJob): Promise<'queued' | 'outbox'> {
    const res = await this.submit(job.inputText);
    if (job.status !== 'outbox') await this.remove(job, 'retry').catch(() => undefined);
    return res;
  }

  // ── riepilogo e inserimento ──────────────────────────────────────────────

  /** Piano di inserimento: per ogni prodotto, se è nuovo o si somma a uno già in dispensa. */
  plan(items: AiItem[]): AiPlanRow[] {
    const current = this.products.getAll().filter(p => !p.isDemo);
    return items.map(item => ({ item, include: true, mergeWith: AiImportService.findSame(current, item) }));
  }

  /**
   * Inserisce le righe confermate e chiude l'elenco sul server con l'esito (che arriva anche su Telegram).
   * La chiusura si fa prima dell'inserimento: senza rete non si inserisce nulla, così l'elenco non finisce due volte in dispensa.
   */
  async apply(job: AiJob, rows: AiPlanRow[]): Promise<{ added: number; merged: number }> {
    const current = () => this.products.getAll().filter(p => !p.isDemo);
    const chosen = rows.filter(r => r.include)
      .map(r => ({ row: r, it: AiImportService.sanitizeItem(r.item) }))
      .filter((x): x is { row: AiPlanRow; it: AiItem } => !!x.it);
    // Ricontrollo al momento della conferma: la dispensa condivisa può essere cambiata nel frattempo.
    const inserted = chosen.map(({ it }) => ({ ...it, merged: !!AiImportService.findSame(current(), it) }));
    await this.close(job, 'applied', {
      inserted: inserted.slice(0, 100),
      skipped: rows.filter(r => !r.include).length,
      excluded: rows.filter(r => !r.include).map(r => r.item.name).slice(0, 40),
      edited: chosen.filter(x => x.row.edited).length,
    });
    let added = 0;
    let merged = 0;
    for (const { it } of chosen) {
      const same = AiImportService.findSame(current(), it);
      if (same) {
        this.products.update(same.id, { quantity: Math.round((same.quantity + it.quantity) * 1000) / 1000 });
        merged++;
      } else {
        this.products.add({
          name: it.name, category: it.category, location: it.location, quantity: it.quantity, unit: it.unit,
          expiryDate: it.expiryDate, notes: '', lowStockThreshold: null, price: null, barcode: null,
        });
        added++;
      }
    }
    this.telemetry.track('ai_elenco_confermato', { prodotti: added + merged });
    this.publish();
    return { added, merged };
  }

  // ── utilità ──────────────────────────────────────────────────────────────

  private outbox(): OutboxEntry[] {
    return this.storage.get<OutboxEntry[]>(OUTBOX_KEY) ?? [];
  }

  private publish(): void {
    const local: AiJob[] = this.outbox().map(e => ({
      id: e.id, status: 'outbox', inputText: e.text, createdAt: e.createdAt, attempts: 0,
      items: [], notUnderstood: [], error: null, model: null, seconds: null,
    }));
    this.jobs$.next([...local, ...this.remote].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  private listenOnline(): void {
    if (this.onlineListener || typeof window === 'undefined') return;
    this.onlineListener = true;
    window.addEventListener('online', () => this.refresh());
  }

  /** Avvia l'invio automatico degli elenchi rimasti sul telefono quando torna la rete. */
  init(): void {
    this.listenOnline();
  }

  static findSame(products: Product[], it: AiItem): Product | null {
    const key = it.name.trim().toLowerCase();
    return products.find(p => p.name.trim().toLowerCase() === key && p.location === it.location
      && p.unit === it.unit && (p.expiryDate ?? null) === (it.expiryDate ?? null)) ?? null;
  }

  /** Controlla un prodotto arrivato dal server (mai fidarsi del tutto): null se inutilizzabile. */
  static sanitizeItem(raw: unknown, categoryIds?: string[]): AiItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const name = String(r['name'] ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) return null;
    const q = Number(r['quantity']);
    const unit = UNIT_OPTIONS.includes(String(r['unit'])) ? String(r['unit']) : 'pz';
    const cat = String(r['category'] ?? '');
    const category = /^[a-z0-9-]{1,60}$/.test(cat) && (!categoryIds || categoryIds.includes(cat)) ? cat : 'altro';
    const loc = String(r['location']);
    const location = (LOCATIONS as readonly string[]).includes(loc) ? loc as AiItem['location'] : 'pantry';
    const exp = typeof r['expiryDate'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r['expiryDate'])
      && !isNaN(new Date(r['expiryDate']).getTime()) ? r['expiryDate'] : null;
    return {
      name,
      quantity: Number.isFinite(q) && q > 0 ? Math.round(Math.min(q, 10000) * 1000) / 1000 : 1,
      unit, category, location,
      expiryDate: exp,
      expiryEstimated: !!exp && r['expiryEstimated'] === true,
      expiryText: String(r['expiryText'] ?? '').slice(0, 60),
    };
  }

  static toJob(r: Record<string, any>): AiJob {
    const result = r['result'] && typeof r['result'] === 'object' ? r['result'] : {};
    const items = Array.isArray(result.items)
      ? result.items.slice(0, 100).map((x: unknown) => AiImportService.sanitizeItem(x)).filter((x: AiItem | null): x is AiItem => !!x)
      : [];
    const status = (['pending', 'processing', 'done', 'error'] as AiJobStatus[]).includes(r['status']) ? r['status'] : 'pending';
    return {
      id: String(r['id']),
      status,
      inputText: String(r['input_text'] ?? ''),
      createdAt: String(r['created_at'] ?? new Date().toISOString()),
      attempts: Number(r['attempts']) || 0,
      items,
      notUnderstood: Array.isArray(result.notUnderstood) ? result.notUnderstood.slice(0, 20).map((s: unknown) => String(s).slice(0, 120)) : [],
      error: r['error'] ? String(r['error']) : null,
      model: r['model'] ? String(r['model']) : null,
      seconds: typeof result.seconds === 'number' ? result.seconds : null,
    };
  }

  static localDate(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private static isMissingTable(e: unknown): boolean {
    const code = (e as { code?: string })?.code;
    return code === '42P01' || code === 'PGRST205' || code === 'PGRST202';
  }

  private static isNetwork(e: unknown): boolean {
    const msg = String((e as { message?: string })?.message ?? e ?? '');
    return /failed to fetch|networkerror|load failed|network request failed|fetch failed|aborted/i.test(msg);
  }
}
