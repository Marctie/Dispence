import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AddProductComponent } from '../add-product/add-product.component';
import { AiItem, AiJob, AiWorkerState } from '../models/ai-import.model';
import { LOCATION_LABELS, Product } from '../models/product.model';
import { AI_MAX_TEXT, AiImportService, AiPlanRow } from '../services/ai-import.service';
import { AuthService } from '../services/auth.service';
import { CategoryService } from '../services/category.service';

const LOC_EMOJI: Record<string, string> = { fridge: '❄️', freezer: '🧊', pantry: '🏠' };
const LOC_ORDER = ['fridge', 'freezer', 'pantry'];

@Component({
  selector: 'app-ai-import',
  templateUrl: 'ai-import.page.html',
  styleUrls: ['ai-import.page.scss'],
  standalone: false,
})
export class AiImportPage implements OnInit, OnDestroy {
  private ai = inject(AiImportService);
  private auth = inject(AuthService);
  private categories = inject(CategoryService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly maxText = AI_MAX_TEXT;
  readonly placeholder = 'Es.: 2 litri di latte, 6 uova, petto di pollo 500 g scade venerdì, '
    + '3 scatolette di tonno, 1 kg di pasta, gelato al cioccolato, insalata';

  text = '';
  sending = false;
  jobs: AiJob[] = [];
  worker: AiWorkerState = { online: false, ready: false, busy: false, lastSeen: null };
  available = true;
  offline = false;

  /** Elenco in revisione (riepilogo da confermare). */
  reviewing: AiJob | null = null;
  rows: AiPlanRow[] = [];
  showOriginal = false;
  applying = false;

  private subs: Subscription[] = [];

  get loggedIn(): boolean { return this.ai.enabled; }
  get authEnabled(): boolean { return this.auth.enabled; }

  ngOnInit(): void {
    this.subs.push(
      this.ai.jobs$.subscribe(j => {
        this.jobs = j;
        // se l'elenco in revisione sparisce (chiuso da un altro dispositivo) si torna all'elenco
        if (this.reviewing && !j.some(x => x.id === this.reviewing!.id)) this.closeReview();
        const want = this.route.snapshot.queryParamMap.get('elenco');
        if (want && !this.reviewing) {
          const job = j.find(x => x.id === want && x.status === 'done');
          if (job) { this.openReview(job); this.router.navigate([], { queryParams: {}, replaceUrl: true }); }
        }
      }),
      this.ai.worker$.subscribe(w => (this.worker = w)),
      this.ai.available$.subscribe(a => (this.available = a)),
      this.ai.offline$.subscribe(o => (this.offline = o)),
    );
  }

  ionViewWillEnter(): void { this.ai.startPolling(); }
  ionViewWillLeave(): void { this.ai.stopPolling(); }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── invio ──────────────────────────────────────────────────────────────

  async send(): Promise<void> {
    if (this.sending || this.text.trim().length < 2) return;
    this.sending = true;
    try {
      const res = await this.ai.submit(this.text);
      this.text = '';
      this.toast(res === 'outbox'
        ? 'Sei offline: l\'elenco parte appena torna la connessione'
        : this.worker.ready
          ? 'Inviato: l\'assistente lo sta leggendo, il riepilogo arriva qui'
          : 'Inviato e messo in coda: verrà letto appena l\'assistente sul PC è acceso');
    } catch (e) {
      this.toast(e instanceof Error ? e.message : 'Invio non riuscito');
    } finally {
      this.sending = false;
    }
  }

  async refresh(ev?: CustomEvent): Promise<void> {
    await this.ai.refresh();
    (ev?.target as HTMLIonRefresherElement | undefined)?.complete();
  }

  async remove(job: AiJob): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Elimina elenco',
      message: job.status === 'done' ? 'I prodotti non verranno inseriti. Vuoi eliminarlo?' : 'Vuoi eliminare questo elenco?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: () => { this.ai.remove(job).catch(e => this.toast(e.message)); if (this.reviewing?.id === job.id) this.closeReview(); },
        },
      ],
    });
    await alert.present();
  }

  async retry(job: AiJob): Promise<void> {
    try {
      await this.ai.retry(job);
      this.toast('Rimandato all\'assistente');
    } catch (e) {
      this.toast(e instanceof Error ? e.message : 'Non riuscito');
    }
  }

  // ── revisione ──────────────────────────────────────────────────────────

  openReview(job: AiJob): void {
    this.reviewing = job;
    this.rows = this.ai.plan(job.items);
    this.showOriginal = false;
  }

  closeReview(): void {
    this.reviewing = null;
    this.rows = [];
  }

  get included(): AiPlanRow[] { return this.rows.filter(r => r.include); }

  get groups(): { loc: string; label: string; rows: AiPlanRow[] }[] {
    return LOC_ORDER
      .map(loc => ({ loc, label: `${LOC_EMOJI[loc]} ${LOCATION_LABELS[loc]}`, rows: this.rows.filter(r => r.item.location === loc) }))
      .filter(g => g.rows.length > 0);
  }

  get locationCounts(): { label: string; n: number }[] {
    return LOC_ORDER
      .map(loc => ({ label: `${LOC_EMOJI[loc]} ${LOCATION_LABELS[loc]}`, n: this.included.filter(r => r.item.location === loc).length }))
      .filter(x => x.n > 0);
  }

  get estimatedCount(): number { return this.included.filter(r => r.item.expiryEstimated).length; }
  get noExpiryCount(): number { return this.included.filter(r => !r.item.expiryDate).length; }
  get mergeCount(): number { return this.included.filter(r => r.mergeWith).length; }
  get soonCount(): number { return this.included.filter(r => this.daysLeft(r.item) !== null && this.daysLeft(r.item)! <= 3).length; }

  catLabel(id: string): string {
    const c = this.categories.getById(id);
    return c ? `${c.emoji} ${c.name}` : '📦 Altro';
  }

  catEmoji(id: string): string {
    return this.categories.getById(id)?.emoji ?? '📦';
  }

  daysLeft(it: AiItem): number | null {
    if (!it.expiryDate) return null;
    const d = new Date(it.expiryDate + 'T00:00:00');
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - t.getTime()) / 86400000);
  }

  expiryLabel(it: AiItem): string {
    if (!it.expiryDate) return 'Senza scadenza';
    const [y, m, d] = it.expiryDate.split('-');
    const left = this.daysLeft(it);
    const rel = left === null ? '' : left < 0 ? ' · già scaduto' : left === 0 ? ' · oggi' : left === 1 ? ' · domani' : ` · tra ${left} giorni`;
    return `Scade ${d}/${m}/${y}${rel}`;
  }

  qty(q: number): string {
    return String(q).replace('.', ',');
  }

  toggleAll(on: boolean): void {
    this.rows.forEach(r => (r.include = on));
  }

  /** Modifica di un prodotto prima della conferma, con la stessa scheda di "Aggiungi prodotto". */
  async edit(row: AiPlanRow): Promise<void> {
    const it = row.item;
    const draft: Product = {
      id: 'ai-draft', name: it.name, category: it.category, location: it.location, quantity: it.quantity, unit: it.unit,
      expiryDate: it.expiryDate, notes: '', addedAt: new Date().toISOString(), lowStockThreshold: null, price: null,
    };
    const modal = await this.modalCtrl.create({
      component: AddProductComponent, componentProps: { product: draft }, breakpoints: [0, 1], initialBreakpoint: 1,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'save' || !data) return;
    const changedExpiry = (data.expiryDate || null) !== it.expiryDate;
    const item: AiItem = {
      ...it,
      name: data.name, category: data.category, location: data.location, quantity: Number(data.quantity) || 1, unit: data.unit,
      expiryDate: data.expiryDate ? String(data.expiryDate).slice(0, 10) : null,
      expiryEstimated: changedExpiry ? false : it.expiryEstimated,
    };
    const [fresh] = this.ai.plan([item]);
    Object.assign(row, { item, mergeWith: fresh.mergeWith, edited: true, include: true });
  }

  async confirm(): Promise<void> {
    if (!this.reviewing || this.applying) return;
    const rows = this.included;
    if (!rows.length) { this.toast('Seleziona almeno un prodotto'); return; }
    const where = this.locationCounts.map(c => `${c.n} in ${c.label}`).join(', ');
    const merge = this.mergeCount ? ` ${this.mergeCount} si sommano a prodotti già presenti.` : '';
    const skipped = this.rows.length - rows.length;
    const alert = await this.alertCtrl.create({
      header: `Inserire ${rows.length} prodott${rows.length === 1 ? 'o' : 'i'}?`,
      message: `Stai per inserire: ${where}.${merge}${skipped ? ` ${skipped} esclus${skipped === 1 ? 'o' : 'i'}.` : ''}`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Inserisci', handler: () => { this.apply(); } },
      ],
    });
    await alert.present();
  }

  private async apply(): Promise<void> {
    if (!this.reviewing) return;
    this.applying = true;
    try {
      const { added, merged } = await this.ai.apply(this.reviewing, this.rows);
      this.closeReview();
      this.toast(`Fatto: ${added} nuov${added === 1 ? 'o' : 'i'}${merged ? `, ${merged} sommat${merged === 1 ? 'o' : 'i'}` : ''} in dispensa`);
      this.router.navigateByUrl('/tabs/inventory');
    } catch (e) {
      this.toast(e instanceof Error ? `Non inserito: ${e.message}` : 'Inserimento non riuscito');
    } finally {
      this.applying = false;
    }
  }

  // ── stati ──────────────────────────────────────────────────────────────

  statusLabel(job: AiJob): string {
    switch (job.status) {
      case 'outbox': return '📴 In attesa di rete';
      case 'pending': return this.worker.ready ? '⏳ In coda' : '⏳ In coda (assistente spento)';
      case 'processing': return '🤖 L\'assistente sta leggendo…';
      case 'done': return `✅ Pronto: ${job.items.length} prodott${job.items.length === 1 ? 'o' : 'i'} da controllare`;
      default: return '⚠️ Non riuscito';
    }
  }

  preview(job: AiJob): string {
    const t = job.inputText.replace(/\s+/g, ' ').trim();
    return t.length > 110 ? t.slice(0, 110) + '…' : t;
  }

  when(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, position: 'bottom' });
    await t.present();
  }
}
